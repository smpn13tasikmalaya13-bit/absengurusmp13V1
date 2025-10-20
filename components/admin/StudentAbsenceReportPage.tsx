import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { getAllUsers } from '../../services/authService';
import { getAllClasses, getFilteredStudentAbsenceReport } from '../../services/dataService';
import { User, Class, Role, StudentAbsenceRecord } from '../../types';
import { Spinner } from '../ui/Spinner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const StudentAbsenceReportPage: React.FC = () => {
  // Filter options
  const [teachers, setTeachers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  
  // Filter state
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Report data
  const [reportData, setReportData] = useState<StudentAbsenceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const fetchFilterData = async () => {
      setIsLoading(true);
      const allUsers = await getAllUsers();
      setTeachers(allUsers.filter(u => u.role === Role.Teacher || u.role === Role.Coach));
      const classData = await getAllClasses();
      setClasses(classData);
      setIsLoading(false);
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
    
    // Find class name from selected ID
    const classInfo = classes.find(c => c.id === selectedClass);
    const className = classInfo ? classInfo.name : undefined;

    const data = await getFilteredStudentAbsenceReport({
      startDate,
      endDate,
      teacherId: selectedTeacher || undefined,
      className,
    });
    setReportData(data);
    setIsLoading(false);
  }, [startDate, endDate, selectedTeacher, selectedClass, classes]);

  useEffect(() => {
    if (startDate && endDate) {
      handleFetchReport();
    }
  }, [startDate, endDate, selectedTeacher, selectedClass, handleFetchReport]);

  const handleExportPDF = () => {
    if (reportData.length === 0) return;
    const doc = new jsPDF();
    doc.text("Laporan Siswa Tidak Hadir", 14, 16);
    (doc as any).autoTable({
        head: [['Nama Siswa', 'Kelas', 'Tanggal', 'Keterangan', 'Jam Ke-', 'Dilaporkan Oleh']],
        body: reportData.map(r => [
            r.studentName,
            r.class,
            new Date(r.date).toLocaleDateString('id-ID'),
            r.reason,
            r.absentPeriods?.join(', ') || '-',
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
        'Jam Ke-': r.absentPeriods?.join(', ') || '-',
        'Dilaporkan Oleh': r.reportedBy,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Siswa Absen");
    XLSX.writeFile(workbook, 'laporan-siswa-absen.xlsx');
  };
  
  const ReportPlaceholder = () => (
     <div className="text-center py-10 px-4 bg-slate-800/50 border border-slate-700 rounded-lg mt-6">
        <p className="font-medium text-white">
            {hasSearched ? 'Tidak ada data siswa tidak hadir yang ditemukan untuk kriteria yang dipilih.' : 'Pilih rentang tanggal untuk menampilkan laporan.'}
        </p>
      </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Laporan Siswa Tidak Hadir</h1>
      <Card>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
                <label className="text-sm text-gray-400">Guru Pelapor</label>
                <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)} className="w-full mt-1 p-2 bg-slate-700 border border-slate-600 rounded-md">
                    <option value="">Semua Guru</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>
            <div>
                <label className="text-sm text-gray-400">Kelas</label>
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full mt-1 p-2 bg-slate-700 border border-slate-600 rounded-md">
                    <option value="">Semua Kelas</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
      
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg mt-6 overflow-x-auto">
            {reportData.length > 0 ? (
                 <table className="w-full text-left">
                    <thead className="bg-slate-800">
                      <tr className="hidden md:table-row">
                        <th className="p-4 text-sm font-semibold text-gray-200">Nama Siswa</th>
                        <th className="p-4 text-sm font-semibold text-gray-200">Kelas</th>
                        <th className="p-4 text-sm font-semibold text-gray-200">Tanggal</th>
                        <th className="p-4 text-sm font-semibold text-gray-200">Keterangan</th>
                        <th className="p-4 text-sm font-semibold text-gray-200">Jam Ke-</th>
                        <th className="p-4 text-sm font-semibold text-gray-200">Dilaporkan Oleh</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {reportData.map((record) => (
                        <tr key={record.id} className="block p-4 space-y-3 md:table-row md:p-0 md:space-y-0 hover:bg-slate-800/50 transition-colors">
                          <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap font-medium"><span className="text-sm font-semibold text-slate-400 md:hidden">Nama</span><span>{record.studentName}</span></td>
                          <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap text-gray-400"><span className="text-sm font-semibold text-slate-400 md:hidden">Kelas</span><span>{record.class}</span></td>
                          <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap text-gray-400"><span className="text-sm font-semibold text-slate-400 md:hidden">Tanggal</span><span>{new Date(record.date).toLocaleDateString('id-ID', { timeZone: 'UTC' })}</span></td>
                          <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap">
                            <span className="text-sm font-semibold text-slate-400 md:hidden">Keterangan</span>
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${record.reason === 'Sakit' ? 'bg-yellow-100 text-yellow-800' : record.reason === 'Izin' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                              {record.reason}
                            </span>
                          </td>
                          <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap text-gray-400"><span className="text-sm font-semibold text-slate-400 md:hidden">Jam Ke-</span><span>{record.absentPeriods?.join(', ') || '-'}</span></td>
                          <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap text-gray-400"><span className="text-sm font-semibold text-slate-400 md:hidden">Pelapor</span><span>{record.reportedBy}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
            ) : (
                <ReportPlaceholder />
            )}
        </div>
      )}
    </div>
  );
};

export default StudentAbsenceReportPage;