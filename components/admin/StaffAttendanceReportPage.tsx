import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { getFilteredAttendanceReport } from '../../services/attendanceService';
import { getAllUsers } from '../../services/authService';
import { AttendanceRecord, User, Role } from '../../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// NEW: Add a type for the processed report data
interface ProcessedStaffRecord extends AttendanceRecord {
  keterangan: string;
  denda: number;
}

interface SummaryDetails {
    lateCount: number;
    missedCheckoutCount: number;
    alpaCount: number;
    totalLateFine: number;
    missedCheckoutFine: number;
    totalAlpaFine: number;
    totalFine: number;
}


interface SummaryData {
    [userName: string]: SummaryDetails;
}

const StaffAttendanceReportPage: React.FC = () => {
  // Filter state
  const [staffMembers, setStaffMembers] = useState<User[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Data state
  const [reportData, setReportData] = useState<ProcessedStaffRecord[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch staff data for filters
  useEffect(() => {
    const fetchFilterData = async () => {
      const allUsers = await getAllUsers();
      setStaffMembers(allUsers.filter(u => u.role === Role.AdministrativeStaff));
    };
    fetchFilterData();
  }, []);
  
  const processStaffReport = (records: AttendanceRecord[]): { processedRecords: ProcessedStaffRecord[], summary: SummaryData } => {
    const lateFine = 2000;
    const missedCheckoutFine = 20000;
    const alpaFine = 20000; // FIX: Alpa fine is now 20,000 as requested
    const userStats: { [userName: string]: { lateCount: number; missedCheckoutCount: number; alpaCount: number } } = {};

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const processedRecords = records.map(record => {
        if (!userStats[record.userName]) {
            userStats[record.userName] = { lateCount: 0, missedCheckoutCount: 0, alpaCount: 0 };
        }
        
        if (['Sakit', 'Izin', 'Tugas Luar'].includes(record.status)) {
            return { ...record, keterangan: record.status, denda: 0 };
        }
        
        if (record.status === 'Alpa') {
            userStats[record.userName].alpaCount += 1;
            // The daily fine for alpa is now determined by the summary logic
            return { ...record, keterangan: 'Alpa (Tidak Ada Kehadiran)', denda: 0 }; 
        }

        const recordDate = record.timestamp;
        const day = recordDate.getDay();
        let keterangan = '-';
        let denda = 0;
        let isLate = false;

        // Rules only apply from Monday to Friday
        if (day >= 1 && day <= 5) {
            // Check for lateness
            if (record.status === 'Datang' || record.status === 'Pulang') {
                const checkInHour = recordDate.getHours();
                const checkInMinute = recordDate.getMinutes();
                if (checkInHour > 7 || (checkInHour === 7 && checkInMinute > 15)) {
                    isLate = true;
                    userStats[record.userName].lateCount += 1;
                }
            }

            // Check if it should count as a missed checkout for fine calculation
            if (!record.checkOutTimestamp) {
                const isPastDay = recordDate < startOfToday;
                const deadlineHour = 15;
                const deadlineMinute = 20;

                const isToday = recordDate.getFullYear() === now.getFullYear() &&
                                recordDate.getMonth() === now.getMonth() &&
                                recordDate.getDate() === now.getDate();
                
                const isPastDeadlineToday = isToday && (now.getHours() > deadlineHour || (now.getHours() === deadlineHour && now.getMinutes() > deadlineMinute));

                if (isPastDay || isPastDeadlineToday) {
                    userStats[record.userName].missedCheckoutCount += 1;
                }
            }
        }

        // Set display text and daily fine based on lateness
        if (isLate) {
            keterangan = 'Telat';
            denda = lateFine;
        }

        // Set display text for checkout status
        if (!record.checkOutTimestamp) {
            const isPastDay = recordDate < startOfToday;
            const deadlineHour = 15;
            const deadlineMinute = 20;

            const isToday = recordDate.getFullYear() === now.getFullYear() &&
                            recordDate.getMonth() === now.getMonth() &&
                            recordDate.getDate() === now.getDate();
            
            const isPastDeadlineToday = isToday && (now.getHours() > deadlineHour || (now.getHours() === deadlineHour && now.getMinutes() > deadlineMinute));

            let checkoutStatusText = '';
            // Only show checkout status for weekdays
            if (day >= 1 && day <= 5) {
                if (isPastDay || isPastDeadlineToday) {
                    checkoutStatusText = 'Tidak Absen Pulang';
                } else if (isToday) {
                    checkoutStatusText = 'Belum Absen Pulang';
                }
            }
            
            if (checkoutStatusText) {
                keterangan = keterangan === '-' ? checkoutStatusText : `${keterangan}; ${checkoutStatusText}`;
            }
        }
      
        return { ...record, keterangan, denda };
    });

    const summary: SummaryData = {};
    for (const userName in userStats) {
      const stats = userStats[userName];
      const totalLateFine = stats.lateCount * lateFine;
      // NEW LOGIC: Fine is only applied after the 3rd offense (on the 4th)
      const finalMissedCheckoutFine = stats.missedCheckoutCount > 3 ? missedCheckoutFine : 0;
      const finalAlpaFine = stats.alpaCount > 3 ? alpaFine : 0;
      const totalFine = totalLateFine + finalMissedCheckoutFine + finalAlpaFine;


      if (stats.lateCount > 0 || stats.missedCheckoutCount > 0 || stats.alpaCount > 0) {
        summary[userName] = {
            lateCount: stats.lateCount,
            missedCheckoutCount: stats.missedCheckoutCount,
            alpaCount: stats.alpaCount,
            totalLateFine,
            missedCheckoutFine: finalMissedCheckoutFine,
            totalAlpaFine: finalAlpaFine,
            totalFine,
        };
      }
    }
    
    return { processedRecords, summary };
  };

  const handleFetchReport = useCallback(async () => {
    if (!startDate || !endDate) {
      alert('Silakan pilih Tanggal Mulai dan Tanggal Selesai.');
      return;
    }
    
    setIsLoading(true);
    setHasSearched(true);
    setReportData([]);
    setSummaryData({});
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    try {
        const allRecordsInRange = await getFilteredAttendanceReport({
            startDate: start,
            endDate: end,
        });

        const relevantStaff = selectedStaff 
            ? staffMembers.filter(s => s.id === selectedStaff)
            : staffMembers;
        
        const staffIds = new Set(relevantStaff.map(s => s.id));
        const staffRecordsInRange = allRecordsInRange.filter(r => staffIds.has(r.teacherId));

        const recordsLookup = new Set<string>();
        staffRecordsInRange.forEach(record => {
            recordsLookup.add(`${record.teacherId}-${record.date}`);
        });

        const comprehensiveRecords: AttendanceRecord[] = [...staffRecordsInRange];

        const loopDate = new Date(start);
        while (loopDate <= end) {
            const dayOfWeek = loopDate.getDay();
            if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
                const dateString = `${loopDate.getFullYear()}-${String(loopDate.getMonth() + 1).padStart(2, '0')}-${String(loopDate.getDate()).padStart(2, '0')}`;
                
                for (const staff of relevantStaff) {
                    const lookupKey = `${staff.id}-${dateString}`;
                    if (!recordsLookup.has(lookupKey)) {
                        comprehensiveRecords.push({
                            id: `alpa-${lookupKey}`,
                            teacherId: staff.id,
                            userName: staff.name,
                            timestamp: loopDate,
                            date: dateString,
                            status: 'Alpa',
                            reason: 'Tidak ada catatan kehadiran',
                        });
                    }
                }
            }
            loopDate.setDate(loopDate.getDate() + 1);
        }

        const { processedRecords, summary } = processStaffReport(comprehensiveRecords);
        
        processedRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.userName.localeCompare(b.userName));

        setReportData(processedRecords);
        setSummaryData(summary);

    } catch (err) {
        console.error("Failed to generate staff report:", err);
    } finally {
        setIsLoading(false);
    }
  }, [startDate, endDate, selectedStaff, staffMembers]);

  useEffect(() => {
      if (startDate && endDate) {
          handleFetchReport();
      }
  }, [startDate, endDate, selectedStaff, handleFetchReport]);

  const handleExportPDF = () => {
    if (reportData.length === 0) return;
    const doc = new jsPDF();
    doc.text("Laporan Absensi Tendik", 14, 16);
    (doc as any).autoTable({
        head: [['Nama', 'Jabatan', 'Waktu Datang', 'Waktu Pulang', 'Keterangan', 'Denda (Rp)']],
        body: reportData.map(r => [
            r.userName,
            Role.AdministrativeStaff,
            r.status === 'Alpa' ? '-' : r.timestamp.toLocaleString('id-ID'),
            r.checkOutTimestamp ? new Date(r.checkOutTimestamp).toLocaleString('id-ID') : '-',
            r.keterangan,
            r.denda.toLocaleString('id-ID')
        ]),
        startY: 20,
    });
    if (Object.keys(summaryData).length > 0) {
        (doc as any).autoTable({
            head: [['Ringkasan Denda (Periode Laporan)']],
            body: Object.entries(summaryData).map(([name, data]: [string, SummaryDetails]) => {
                let summaryText = `${name}:\n`;
                summaryText += ` - Keterlambatan: ${data.lateCount} kali (Rp ${data.totalLateFine.toLocaleString('id-ID')})\n`;
                summaryText += ` - Tdk Absen Pulang: ${data.missedCheckoutCount} kali (Denda: Rp ${data.missedCheckoutFine.toLocaleString('id-ID')}${data.missedCheckoutCount < 4 ? ' - berlaku setelah 4 kali' : ''})\n`;
                summaryText += ` - Alpa: ${data.alpaCount} kali (Denda: Rp ${data.totalAlpaFine.toLocaleString('id-ID')}${data.alpaCount < 4 ? ' - berlaku setelah 4 kali' : ''})\n`;
                summaryText += ` - Total Denda: Rp ${data.totalFine.toLocaleString('id-ID')}`;
                return [summaryText];
            }),
            theme: 'striped',
        });
    }
    doc.save('laporan-absensi-tendik.pdf');
  };

  const handleExportExcel = () => {
    if (reportData.length === 0) return;
    const reportSheet = reportData.map(r => ({
        'Nama': r.userName,
        'Jabatan': Role.AdministrativeStaff,
        'Waktu Datang': r.status === 'Alpa' ? '-' : r.timestamp.toLocaleString('id-ID'),
        'Waktu Pulang': r.checkOutTimestamp ? new Date(r.checkOutTimestamp).toLocaleString('id-ID') : '-',
        'Keterangan': r.keterangan,
        'Denda Harian (Rp)': r.denda
    }));
    const worksheet = XLSX.utils.json_to_sheet(reportSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Absensi Tendik");

    if (Object.keys(summaryData).length > 0) {
        const summarySheetData = [
            ['Ringkasan Denda (Periode Laporan)'],
            ['Nama Tendik', 'Total Terlambat', 'Denda Terlambat', 'Total Tdk Absen Pulang', 'Denda Tdk Absen Pulang', 'Total Alpa', 'Denda Alpa', 'Total Denda Keseluruhan'],
             ...Object.entries(summaryData).map(([name, data]: [string, SummaryDetails]) => [
                name,
                data.lateCount,
                data.totalLateFine,
                data.missedCheckoutCount,
                data.missedCheckoutFine,
                data.alpaCount,
                data.totalAlpaFine,
                data.totalFine
            ])
        ];
        const summarySheet = XLSX.utils.aoa_to_sheet(summarySheetData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, "Ringkasan Denda");
    }

    XLSX.writeFile(workbook, 'laporan-absensi-tendik.xlsx');
  };

  const ReportTable = () => (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg mt-6 overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-slate-800">
          <tr className="hidden md:table-row">
            <th className="p-4 text-sm font-semibold text-gray-200">Nama</th>
            <th className="p-4 text-sm font-semibold text-gray-200">Waktu Datang</th>
            <th className="p-4 text-sm font-semibold text-gray-200">Waktu Pulang</th>
            <th className="p-4 text-sm font-semibold text-gray-200">Keterangan</th>
            <th className="p-4 text-sm font-semibold text-gray-200">Denda (Rp)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {reportData.map((record) => (
            <tr key={record.id} className="block p-4 space-y-3 md:table-row md:p-0 md:space-y-0 hover:bg-slate-800/50 transition-colors">
              <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap font-medium"><span className="text-sm font-semibold text-slate-400 md:hidden">Nama</span><span>{record.userName}</span></td>
              <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap text-gray-400"><span className="text-sm font-semibold text-slate-400 md:hidden">Waktu Datang</span><span>{record.status === 'Alpa' ? '-' : record.timestamp.toLocaleString('id-ID')}</span></td>
              <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap text-gray-400"><span className="text-sm font-semibold text-slate-400 md:hidden">Waktu Pulang</span><span>{record.checkOutTimestamp ? new Date(record.checkOutTimestamp).toLocaleString('id-ID') : '-'}</span></td>
              <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap text-yellow-400 text-xs"><span className="text-sm font-semibold text-slate-400 md:hidden">Keterangan</span><span>{record.keterangan}</span></td>
              <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap font-semibold text-red-400"><span className="text-sm font-semibold text-slate-400 md:hidden">Denda (Rp)</span><span>{record.denda > 0 ? record.denda.toLocaleString('id-ID') : '-'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  
  const SummaryCard = () => (
    Object.keys(summaryData).length > 0 && (
      <Card title="Ringkasan Konsekuensi">
        <div className="space-y-4">
          {Object.entries(summaryData).map(([name, data]: [string, SummaryDetails]) => (
            <div key={name} className="p-3 bg-slate-700/50 rounded-md">
              <h4 className="font-semibold text-white">{name}</h4>
              <ul className="list-disc list-inside text-sm text-slate-300 mt-1">
                <li>Total Keterlambatan: {data.lateCount} kali (Denda: Rp {data.totalLateFine.toLocaleString('id-ID')})</li>
                <li>
                  Total Tdk Absen Pulang: {data.missedCheckoutCount} kali 
                  <span className="text-slate-400"> (Denda Rp {data.missedCheckoutFine.toLocaleString('id-ID')}{data.missedCheckoutCount < 4 ? ' - berlaku setelah 4 kali' : ''})</span>
                </li>
                 <li>
                  Total Alpa: {data.alpaCount} kali 
                  <span className="text-slate-400"> (Denda Rp {data.totalAlpaFine.toLocaleString('id-ID')}{data.alpaCount < 4 ? ' - berlaku setelah 4 kali' : ''})</span>
                </li>
              </ul>
              <p className="font-bold text-amber-400 mt-2">Total Denda: Rp {data.totalFine.toLocaleString('id-ID')}</p>
            </div>
          ))}
        </div>
      </Card>
    )
  );

  const ReportPlaceholder = () => (
     <div className="text-center py-10 px-4 bg-slate-800/50 border border-slate-700 rounded-lg mt-6">
        <p className="font-medium text-white">
            {hasSearched ? 'Tidak ada data absensi yang ditemukan untuk kriteria yang dipilih.' : 'Pilih rentang tanggal untuk menampilkan laporan.'}
        </p>
      </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Laporan Absensi Tendik</h1>
      
      <Card>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label className="text-sm text-gray-400">Nama Tendik</label>
                <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)} className="w-full mt-1 p-2 bg-slate-700 border border-slate-600 rounded-md">
                    <option value="">Semua Tendik</option>
                    {staffMembers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>
            <div>
                <label className="text-sm text-gray-400">Tanggal Mulai</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full mt-1 p-2 bg-slate-700 border border-slate-600 rounded-md placeholder-gray-400"/>
            </div>
             <div>
                <label className="text-sm text-gray-400">Tanggal Selesai</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full mt-1 p-2 bg-slate-700 border border-slate-600 rounded-md placeholder-gray-400"/>
            </div>
          </div>
          <div className="flex justify-end space-x-4">
              <Button onClick={handleExportPDF} variant="secondary" className="w-auto !bg-red-700 hover:!bg-red-800 !text-white px-6" disabled={reportData.length === 0}>Ekspor PDF</Button>
              <Button onClick={handleExportExcel} variant="secondary" className="w-auto !bg-green-700 hover:!bg-green-800 !text-white px-6" disabled={reportData.length === 0}>Ekspor Excel</Button>
          </div>
        </div>
      </Card>

      {isLoading ? <Spinner /> : (reportData.length > 0 ? <ReportTable /> : <ReportPlaceholder />)}
      {!isLoading && <SummaryCard />}
      
    </div>
  );
};

export default StaffAttendanceReportPage;