import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { getFilteredAttendanceReport } from '../../services/attendanceService';
import { getAllUsers } from '../../services/authService';
import { getAllClasses, getAllEskuls, getAllMasterSchedules } from '../../services/dataService';
import { AttendanceRecord, User, Class, Eskul, Role, MasterSchedule } from '../../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// New interface for the comprehensive report entry
interface ComprehensiveReportEntry {
    id: string; // Unique key for react list
    tanggal: string; // YYYY-MM-DD
    guru: string;
    kelas: string;
    pelajaran: string;
    jamKe: number;
    status: 'Hadir' | 'Telat' | 'Alpa' | 'Sakit' | 'Izin' | 'Tugas Luar';
    waktuScan: string; // HH:mm:ss or '-'
    keterlambatan: string; // 'xx menit' or '-'
    keterangan: string; // '-' or reason
}


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
  const [reportData, setReportData] = useState<ComprehensiveReportEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');

  // Fetch data for filters
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const allUsers = await getAllUsers();
        setTeachers(allUsers.filter(u => u.role === Role.Teacher || u.role === Role.Coach));
        const classData = await getAllClasses();
        setClasses(classData);
        const eskulData = await getAllEskuls();
        setEskuls(eskulData);
      } catch (err) {
        setError('Gagal memuat data filter.');
      }
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
    setError('');
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    try {
        // 1. Fetch all data needed in parallel
        const [allSchedules, allUsers, existingRecords] = await Promise.all([
            getAllMasterSchedules(),
            getAllUsers(),
            getFilteredAttendanceReport({ startDate: start, endDate: end })
        ]);

        const userMap = new Map(allUsers.map(u => [u.id, u]));

        // 2. Create efficient lookup maps for attendance records
        const scanMap = new Map<string, AttendanceRecord>(); // Key: 'scheduleId-date'
        const dailyAbsenceMap = new Map<string, AttendanceRecord>(); // Key: 'teacherId-date'
        
        existingRecords.forEach(record => {
            if (record.scheduleId) {
                const key = `${record.scheduleId}-${record.date}`;
                scanMap.set(key, record);
            } else if (['Sakit', 'Izin', 'Tugas Luar'].includes(record.status)) {
                const key = `${record.teacherId}-${record.date}`;
                dailyAbsenceMap.set(key, record);
            }
        });

        const finalReport: ComprehensiveReportEntry[] = [];

        // 3. Loop through each day in the date range
        const loopDate = new Date(start);
        while (loopDate <= end) {
            // FIX: Use local date components to build the date string to prevent timezone bugs.
            const dateString = `${loopDate.getFullYear()}-${String(loopDate.getMonth() + 1).padStart(2, '0')}-${String(loopDate.getDate()).padStart(2, '0')}`;
            const dayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][loopDate.getDay()];

            // Get all schedules for the current day of the week
            let dailySchedules = allSchedules.filter(s => s.day === dayName);
            
            // Apply teacher filter if selected
            if (selectedTeacher) {
                const user = userMap.get(selectedTeacher);
                if (user?.kode) {
                    dailySchedules = dailySchedules.filter(s => s.kode === user.kode);
                } else {
                    dailySchedules = []; // No code, no schedules
                }
            }
             // Apply class filter if selected
            if (selectedClass) {
                const classInfo = classes.find(c => c.id === selectedClass);
                if (classInfo) {
                    dailySchedules = dailySchedules.filter(s => s.class === classInfo.name);
                }
            }


            // 4. Process each schedule for the day
            for (const schedule of dailySchedules) {
                const teacher = allUsers.find(u => u.kode === schedule.kode);
                if (!teacher) continue;

                const dailyAbsence = dailyAbsenceMap.get(`${teacher.id}-${dateString}`);
                const scanRecord = scanMap.get(`${schedule.id}-${dateString}`);

                let entry: ComprehensiveReportEntry = {
                    id: `${schedule.id}-${dateString}`,
                    tanggal: dateString,
                    guru: schedule.namaGuru,
                    kelas: schedule.class,
                    pelajaran: schedule.subject,
                    jamKe: schedule.period,
                    status: 'Alpa',
                    waktuScan: '-',
                    keterlambatan: '-',
                    keterangan: '-'
                };

                if (dailyAbsence) {
                    entry.status = dailyAbsence.status as 'Sakit' | 'Izin' | 'Tugas Luar';
                    entry.keterangan = dailyAbsence.reason || '-';
                } else if (scanRecord) {
                    entry.waktuScan = scanRecord.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    
                    // Calculate lateness
                    const [startTimeStr] = schedule.waktu.split(' - ');
                    const [startHour, startMinute] = startTimeStr.split(':').map(Number);
                    
                    const scanTime = scanRecord.timestamp;
                    const scheduleStartTime = new Date(scanTime);
                    scheduleStartTime.setHours(startHour, startMinute, 0, 0);

                    const latenessMinutes = Math.floor((scanTime.getTime() - scheduleStartTime.getTime()) / 60000);

                    if (latenessMinutes > 0) {
                        entry.status = 'Telat';
                        entry.keterlambatan = `${latenessMinutes} menit`;
                    } else {
                        entry.status = 'Hadir';
                    }
                }
                
                finalReport.push(entry);
            }
            loopDate.setDate(loopDate.getDate() + 1);
        }
        
        // 5. Sort the final report
        finalReport.sort((a, b) => {
            const dateComp = new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime();
            if (dateComp !== 0) return dateComp;
            const jamComp = a.jamKe - b.jamKe;
            if (jamComp !== 0) return jamComp;
            return a.guru.localeCompare(b.guru);
        });

        setReportData(finalReport);

    } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat laporan.');
        console.error(err);
    } finally {
        setIsLoading(false);
    }
  }, [startDate, endDate, selectedTeacher, selectedClass, classes]);


  const handleExportPDF = () => {
    if (reportData.length === 0) return;
    const doc = new jsPDF();
    doc.text("Laporan Absensi Guru", 14, 16);
    (doc as any).autoTable({
        head: [['Tanggal', 'Guru', 'Kelas', 'Pelajaran', 'Jam Ke', 'Status', 'Waktu Scan', 'Keterlambatan']],
        body: reportData.map(r => [
            r.tanggal,
            r.guru,
            r.kelas,
            r.pelajaran,
            r.jamKe,
            r.status,
            r.waktuScan,
            r.keterlambatan,
        ]),
        startY: 20,
    });
    doc.save('laporan-absensi-guru.pdf');
  };

  const handleExportExcel = () => {
    if (reportData.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(reportData.map(r => ({
        'Tanggal': r.tanggal,
        'Guru': r.guru,
        'Kelas': r.kelas,
        'Pelajaran': r.pelajaran,
        'Jam Ke': r.jamKe,
        'Status': r.status,
        'Waktu Scan': r.waktuScan,
        'Keterlambatan': r.keterlambatan,
        'Keterangan': r.keterangan,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Absensi");
    XLSX.writeFile(workbook, 'laporan-absensi-guru.xlsx');
  };
  
    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Hadir':
                return 'bg-emerald-500/30 text-emerald-200';
            case 'Telat':
                return 'bg-yellow-500/30 text-yellow-200';
            case 'Sakit':
            case 'Izin':
            case 'Tugas Luar':
                return 'bg-blue-500/30 text-blue-200';
            case 'Alpa':
                return 'bg-red-500/30 text-red-200';
            default:
                return 'bg-slate-500/30 text-slate-300';
        }
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
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg mt-6 overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-slate-800">
          <tr>
            <th className="p-4 text-sm font-semibold text-gray-200">Tanggal</th>
            <th className="p-4 text-sm font-semibold text-gray-200">Guru</th>
            <th className="p-4 text-sm font-semibold text-gray-200">Kelas</th>
            <th className="p-4 text-sm font-semibold text-gray-200">Pelajaran</th>
            <th className="p-4 text-sm font-semibold text-gray-200">Jam Ke</th>
            <th className="p-4 text-sm font-semibold text-gray-200">Status</th>
            <th className="p-4 text-sm font-semibold text-gray-200">Waktu Scan</th>
            <th className="p-4 text-sm font-semibold text-gray-200">Keterlambatan</th>
            <th className="p-4 text-sm font-semibold text-gray-200">Keterangan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {reportData.map((record) => (
            <tr key={record.id}>
              <td className="p-4 whitespace-nowrap text-gray-400">{record.tanggal}</td>
              <td className="p-4 whitespace-nowrap font-medium">{record.guru}</td>
              <td className="p-4 whitespace-nowrap text-gray-400">{record.kelas}</td>
              <td className="p-4 whitespace-nowrap text-gray-400">{record.pelajaran}</td>
              <td className="p-4 whitespace-nowrap text-gray-400">{record.jamKe}</td>
              <td className="p-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(record.status)}`}>
                  {record.status}
                </span>
              </td>
              <td className="p-4 whitespace-nowrap text-gray-400">{record.waktuScan}</td>
              <td className="p-4 whitespace-nowrap text-yellow-400">{record.keterlambatan}</td>
              <td className="p-4 text-gray-400 text-xs">{record.keterangan}</td>
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
        {!hasSearched && <p className="text-gray-400 mt-1">Laporan lengkap termasuk data guru yang tidak hadir akan ditampilkan di sini.</p>}
      </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Laporan Absensi Guru</h1>
      <div className="border-b border-slate-700">
        <TabButton tabId="kelas" label="Absensi Kelas" />
        <TabButton tabId="ekstrakurikuler" label="Absensi Ekstrakurikuler" />
      </div>
      <Card>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
                <label className="text-sm text-gray-400">Guru</label>
                <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)} className="w-full mt-1 p-2 bg-slate-700 border border-slate-600 rounded-md">
                    <option value="">Semua Guru</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>
            <div>
                <label className="text-sm text-gray-400">{activeTab === 'kelas' ? 'Kelas' : 'Eskul'}</label>
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full mt-1 p-2 bg-slate-700 border border-slate-600 rounded-md">
                    <option value="">{activeTab === 'kelas' ? 'Semua Kelas' : 'Semua Eskul'}</option>
                    {activeTab === 'kelas' 
                        ? classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                        // FIX: Added eskuls mapping for the dropdown.
                        : eskuls.map(e => <option key={e.id} value={e.id}>{e.name}</option>)
                    }
                </select>
            </div>
            <div>
                <label className="text-sm text-gray-400">Tanggal Mulai</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="w-full mt-1 p-2 bg-slate-700 border border-slate-600 rounded-md placeholder-gray-400"/>
            </div>
             <div>
                <label className="text-sm text-gray-400">Tanggal Selesai</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className="w-full mt-1 p-2 bg-slate-700 border border-slate-600 rounded-md placeholder-gray-400"/>
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
           <div className="flex justify-between items-center pt-4">
               <Button onClick={handleFetchReport} isLoading={isLoading} className="w-auto px-6">Tampilkan Laporan</Button>
                <div className="flex space-x-4">
                    <Button onClick={handleExportPDF} variant="secondary" className="w-auto !bg-red-700 hover:!bg-red-800 !text-white px-6" disabled={reportData.length === 0}>Ekspor PDF</Button>
                    <Button onClick={handleExportExcel} variant="secondary" className="w-auto !bg-green-700 hover:!bg-green-800 !text-white px-6" disabled={reportData.length === 0}>Ekspor Excel</Button>
                </div>
           </div>
        </div>
      </Card>

      {isLoading ? <Spinner /> : (reportData.length > 0 ? <ReportTable /> : <ReportPlaceholder />)}
      
    </div>
  );
};

export default TeacherAttendanceReportPage;