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

// A type for the processed report data
interface ProcessedCoachRecord extends AttendanceRecord {
  keterangan: string;
}

const CoachAttendanceReportPage: React.FC = () => {
  // Filter state
  const [coaches, setCoaches] = useState<User[]>([]);
  const [selectedCoach, setSelectedCoach] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Data state
  const [reportData, setReportData] = useState<ProcessedCoachRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch coach data for filters
  useEffect(() => {
    const fetchFilterData = async () => {
      const allUsers = await getAllUsers();
      setCoaches(allUsers.filter(u => u.role === Role.Coach));
    };
    fetchFilterData();
  }, []);
  
  const processCoachReport = (records: AttendanceRecord[]): ProcessedCoachRecord[] => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const processedRecords = records.map(record => {
        const recordDate = record.timestamp;
        let keterangan = '-';
        let isLate = false;

        // Check for lateness (after 14:00)
        const checkInHour = recordDate.getHours();
        const checkInMinute = recordDate.getMinutes();
        if (checkInHour > 14 || (checkInHour === 14 && checkInMinute > 0)) {
            isLate = true;
        }

        // Check for missed checkout (after 17:00)
        if (!record.checkOutTimestamp) {
            const isPastDay = recordDate < startOfToday;
            const deadlineHour = 17;
            const deadlineMinute = 0;

            const isToday = recordDate.getFullYear() === now.getFullYear() &&
                            recordDate.getMonth() === now.getMonth() &&
                            recordDate.getDate() === now.getDate();
            
            const isPastDeadlineToday = isToday && (now.getHours() > deadlineHour || (now.getHours() === deadlineHour && now.getMinutes() > deadlineMinute));

            if (isPastDay || isPastDeadlineToday) {
                keterangan = 'Tidak Absen Pulang';
            }
        }
      
        if (isLate) {
            keterangan = keterangan === '-' ? 'Telat' : `${keterangan}; Telat`;
        }
      
        return { ...record, keterangan };
    });
    
    return processedRecords;
  };

  const handleFetchReport = useCallback(async () => {
    if (!startDate || !endDate) {
      alert('Silakan pilih Tanggal Mulai dan Tanggal Selesai.');
      return;
    }
    
    setIsLoading(true);
    setHasSearched(true);
    setReportData([]);
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const data = await getFilteredAttendanceReport({
      startDate: start,
      endDate: end,
      teacherId: selectedCoach || undefined,
    });
    
    const coachIds = new Set(coaches.map(s => s.id));
    const coachRecords = data.filter(d => coachIds.has(d.teacherId));
    
    const processedRecords = processCoachReport(coachRecords);
    setReportData(processedRecords);
    setIsLoading(false);
  }, [startDate, endDate, selectedCoach, coaches]);

  useEffect(() => {
      if (startDate && endDate) {
          handleFetchReport();
      }
  }, [startDate, endDate, selectedCoach, handleFetchReport]);

  const handleExportPDF = () => {
    if (reportData.length === 0) return;
    const doc = new jsPDF();
    doc.text("Laporan Absensi Pembina Ekstrakurikuler", 14, 16);
    (doc as any).autoTable({
        head: [['Nama Pembina', 'Waktu Datang', 'Waktu Pulang', 'Keterangan']],
        body: reportData.map(r => [
            r.userName,
            r.timestamp.toLocaleString('id-ID'),
            r.checkOutTimestamp ? new Date(r.checkOutTimestamp).toLocaleString('id-ID') : '-',
            r.keterangan,
        ]),
        startY: 20,
    });
    doc.save('laporan-absensi-pembina.pdf');
  };

  const handleExportExcel = () => {
    if (reportData.length === 0) return;
    const reportSheet = reportData.map(r => ({
        'Nama Pembina': r.userName,
        'Waktu Datang': r.timestamp.toLocaleString('id-ID'),
        'Waktu Pulang': r.checkOutTimestamp ? new Date(r.checkOutTimestamp).toLocaleString('id-ID') : '-',
        'Keterangan': r.keterangan,
    }));
    const worksheet = XLSX.utils.json_to_sheet(reportSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Absensi Pembina");
    XLSX.writeFile(workbook, 'laporan-absensi-pembina.xlsx');
  };

  const ReportTable = () => (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg mt-6 overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-slate-800">
          <tr className="hidden md:table-row">
            <th className="p-4 text-sm font-semibold text-gray-200">Nama Pembina</th>
            <th className="p-4 text-sm font-semibold text-gray-200">Waktu Datang</th>
            <th className="p-4 text-sm font-semibold text-gray-200">Waktu Pulang</th>
            <th className="p-4 text-sm font-semibold text-gray-200">Keterangan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {reportData.map((record) => (
            <tr key={record.id} className="block p-4 space-y-3 md:table-row md:p-0 md:space-y-0 hover:bg-slate-800/50 transition-colors">
              <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap font-medium"><span className="text-sm font-semibold text-slate-400 md:hidden">Nama</span><span>{record.userName}</span></td>
              <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap text-gray-400"><span className="text-sm font-semibold text-slate-400 md:hidden">Waktu Datang</span><span>{record.timestamp.toLocaleString('id-ID')}</span></td>
              <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap text-gray-400"><span className="text-sm font-semibold text-slate-400 md:hidden">Waktu Pulang</span><span>{record.checkOutTimestamp ? new Date(record.checkOutTimestamp).toLocaleString('id-ID') : '-'}</span></td>
              <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap text-yellow-400 text-xs"><span className="text-sm font-semibold text-slate-400 md:hidden">Keterangan</span><span>{record.keterangan}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
      <h1 className="text-xl font-bold text-white">Laporan Absensi Pembina Ekstrakurikuler</h1>
      
      <Card>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label className="text-sm text-gray-400">Nama Pembina</label>
                <select value={selectedCoach} onChange={e => setSelectedCoach(e.target.value)} className="w-full mt-1 p-2 bg-slate-700 border border-slate-600 rounded-md">
                    <option value="">Semua Pembina</option>
                    {coaches.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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
      
    </div>
  );
};

export default CoachAttendanceReportPage;
