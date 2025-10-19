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

const StaffAttendanceReportPage: React.FC = () => {
  // Filter state
  const [staffMembers, setStaffMembers] = useState<User[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Data state
  const [reportData, setReportData] = useState<AttendanceRecord[]>([]);
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

  const handleFetchReport = useCallback(async () => {
    if (!startDate || !endDate) {
      alert('Silakan pilih Tanggal Mulai dan Tanggal Selesai.');
      return;
    }
    
    setIsLoading(true);
    setHasSearched(true);
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const data = await getFilteredAttendanceReport({
      startDate: start,
      endDate: end,
      teacherId: selectedStaff || undefined, // teacherId is used for any user ID
    });
    // Further filter to ensure we only get 'Datang' or 'Pulang' status which are unique to staff
    const staffRecords = data.filter(d => d.status === 'Datang' || d.status === 'Pulang');
    setReportData(staffRecords);
    setIsLoading(false);
  }, [startDate, endDate, selectedStaff]);

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
        head: [['Nama', 'Jabatan', 'Waktu Datang', 'Waktu Pulang']],
        body: reportData.map(r => [
            r.userName,
            Role.AdministrativeStaff,
            r.timestamp.toLocaleString('id-ID'),
            r.checkOutTimestamp ? new Date(r.checkOutTimestamp).toLocaleString('id-ID') : 'Belum Absen Pulang'
        ]),
        startY: 20,
    });
    doc.save('laporan-absensi-staf.pdf');
  };

  const handleExportExcel = () => {
    if (reportData.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(reportData.map(r => ({
        'Nama': r.userName,
        'Jabatan': Role.AdministrativeStaff,
        'Waktu Datang': r.timestamp.toLocaleString('id-ID'),
        'Waktu Pulang': r.checkOutTimestamp ? new Date(r.checkOutTimestamp).toLocaleString('id-ID') : 'Belum Absen Pulang'
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Absensi Staf");
    XLSX.writeFile(workbook, 'laporan-absensi-staf.xlsx');
  };

  const ReportTable = () => (
    <div className="bg-slate-900 rounded-lg shadow-lg overflow-hidden mt-6">
        <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="p-4 text-sm font-semibold text-gray-200">Nama</th>
                    <th className="p-4 text-sm font-semibold text-gray-200">Jabatan</th>
                    <th className="p-4 text-sm font-semibold text-gray-200">Waktu Datang</th>
                    <th className="p-4 text-sm font-semibold text-gray-200">Waktu Pulang</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((record) => (
                    <tr key={record.id} className="border-b border-slate-700 last:border-0">
                      <td className="p-4 whitespace-nowrap font-medium">{record.userName}</td>
                      <td className="p-4 whitespace-nowrap text-gray-400">{Role.AdministrativeStaff}</td>
                      <td className="p-4 whitespace-nowrap text-gray-400">{record.timestamp.toLocaleString('id-ID')}</td>
                      <td className="p-4 whitespace-nowrap text-gray-400">
                        {record.checkOutTimestamp ? new Date(record.checkOutTimestamp).toLocaleString('id-ID') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
        </div>
    </div>
  );

  const ReportPlaceholder = () => (
     <div className="text-center py-10 px-4 bg-slate-900 rounded-lg mt-6">
        <p className="font-medium text-white">
            {hasSearched ? 'Tidak ada data absensi yang ditemukan untuk kriteria yang dipilih.' : 'Pilih rentang tanggal untuk menampilkan laporan.'}
        </p>
      </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Laporan Absensi Tenaga Administrasi</h1>
      
      <Card>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label className="text-sm text-gray-400">Nama Staf</label>
                <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)} className="w-full mt-1 p-2 bg-slate-600 border border-slate-500 rounded-md">
                    <option value="">Semua Staf</option>
                    {staffMembers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>
            <div>
                <label className="text-sm text-gray-400">Tanggal Mulai</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full mt-1 p-2 bg-slate-600 border border-slate-500 rounded-md placeholder-gray-400"/>
            </div>
             <div>
                <label className="text-sm text-gray-400">Tanggal Selesai</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full mt-1 p-2 bg-slate-600 border border-slate-500 rounded-md placeholder-gray-400"/>
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

export default StaffAttendanceReportPage;