import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { getAllUsers } from '../../services/authService';
import { getAllClasses } from '../../services/dataService';
import { User, Class, Role, StudentAbsenceRecord } from '../../types';
import { Spinner } from '../ui/Spinner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Mock data until the feature for teachers to report is implemented
const MOCK_STUDENT_ABSENCE_DATA: StudentAbsenceRecord[] = [
  { id: '1', studentName: 'Budi Hartono', class: 'VII A', date: '2025-07-21', reason: 'Sakit', reportedBy: 'Alita Yatnikasari Putri' },
  { id: '2', studentName: 'Citra Lestari', class: 'VIII C', date: '2025-07-21', reason: 'Izin', reportedBy: 'Suherlan' },
  { id: '3', studentName: 'Doni Firmansyah', class: 'VII A', date: '2025-07-22', reason: 'Alpa', reportedBy: 'Alita Yatnikasari Putri' },
  { id: '4', studentName: 'Eka Wijaya', class: 'IX F', date: '2025-07-22', reason: 'Sakit', reportedBy: 'Rizal Andrianto' },
  { id: '5', studentName: 'Fajar Nugroho', class: 'VII J', date: '2025-07-23', reason: 'Izin', reportedBy: 'Suherlan' },
];

const StudentAbsenceReportPage: React.FC = () => {
  // Filter options
  const [teachers, setTeachers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  
  // Report data
  const [reportData, setReportData] = useState<StudentAbsenceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      // Fetch data for filters
      const allUsers = await getAllUsers();
      setTeachers(allUsers.filter(u => u.role === Role.Teacher || u.role === Role.Coach));
      const classData = await getAllClasses();
      setClasses(classData);
      
      // Simulate fetching report data
      setTimeout(() => {
        setReportData(MOCK_STUDENT_ABSENCE_DATA);
        setIsLoading(false);
      }, 500);
    };
    fetchInitialData();
  }, []);

  const handleExportPDF = () => {
    if (reportData.length === 0) return;
    const doc = new jsPDF();
    doc.text("Laporan Siswa Tidak Hadir", 14, 16);
    (doc as any).autoTable({
        head: [['Nama Siswa', 'Kelas', 'Tanggal', 'Keterangan', 'Dilaporkan Oleh']],
        body: reportData.map(r => [
            r.studentName,
            r.class,
            new Date(r.date).toLocaleDateString('id-ID'),
            r.reason,
            r.reportedBy
        ]),
        startY: 20,
    });
    doc.save('laporan-siswa-absen.pdf');
  };

  const handleExportExcel = () => {
    if (reportData.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(reportData.map(r => ({
        'Nama Siswa': r.studentName,
        'Kelas': r.class,
        'Tanggal': new Date(r.date).toLocaleDateString('id-ID'),
        'Keterangan': r.reason,
        'Dilaporkan Oleh': r.reportedBy,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Siswa Absen");
    XLSX.writeFile(workbook, 'laporan-siswa-absen.xlsx');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Laporan Siswa Tidak Hadir</h1>
      <Card>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {/* Filters */}
            <div>
                <label className="text-sm text-gray-400">Guru Pelapor</label>
                <select className="w-full mt-1 p-2 bg-slate-600 border border-slate-500 rounded-md">
                    <option value="">Semua Guru</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>
            <div>
                <label className="text-sm text-gray-400">Kelas</label>
                <select className="w-full mt-1 p-2 bg-slate-600 border border-slate-500 rounded-md">
                    <option value="">Semua Kelas</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            <div>
                <label className="text-sm text-gray-400">Tanggal Mulai</label>
                <input type="date" className="w-full mt-1 p-2 bg-slate-600 border border-slate-500 rounded-md placeholder-gray-400"/>
            </div>
             <div>
                <label className="text-sm text-gray-400">Tanggal Selesai</label>
                <input type="date" className="w-full mt-1 p-2 bg-slate-600 border border-slate-500 rounded-md placeholder-gray-400"/>
            </div>
          </div>
          <div className="flex justify-end space-x-4">
              <Button onClick={handleExportPDF} variant="secondary" className="w-auto !bg-gray-600 hover:!bg-gray-700 !text-white px-6" disabled={reportData.length === 0}>Ekspor PDF</Button>
              <Button onClick={handleExportExcel} variant="secondary" className="w-auto !bg-gray-600 hover:!bg-gray-700 !text-white px-6" disabled={reportData.length === 0}>Ekspor Excel</Button>
          </div>
        </div>
      </Card>
      
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="bg-slate-900 rounded-lg shadow-lg overflow-hidden mt-6">
            <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-700/50">
                      <tr>
                        <th className="p-4 text-sm font-semibold text-gray-200">Nama Siswa</th>
                        <th className="p-4 text-sm font-semibold text-gray-200">Kelas</th>
                        <th className="p-4 text-sm font-semibold text-gray-200">Tanggal</th>
                        <th className="p-4 text-sm font-semibold text-gray-200">Keterangan</th>
                        <th className="p-4 text-sm font-semibold text-gray-200">Dilaporkan Oleh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.length > 0 ? reportData.map((record) => (
                        <tr key={record.id} className="border-b border-slate-700 last:border-0">
                          <td className="p-4 whitespace-nowrap font-medium">{record.studentName}</td>
                          <td className="p-4 whitespace-nowrap text-gray-400">{record.class}</td>
                          <td className="p-4 whitespace-nowrap text-gray-400">{new Date(record.date).toLocaleDateString('id-ID')}</td>
                          <td className="p-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              record.reason === 'Sakit' ? 'bg-yellow-100 text-yellow-800' :
                              record.reason === 'Izin' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {record.reason}
                            </span>
                          </td>
                           <td className="p-4 whitespace-nowrap text-gray-400">{record.reportedBy}</td>
                        </tr>
                      )) : (
                        <tr>
                            <td colSpan={5} className="p-6 text-center text-gray-400">
                                Tidak ada data siswa tidak hadir yang ditemukan.
                            </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
            </div>
        </div>
      )}
    </div>
  );
};

export default StudentAbsenceReportPage;