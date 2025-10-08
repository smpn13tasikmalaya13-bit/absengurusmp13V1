import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { getFilteredAttendanceReport } from '../../services/attendanceService';
import { getAllUsers } from '../../services/authService';
import { getAllClasses, getAllEskuls } from '../../services/dataService';
import { AttendanceRecord, User, Class, Eskul, Role } from '../../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';


const TeacherAttendanceReportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('kelas');

  // Filter state
  const [teachers, setTeachers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [eskuls, setEskuls] = useState<Eskul[]>([]);
  
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Data state
  const [reportData, setReportData] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch data for filters
  useEffect(() => {
    const fetchFilterData = async () => {
      const allUsers = await getAllUsers();
      setTeachers(allUsers.filter(u => u.role === Role.Teacher || u.role === Role.Coach));
      const classData = await getAllClasses();
      setClasses(classData);
      const eskulData = await getAllEskuls();
      setEskuls(eskulData);
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
      teacherId: selectedTeacher || undefined,
    });
    setReportData(data);
    setIsLoading(false);
  }, [startDate, endDate, selectedTeacher]);

  useEffect(() => {
      if (startDate && endDate) {
          handleFetchReport();
      }
  }, [startDate, endDate, selectedTeacher, handleFetchReport]);

  const handleExportPDF = () => {
    if (reportData.length === 0) return;
    const doc = new jsPDF();
    doc.text("Laporan Absensi Guru", 14, 16);
    (doc as any).autoTable({
        head: [['Nama Guru', 'Tanggal', 'Waktu', 'Status']],
        body: reportData.map(r => [
            r.userName,
            r.timestamp.toLocaleDateString('id-ID'),
            r.timestamp.toLocaleTimeString('id-ID'),
            r.status
        ]),
        startY: 20,
    });
    doc.save('laporan-absensi-guru.pdf');
  };

  const handleExportExcel = () => {
    if (reportData.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(reportData.map(r => ({
        'Nama Guru': r.userName,
        'Tanggal': r.timestamp.toLocaleDateString('id-ID'),
        'Waktu': r.timestamp.toLocaleTimeString('id-ID'),
        'Status': r.status,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Absensi");
    XLSX.writeFile(workbook, 'laporan-absensi-guru.xlsx');
  };

  const TabButton: React.FC<{tabId: string; label: string}> = ({ tabId, label }) => (
    <button
      onClick={() => setActiveTab(tabId)}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
        activeTab === tabId
          ? 'border-b-2 border-blue-500 text-white'
          : 'text-gray-400 hover:text-white'
      }`}
    >
      {label}
    </button>
  );

  const ReportTable = () => (
    <div className="bg-slate-900 rounded-lg shadow-lg overflow-hidden mt-6">
        <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="p-4 text-sm font-semibold text-gray-200">Nama Guru</th>
                    <th className="p-4 text-sm font-semibold text-gray-200">Tanggal</th>
                    <th className="p-4 text-sm font-semibold text-gray-200">Waktu</th>
                    <th className="p-4 text-sm font-semibold text-gray-200">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((record) => (
                    <tr key={record.id} className="border-b border-slate-700 last:border-0">
                      <td className="p-4 whitespace-nowrap font-medium">{record.userName}</td>
                      <td className="p-4 whitespace-nowrap text-gray-400">{record.timestamp.toLocaleDateString('id-ID')}</td>
                      <td className="p-4 whitespace-nowrap text-gray-400">{record.timestamp.toLocaleTimeString('id-ID')}</td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          record.status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {record.status}
                        </span>
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
        {!hasSearched && <p className="text-gray-400 mt-1">Laporan lengkap termasuk data guru yang tidak hadir akan ditampilkan di sini.</p>}
      </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Laporan Absensi Guru</h1>
      <div className="border-b border-slate-700">
        <TabButton tabId="kelas" label="Absensi Kelas" />
        <TabButton tabId="ekstrakurikuler" label="Absensi Ekstrakurikuler" />
      </div>
      <Card>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
                <label className="text-sm text-gray-400">Guru</label>
                <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)} className="w-full mt-1 p-2 bg-slate-600 border border-slate-500 rounded-md">
                    <option value="">Semua Guru</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>
            <div>
                <label className="text-sm text-gray-400">{activeTab === 'kelas' ? 'Kelas' : 'Eskul'}</label>
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full mt-1 p-2 bg-slate-600 border border-slate-500 rounded-md">
                    <option value="">{activeTab === 'kelas' ? 'Semua Kelas' : 'Semua Eskul'}</option>
                    {/* Note: Filtering by class/eskul is not yet implemented in the backend. */}
                    {activeTab === 'kelas' 
                        ? classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                        : eskuls.map(e => <option key={e.id} value={e.id}>{e.name}</option>)
                    }
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
              <Button onClick={handleExportPDF} variant="secondary" className="w-auto !bg-gray-600 hover:!bg-gray-700 !text-white px-6" disabled={reportData.length === 0}>Ekspor PDF</Button>
              <Button onClick={handleExportExcel} variant="secondary" className="w-auto !bg-gray-600 hover:!bg-gray-700 !text-white px-6" disabled={reportData.length === 0}>Ekspor Excel</Button>
          </div>
        </div>
      </Card>

      {isLoading ? <Spinner /> : (reportData.length > 0 ? <ReportTable /> : <ReportPlaceholder />)}
      
    </div>
  );
};

export default TeacherAttendanceReportPage;