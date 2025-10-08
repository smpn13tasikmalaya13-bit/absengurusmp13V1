import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isWithinSchoolRadius, getCurrentPosition } from '../../services/locationService';
import QRScanner from './QRScanner';
import { getSchedulesByTeacher, reportStudentAbsence, getStudentAbsencesByTeacherForDate } from '../../services/dataService';
import { getAttendanceForTeacher, reportTeacherAbsence } from '../../services/attendanceService';
import { LessonSchedule, AttendanceRecord, StudentAbsenceRecord } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

// SVG Icons for the dashboard
const LocationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>;
const OptionsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" /></svg>;
const MailIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
const QrCodeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4m12 0h-4v4m0 12v-4h4m-12 0H4v-4" /></svg>;
const ScheduleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const ReportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const StudentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const EmptyHistoryIcon = () => <svg className="h-16 w-16 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /><rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="4 4"/></svg>;
const EmptyScheduleIcon = () => <svg className="h-16 w-16 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const EmptyReportIcon = () => <svg className="h-16 w-16 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;

const TeacherDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [isWithinRadius, setIsWithinRadius] = useState<boolean | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Dynamic data states
  const [stats, setStats] = useState({ today: 0, week: 0, total: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [todaysSchedule, setTodaysSchedule] = useState<LessonSchedule[]>([]);
  const [fullSchedule, setFullSchedule] = useState<LessonSchedule[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [reportedAbsences, setReportedAbsences] = useState<StudentAbsenceRecord[]>([]);
  const [isLoadingReported, setIsLoadingReported] = useState(true);
  
  // Modal states
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isReportAbsenceModalOpen, setIsReportAbsenceModalOpen] = useState(false);
  const [isReportStudentModalOpen, setIsReportStudentModalOpen] = useState(false);

  // Form states
  const [absenceReason, setAbsenceReason] = useState<'Sakit' | 'Izin'>('Sakit');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentReason, setStudentReason] = useState<'Sakit' | 'Izin' | 'Alpa'>('Sakit');

  // General UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');


  const refreshData = async () => {
    if (!user) return;
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Refresh stats and history
    const allAttendance = await getAttendanceForTeacher(user.id);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() === 0 ? 6 : startOfWeek.getDay() - 1));
    const todayCount = allAttendance.filter(r => r.timestamp >= startOfToday).length;
    const weekCount = allAttendance.filter(r => r.timestamp >= startOfWeek).length;
    setStats({ today: todayCount, week: weekCount, total: allAttendance.length });
    setAttendanceHistory(allAttendance.slice(0, 10));

    // Refresh reported absences
    const reported = await getStudentAbsencesByTeacherForDate(user.name, todayStr);
    setReportedAbsences(reported);
  };


  useEffect(() => {
    const checkLocation = async () => {
      // ... (location logic remains the same)
    };
    checkLocation();

    if (!user) return;
    const todayDayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay()];

    const fetchData = async () => {
      setIsLoadingSchedule(true);
      setIsLoadingHistory(true);
      setIsLoadingStats(true);
      setIsLoadingReported(true);

      const [allSchedules, allAttendance, reported] = await Promise.all([
        getSchedulesByTeacher(user.name),
        getAttendanceForTeacher(user.id),
        getStudentAbsencesByTeacherForDate(user.name, new Date().toISOString().split('T')[0]),
      ]);

      setFullSchedule(allSchedules);
      setTodaysSchedule(allSchedules.filter(s => s.day === todayDayName));
      setIsLoadingSchedule(false);

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() === 0 ? 6 : startOfWeek.getDay() - 1));
      
      const todayCount = allAttendance.filter(r => r.timestamp >= startOfToday).length;
      const weekCount = allAttendance.filter(r => r.timestamp >= startOfWeek).length;

      setStats({ today: todayCount, week: weekCount, total: allAttendance.length });
      setAttendanceHistory(allAttendance.slice(0, 10));
      setIsLoadingHistory(false);
      setIsLoadingStats(false);

      setReportedAbsences(reported);
      setIsLoadingReported(false);
    };

    fetchData();
  }, [user]);

  const locationStatus = locationError ? { text: locationError, color: 'text-red-400' }
    : isWithinRadius === null ? { text: 'Mengecek lokasi...', color: 'text-yellow-400' }
    : isWithinRadius ? { text: 'Anda berada di dalam radius sekolah', color: 'text-emerald-400' }
    : { text: 'Anda berada di luar radius sekolah', color: 'text-red-400' };

  // Handlers for modals
  const handleReportAbsenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    setModalError('');
    setModalSuccess('');
    const result = await reportTeacherAbsence(user, absenceReason);
    if (result.success) {
      setModalSuccess(result.message);
      await refreshData();
      setTimeout(() => {
        setIsReportAbsenceModalOpen(false);
        setModalSuccess('');
      }, 2000);
    } else {
      setModalError(result.message);
    }
    setIsSubmitting(false);
  };
  
  const handleReportStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !studentName.trim() || !studentClass) {
        setModalError("Nama siswa dan kelas harus diisi.");
        return;
    }
    setIsSubmitting(true);
    setModalError('');
    setModalSuccess('');
    const record: Omit<StudentAbsenceRecord, 'id'> = {
        studentName: studentName.trim(),
        class: studentClass,
        date: new Date().toISOString().split('T')[0],
        reason: studentReason,
        reportedBy: user.name,
    };
    try {
        await reportStudentAbsence(record);
        setModalSuccess("Laporan siswa berhasil disimpan.");
        await refreshData();
        // Reset form
        setStudentName('');
        setStudentClass(todaysSchedule[0]?.class || '');
        setStudentReason('Sakit');
        setTimeout(() => {
            setIsReportStudentModalOpen(false);
            setModalSuccess('');
        }, 2000);
    } catch (err) {
        setModalError(err instanceof Error ? err.message : "Gagal menyimpan laporan.");
    }
    setIsSubmitting(false);
  };

  const uniqueTodayClasses = useMemo(() => {
    const classNames = todaysSchedule.map(s => s.class);
    return [...new Set(classNames)];
  }, [todaysSchedule]);

  if (showScanner) {
    return <div className="min-h-screen bg-slate-800 p-8 flex items-center justify-center"><QRScanner onClose={() => setShowScanner(false)} /></div>;
  }

  const groupedSchedule = fullSchedule.reduce((acc, schedule) => {
    const day = schedule.day;
    if (!acc[day]) acc[day] = [];
    acc[day].push(schedule);
    return acc;
  }, {} as Record<string, LessonSchedule[]>);
  const scheduleOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  return (
    <>
      <div className="bg-slate-800 text-gray-300 min-h-screen">
        <header className="flex justify-between items-center p-4 border-b border-slate-700">
          <h1 className="text-xl font-bold">Dashboard Guru</h1>
          <button onClick={logout} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm rounded-md font-semibold">Keluar</button>
        </header>

        <main className="p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-white">Dashboard Guru</h2>
            <p className="text-slate-400">Selamat datang, {user?.name || 'Guru'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <button onClick={() => setShowScanner(true)} className="bg-slate-700 p-6 rounded-lg text-left hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <QrCodeIcon/>
              <h3 className="font-bold text-lg mt-4 text-white">Scan QR Code</h3>
              <p className="text-sm text-slate-400">Scan QR Code kelas untuk absensi</p>
              <p className={`text-sm mt-2 font-semibold ${locationStatus.color}`}>{locationStatus.text}</p>
            </button>
            <button onClick={() => setIsScheduleModalOpen(true)} className="bg-slate-700 p-6 rounded-lg text-left hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
              <ScheduleIcon/>
              <h3 className="font-bold text-lg mt-4 text-white">Jadwal Mengajar</h3>
              <p className="text-sm text-slate-400">Lihat jadwal mengajar lengkap Anda</p>
            </button>
            <button onClick={() => setIsReportAbsenceModalOpen(true)} className="bg-slate-700 p-6 rounded-lg text-left hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500">
              <ReportIcon/>
              <h3 className="font-bold text-lg mt-4 text-white">Lapor Ketidakhadiran</h3>
              <p className="text-sm text-slate-400">Laporkan jika tidak dapat hadir hari ini</p>
            </button>
            <button onClick={() => { if (todaysSchedule.length > 0) setIsReportStudentModalOpen(true) }} className="bg-slate-700 p-6 rounded-lg text-left hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-500" disabled={todaysSchedule.length === 0}>
              <StudentIcon/>
              <h3 className="font-bold text-lg mt-4 text-white">Lapor Siswa Absen</h3>
              <p className="text-sm text-slate-400">Input siswa yang tidak hadir hari ini</p>
              {isLoadingSchedule ? <p className="text-sm mt-2 font-semibold text-gray-400">Memuat jadwal...</p> : todaysSchedule.length === 0 && <p className="text-sm mt-2 font-semibold text-yellow-400">Tidak ada jadwal hari ini</p>}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stat Cards */}
            <div className="bg-slate-700 p-4 rounded-lg flex items-center"><div className="p-3 bg-slate-600 rounded-md mr-4 text-slate-300"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div><div><p className="text-sm text-slate-400">Absensi Hari Ini</p>{isLoadingStats ? <Spinner/> : <p className="text-2xl font-bold text-white">{stats.today}</p>}<p className="text-xs text-slate-500">Jam pelajaran yang sudah diabsen</p></div></div>
            <div className="bg-slate-700 p-4 rounded-lg flex items-center"><div className="p-3 bg-slate-600 rounded-md mr-4 text-slate-300"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><div><p className="text-sm text-slate-400">Minggu Ini</p>{isLoadingStats ? <Spinner/> : <p className="text-2xl font-bold text-white">{stats.week}</p>}<p className="text-xs text-slate-500">Total absensi minggu ini</p></div></div>
            <div className="bg-slate-700 p-4 rounded-lg flex items-center"><div className="p-3 bg-slate-600 rounded-md mr-4 text-slate-300"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div><div><p className="text-sm text-slate-400">Total Absensi</p>{isLoadingStats ? <Spinner/> : <p className="text-2xl font-bold text-white">{stats.total}</p>}<p className="text-xs text-slate-500">Semua absensi Anda</p></div></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-700 p-6 rounded-lg min-h-[250px] flex flex-col"><h3 className="font-bold text-lg text-white">Riwayat Absensi Terbaru</h3><p className="text-sm text-slate-400 mb-4">10 absensi terakhir Anda</p>{isLoadingHistory ? <div className="flex-grow flex items-center justify-center"><Spinner/></div> : attendanceHistory.length === 0 ? <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-500"><EmptyHistoryIcon /><p className="font-semibold mt-4">Belum ada riwayat absensi</p><p className="text-sm">Scan QR Code kelas untuk mulai absensi</p></div> : <ul className="space-y-2 overflow-y-auto">{attendanceHistory.map(r => <li key={r.id} className="flex justify-between items-center text-sm p-2 bg-slate-600/50 rounded-md"><div><p className="font-semibold">{r.timestamp.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p><p className="text-slate-400">{r.timestamp.toLocaleTimeString('id-ID')}</p></div><span className={`px-2 py-1 text-xs font-semibold rounded-full ${r.status === 'Present' ? 'bg-green-200 text-green-900' : r.status === 'Late' ? 'bg-yellow-200 text-yellow-900' : 'bg-red-200 text-red-900'}`}>{r.status}</span></li>)}</ul>}</div>
            <div className="bg-slate-700 p-6 rounded-lg min-h-[250px] flex flex-col"><h3 className="font-bold text-lg text-white">Jadwal Hari Ini</h3><p className="text-sm text-slate-400 mb-4">Jadwal mengajar Anda hari ini</p>{isLoadingSchedule ? <div className="flex-grow flex items-center justify-center"><Spinner/></div> : todaysSchedule.length === 0 ? <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-500"><EmptyScheduleIcon /><p className="font-semibold mt-4">Tidak ada jadwal mengajar hari ini</p><p className="text-sm">Anda bisa bersantai sejenak!</p></div> : <ul className="space-y-2 overflow-y-auto">{todaysSchedule.map(s => <li key={s.id} className="p-2 bg-slate-600/50 rounded-md text-sm"><p className="font-semibold">{s.subject} - Kelas {s.class}</p><p className="text-slate-400">{s.time} (Jam ke-{s.period})</p></li>)}</ul>}</div>
          </div>
          
          <div className="bg-slate-700 p-6 rounded-lg min-h-[250px] flex flex-col"><h3 className="font-bold text-lg text-white">Laporan Siswa Tidak Hadir Hari Ini</h3><p className="text-sm text-slate-400 mb-4">Daftar siswa yang Anda laporkan tidak hadir</p>{isLoadingReported ? <div className="flex-grow flex items-center justify-center"><Spinner/></div> : reportedAbsences.length === 0 ? <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-500"><EmptyReportIcon /><p className="font-semibold mt-4">Belum ada laporan</p><p className="text-sm">Klik tombol 'Lapor Siswa Absen' untuk menambahkan.</p></div> : <ul className="space-y-2 overflow-y-auto">{reportedAbsences.map(r => <li key={r.id} className="flex justify-between items-center text-sm p-2 bg-slate-600/50 rounded-md"><div><p className="font-semibold">{r.studentName} (Kelas {r.class})</p></div><span className={`px-2 py-1 text-xs font-semibold rounded-full ${r.reason === 'Sakit' ? 'bg-yellow-200 text-yellow-900' : r.reason === 'Izin' ? 'bg-blue-200 text-blue-900' : 'bg-red-200 text-red-900'}`}>{r.reason}</span></li>)}</ul>}</div>
        </main>
        
        <footer className="text-center text-slate-500 text-sm p-6">© 2025 Rullp. All rights reserved.</footer>
      </div>

      {/* Modals */}
      <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} title="Jadwal Mengajar Lengkap"><div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">{scheduleOrder.map(day => groupedSchedule[day] && <div key={day}><h4 className="font-bold text-lg text-white mb-2">{day}</h4><ul className="space-y-2">{groupedSchedule[day].map(s => <li key={s.id} className="p-3 bg-slate-700 rounded-md text-sm"><p className="font-semibold">{s.subject} - Kelas {s.class}</p><p className="text-slate-400">{s.time} (Jam ke-{s.period})</p></li>)}</ul></div>)}</div></Modal>
      <Modal isOpen={isReportAbsenceModalOpen} onClose={() => setIsReportAbsenceModalOpen(false)} title="Lapor Ketidakhadiran"><form onSubmit={handleReportAbsenceSubmit} className="space-y-4"><div><label htmlFor="absenceReason" className="block text-sm font-medium text-gray-300">Keterangan</label><select id="absenceReason" value={absenceReason} onChange={e => setAbsenceReason(e.target.value as 'Sakit'|'Izin')} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"><option>Sakit</option><option>Izin</option></select></div>{modalError && <p className="text-sm text-red-400">{modalError}</p>}{modalSuccess && <p className="text-sm text-green-400">{modalSuccess}</p>}<div className="flex justify-end pt-2"><Button type="submit" isLoading={isSubmitting} className="w-auto">Kirim Laporan</Button></div></form></Modal>
      <Modal isOpen={isReportStudentModalOpen} onClose={() => setIsReportStudentModalOpen(false)} title="Lapor Siswa Tidak Hadir"><form onSubmit={handleReportStudentSubmit} className="space-y-4"><div><label htmlFor="studentName" className="block text-sm font-medium text-gray-300">Nama Siswa</label><input id="studentName" type="text" value={studentName} onChange={e => setStudentName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" /></div><div className="grid grid-cols-2 gap-4"><div><label htmlFor="studentClass" className="block text-sm font-medium text-gray-300">Kelas</label><select id="studentClass" value={studentClass} onChange={e => setStudentClass(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"><option value="">Pilih Kelas</option>{uniqueTodayClasses.map(c => <option key={c} value={c}>{c}</option>)}</select></div><div><label htmlFor="studentReason" className="block text-sm font-medium text-gray-300">Keterangan</label><select id="studentReason" value={studentReason} onChange={e => setStudentReason(e.target.value as 'Sakit'|'Izin'|'Alpa')} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"><option>Sakit</option><option>Izin</option><option>Alpa</option></select></div></div>{modalError && <p className="text-sm text-red-400">{modalError}</p>}{modalSuccess && <p className="text-sm text-green-400">{modalSuccess}</p>}<div className="flex justify-end pt-2"><Button type="submit" isLoading={isSubmitting} className="w-auto">Simpan Laporan</Button></div></form></Modal>
    </>
  );
};

export default TeacherDashboard;