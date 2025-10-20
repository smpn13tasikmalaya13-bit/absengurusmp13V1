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

// FIX: Moved interfaces outside of the component to be accessible for type annotations.
interface SummaryDetails {
    lateCount: number;
    missedCheckoutCount: number;
    totalLateFine: number;
    missedCheckoutFine: number;
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
    const userStats: { [userName: string]: { lateCount: number; missedCheckoutCount: number } } = {};

    // First pass: Calculate daily status and count occurrences
    const processedRecords = records.map(record => {
      if (!userStats[record.userName]) {
        userStats[record.userName] = { lateCount: 0, missedCheckoutCount: 0 };
      }

      const recordDate = record.timestamp;
      const day = recordDate.getDay(); // Sunday: 0, Monday: 1, ..., Friday: 5
      let keterangan = '-';
      let denda = 0;
      let isLate = false;
      let isMissedCheckout = false;

      // Rules only apply from Monday to Friday
      if (day >= 1 && day <= 5) {
        const checkInHour = recordDate.getHours();
        const checkInMinute = recordDate.getMinutes();
        if (checkInHour > 7 || (checkInHour === 7 && checkInMinute > 15)) {
          isLate = true;
          userStats[record.userName].lateCount += 1;
        }
        if (!record.checkOutTimestamp) {
          isMissedCheckout = true;
          userStats[record.userName].missedCheckoutCount += 1;
        }
      }

      if (isLate) {
        keterangan = `Telat`;
        denda = lateFine;
      }
      if (isMissedCheckout) {
        keterangan = keterangan === '-' ? 'Tidak Absen Pulang' : `${keterangan}; Tidak Absen Pulang`;
      }
      
      return { ...record, keterangan, denda };
    });

    const summary: SummaryData = {};
    for (const userName in userStats) {
      const stats = userStats[userName];
      const totalLateFine = stats.lateCount * lateFine;
      const finalMissedCheckoutFine = stats.missedCheckoutCount > 3 ? missedCheckoutFine : 0;
      const totalFine = totalLateFine + finalMissedCheckoutFine;

      if(totalFine > 0){
        summary[userName] = {
            lateCount: stats.lateCount,
            missedCheckoutCount: stats.missedCheckoutCount,
            totalLateFine,
            missedCheckoutFine: finalMissedCheckoutFine,
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

    const data = await getFilteredAttendanceReport({
      startDate: start,
      endDate: end,
      teacherId: selectedStaff || undefined,
    });
    
    // FIX: Filter staff records by checking teacherId against the staffMembers list,
    // as AttendanceRecord does not have a 'role' property.
    const staffIds = new Set(staffMembers.map(s => s.id));
    const staffRecords = data.filter(d => staffIds.has(d.teacherId));
    
    const { processedRecords, summary } = processStaffReport(staffRecords);
    setReportData(processedRecords);
    setSummaryData(summary);
    setIsLoading(false);
  }, [startDate, endDate, selectedStaff, staffMembers]);

  useEffect(() => {
      if (startDate && endDate) {
          handleFetchReport();
      }
  }, [startDate, endDate, selectedStaff, handleFetchReport]);

  const handleExportPDF = () => {
    if (reportData.length === 0) return;
    const doc = new jsPDF();
    doc.text("Laporan Absensi Tenaga Administrasi", 14, 16);
    (doc as any).autoTable({
        head: [['Nama', 'Jabatan', 'Waktu Datang', 'Waktu Pulang', 'Keterangan', 'Denda (Rp)']],
        body: reportData.map(r => [
            r.userName,
            Role.AdministrativeStaff,
            r.timestamp.toLocaleString('id-ID'),
            r.checkOutTimestamp ? new Date(r.checkOutTimestamp).toLocaleString('id-ID') : '-',
            r.keterangan,
            r.denda.toLocaleString('id-ID')
        ]),
        startY: 20,
    });
    if (Object.keys(summaryData).length > 0) {
        (doc as any).autoTable({
            head: [['Ringkasan Denda (Periode Laporan)']],
            // FIX: Explicitly type 'data' to resolve property access errors.
            body: Object.entries(summaryData).map(([name, data]: [string, SummaryDetails]) => {
                let summaryText = `${name}:\n`;
                summaryText += ` - Keterlambatan: ${data.lateCount} kali (Rp ${data.totalLateFine.toLocaleString('id-ID')})\n`;
                summaryText += ` - Tdk Absen Pulang: ${data.missedCheckoutCount} kali (Denda: Rp ${data.missedCheckoutFine.toLocaleString('id-ID')})\n`;
                summaryText += ` - Total Denda: Rp ${data.totalFine.toLocaleString('id-ID')}`;
                return [summaryText];
            }),
            theme: 'striped',
        });
    }
    doc.save('laporan-absensi-staf.pdf');
  };

  const handleExportExcel = () => {
    if (reportData.length === 0) return;
    const reportSheet = reportData.map(r => ({
        'Nama': r.userName,
        'Jabatan': Role.AdministrativeStaff,
        'Waktu Datang': r.timestamp.toLocaleString('id-ID'),
        'Waktu Pulang': r.checkOutTimestamp ? new Date(r.checkOutTimestamp).toLocaleString('id-ID') : '-',
        'Keterangan': r.keterangan,
        'Denda Harian (Rp)': r.denda
    }));
    const worksheet = XLSX.utils.json_to_sheet(reportSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Absensi Staf");

    if (Object.keys(summaryData).length > 0) {
        const summarySheetData = [
            ['Ringkasan Denda (Periode Laporan)'],
            ['Nama Staf', 'Total Terlambat', 'Denda Terlambat', 'Total Tdk Absen Pulang', 'Denda Tdk Absen Pulang', 'Total Denda Keseluruhan'],
             // FIX: Explicitly type 'data' to resolve property access errors.
             ...Object.entries(summaryData).map(([name, data]: [string, SummaryDetails]) => [
                name,
                data.lateCount,
                data.totalLateFine,
                data.missedCheckoutCount,
                data.missedCheckoutFine,
                data.totalFine
            ])
        ];
        const summarySheet = XLSX.utils.aoa_to_sheet(summarySheetData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, "Ringkasan Denda");
    }

    XLSX.writeFile(workbook, 'laporan-absensi-staf.xlsx');
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
              <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap text-gray-400"><span className="text-sm font-semibold text-slate-400 md:hidden">Waktu Datang</span><span>{record.timestamp.toLocaleString('id-ID')}</span></td>
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
          {/* FIX: Explicitly type 'data' to resolve property access errors. */}
          {Object.entries(summaryData).map(([name, data]: [string, SummaryDetails]) => (
            <div key={name} className="p-3 bg-slate-700/50 rounded-md">
              <h4 className="font-semibold text-white">{name}</h4>
              <ul className="list-disc list-inside text-sm text-slate-300 mt-1">
                <li>Total Keterlambatan: {data.lateCount} kali (Denda: Rp {data.totalLateFine.toLocaleString('id-ID')})</li>
                <li>Total Tidak Absen Pulang: {data.missedCheckoutCount} kali (Denda: Rp {data.missedCheckoutFine.toLocaleString('id-ID')})</li>
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
      <h1 className="text-xl font-bold text-white">Laporan Absensi Tenaga Administrasi</h1>
      
      <Card>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label className="text-sm text-gray-400">Nama Staf</label>
                <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)} className="w-full mt-1 p-2 bg-slate-700 border border-slate-600 rounded-md">
                    <option value="">Semua Staf</option>
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
