import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isWithinSchoolRadius, getCurrentPosition } from '../../services/locationService';
import QRScanner from './QRScanner';
import { getSchedulesByTeacher, reportStudentAbsence, getStudentAbsencesByTeacherForDate, getAllClasses, addLessonSchedule } from '../../services/dataService';
import { getAttendanceForTeacher, reportTeacherAbsence, recordAttendance } from '../../services/attendanceService';
import { LessonSchedule, AttendanceRecord, StudentAbsenceRecord, Class } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

// SVG Icons for the dashboard
const LocationIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
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
  const [isSelectScheduleModalOpen, setIsSelectScheduleModalOpen] = useState(false);

  // Form states
  const [absenceReason, setAbsenceReason] = useState<'Sakit' | 'Izin'>('Sakit');
  const [absencePeriods, setAbsencePeriods] = useState('');
  const [absenceDescription, setAbsenceDescription] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentReason, setStudentReason] = useState<'Sakit' | 'Izin' | 'Alpa'>('Sakit');

  // General UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [scannedQrData, setScannedQrData] = useState<string | null>(null);

  // State for adding schedule
  const [newScheduleData, setNewScheduleData] = useState({
      day: 'Senin',
      time: '',
      subject: '',
      class: '',
      period: 1, // Store as number for type consistency
  });
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);


  const refreshData = async () => {
    if (!user) return;
    setIsLoadingStats(true);
    setIsLoadingHistory(true);
    setIsLoadingReported(true);

    const todayStr = new Date().toISOString().split('T')[0];
    
    // Refresh stats and history
    const allAttendance = await getAttendanceForTeacher(user.id);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() === 0 ? 6 : startOfWeek.getDay() - 1));
    const todayCount = allAttendance.filter(r => r.timestamp >= startOfToday && r.scheduleId).length;
    const weekCount = allAttendance.filter(r => r.timestamp >= startOfWeek).length;
    setStats({ today: todayCount, week: weekCount, total: allAttendance.length });
    setAttendanceHistory(allAttendance); // Fetch all history for accurate checks

    // Refresh reported absences
    const reported = await getStudentAbsencesByTeacherForDate(user.id, todayStr);
    setReportedAbsences(reported);

    setIsLoadingStats(false);
    setIsLoadingHistory(false);
    setIsLoadingReported(false);
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
      try {
        const [allSchedules, allAttendance, reported, classesData] = await Promise.all([
          getSchedulesByTeacher(user.id),
          getAttendanceForTeacher(user.id),
          getStudentAbsencesByTeacherForDate(user.id, new Date().toISOString().split('T')[0]),
          getAllClasses(),
        ]);

        setFullSchedule(allSchedules);
        setTodaysSchedule(allSchedules.filter(s => s.day === todayDayName));
        setAvailableClasses(classesData);
        
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() === 0 ? 6 : startOfWeek.getDay() - 1));
        
        const todayCount = allAttendance.filter(r => r.timestamp >= startOfToday && r.scheduleId).length;
        const weekCount = allAttendance.filter(r => r.timestamp >= startOfWeek).length;

        setStats({ today: todayCount, week: weekCount, total: allAttendance.length });
        setAttendanceHistory(allAttendance);
        
        setReportedAbsences(reported);
      } catch (error) {
        console.error("Failed to fetch teacher dashboard data:", error);
      } finally {
        setIsLoadingSchedule(false);
        setIsLoadingHistory(false);
        setIsLoadingStats(false);
        setIsLoadingReported(false);
      }
    };

    fetchData();
  }, [user]);

    const attendedTodaySet = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        return new Set(
            attendanceHistory
                .filter(r => r.date === todayStr && r.scheduleId)
                .map(r => r.scheduleId)
        );
    }, [attendanceHistory]);

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

    let detailedReason = `Pelajaran Ke: ${absencePeriods || 'Semua'}.`;
    if (absenceDescription) {
      detailedReason += ` Keterangan: ${absenceDescription}`;
    }

    const result = await reportTeacherAbsence(user, absenceReason, detailedReason);
    if (result.success) {
      setModalSuccess(result.message);
      await refreshData();
      setTimeout(() => {
        setIsReportAbsenceModalOpen(false);
        setModalSuccess('');
        setAbsencePeriods('');
        setAbsenceDescription('');
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
        teacherId: user.id, // FIX: Added teacherId for robust security rules
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

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewScheduleData(prev => ({
        ...prev,
        // Ensure period is always stored as a number. An empty input becomes 0 for validation.
        [name]: name === 'period' ? (parseInt(value, 10) || 0) : value,
    }));
  };

  const handleAddScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    setModalError('');
    
    const scheduleToAdd = {
        ...newScheduleData,
        teacher: user.name,
        teacherId: user.id,
    };

    if (!scheduleToAdd.time || !scheduleToAdd.subject || !scheduleToAdd.class || scheduleToAdd.period <= 0) {
        setModalError("Semua kolom harus diisi dengan benar. Pastikan 'Jam Ke-' lebih dari 0.");
        setIsSubmitting(false);
        return;
    }

    try {
        await addLessonSchedule(scheduleToAdd as Omit<LessonSchedule, 'id'>);
        
        // Refetch schedule data
        const todayDayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay()];
        const allSchedules = await getSchedulesByTeacher(user.id);
        setFullSchedule(allSchedules);
        setTodaysSchedule(allSchedules.filter(s => s.day === todayDayName));
        
        // Reset form
        setNewScheduleData({ day: 'Senin', time: '', subject: '', class: '', period: 1 });
        setModalError('');
    } catch (err) {
        setModalError("Gagal menambahkan jadwal pelajaran baru. Silakan coba lagi.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleScanSuccess = (qrData: string) => {
    setShowScanner(false);
    setScannedQrData(qrData);
    setIsSelectScheduleModalOpen(true);
    setModalError('');
    setModalSuccess('');
  };

  const handleSelectScheduleForAttendance = async (schedule: LessonSchedule) => {
    if (!user || !scannedQrData) return;
    setIsSubmitting(true);
    setModalError('');
    setModalSuccess('');

    const scheduleInfo = {
      id: schedule.id,
      subject: schedule.subject,
      class: schedule.class,
      period: schedule.period
    };

    const result = await recordAttendance(user, scannedQrData, scheduleInfo);

    if (result.success) {
      setModalSuccess(result.message);
      await refreshData();
      setTimeout(() => {
        setIsSelectScheduleModalOpen(false);
        setScannedQrData(null);
        setModalSuccess('');
      }, 2000);
    } else {
      setModalError(result.message);
    }

    setIsSubmitting(false);
  };


  const uniqueTodayClasses = useMemo(() => {
    const classNames = todaysSchedule.map(s => s.class);
    return [...new Set(classNames)];
  }, [todaysSchedule]);

  if (showScanner) {
    return <div className="min-h-screen bg-slate-800 p-8 flex items-center justify-center"><QRScanner onScanSuccess={handleScanSuccess} onClose={() => setShowScanner(false)} /></div>;
  }

  const groupedSchedule = fullSchedule.reduce((acc, schedule) => {
    const day = schedule.day;
    if (!acc[day]) acc[day] = [];
    acc[day].push(schedule);
    return acc;
  }, {} as Record<string, LessonSchedule[]>);
  const scheduleOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

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
              <p className="text-sm text-slate-400">Lihat & tambah jadwal mengajar Anda</p>
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
            <div className="bg-slate-700 p-4 rounded-lg flex items-center"><div className="p-3 bg-slate-600 rounded-md mr-4 text-slate-300"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div><div><p className="text-sm text-slate-400">Total Absensi</p>{isLoadingStats ? <Spinner/> : <p className="text-2xl font-bold text-white">{stats.total}</p>}<p className="text-xs text-slate-500">Sepanjang waktu</p></div></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Schedule */}
            <div className="bg-slate-700 p-6 rounded-lg">
              <h3 className="font-bold text-lg text-white mb-4">Jadwal Hari Ini</h3>
              {isLoadingSchedule ? <Spinner/> : todaysSchedule.length > 0 ? (
                <ul className="space-y-3">
                  {todaysSchedule.map(s => {
                    const isAttended = attendedTodaySet.has(s.id);
                    return (
                      <li key={s.id} className={`flex justify-between items-center p-3 rounded-md transition-colors ${isAttended ? 'bg-slate-800 opacity-60' : 'bg-slate-600/50'}`}>
                        <div>
                          <p className={`font-semibold ${isAttended ? 'text-slate-400' : 'text-white'}`}>{s.subject} <span className="text-slate-400 font-normal">- Jam ke-{s.period}</span></p>
                          <p className="text-sm text-slate-400">{s.class} • {s.time}</p>
                        </div>
                        {isAttended ? <CheckCircleIcon /> : <span className="px-2 py-1 text-xs font-semibold text-blue-200 bg-blue-500/30 rounded-full">Pelajaran</span>}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-center py-8">
                  <EmptyScheduleIcon/>
                  <p className="mt-4 text-slate-400">Tidak ada jadwal mengajar hari ini.</p>
                </div>
              )}
            </div>
            
            {/* History */}
            <div className="bg-slate-700 p-6 rounded-lg">
              <h3 className="font-bold text-lg text-white mb-4">Riwayat Absensi Terkini</h3>
              {isLoadingHistory ? <Spinner/> : attendanceHistory.length > 0 ? (
                <ul className="space-y-3">
                  {attendanceHistory.slice(0, 10).map(r => (
                    <li key={r.id} className="flex justify-between items-center bg-slate-600/50 p-3 rounded-md">
                      <div>
                        <p className="font-semibold text-white">{r.subject ? `${r.subject} (${r.class})` : new Date(r.timestamp).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        <p className="text-sm text-slate-400">{new Date(r.timestamp).toLocaleTimeString('id-ID')}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${r.status === 'Present' ? 'bg-emerald-500/30 text-emerald-200' : 'bg-yellow-500/30 text-yellow-200'}`}>{r.status}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                 <div className="text-center py-8">
                  <EmptyHistoryIcon/>
                  <p className="mt-4 text-slate-400">Belum ada riwayat absensi.</p>
                </div>
              )}
            </div>

             {/* Reported Student Absences */}
            <div className="bg-slate-700 p-6 rounded-lg lg:col-span-2">
              <h3 className="font-bold text-lg text-white mb-4">Siswa Absen Dilaporkan Hari Ini</h3>
              {isLoadingReported ? <Spinner/> : reportedAbsences.length > 0 ? (
                 <ul className="space-y-3">
                  {reportedAbsences.map(r => (
                    <li key={r.id} className="flex justify-between items-center bg-slate-600/50 p-3 rounded-md">
                      <div>
                        <p className="font-semibold text-white">{r.studentName} <span className="text-slate-400 font-normal">({r.class})</span></p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${r.reason === 'Sakit' ? 'bg-yellow-500/30 text-yellow-200' : r.reason === 'Izin' ? 'bg-blue-500/30 text-blue-200' : 'bg-red-500/30 text-red-200'}`}>{r.reason}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8">
                  <EmptyReportIcon/>
                  <p className="mt-4 text-slate-400">Belum ada siswa yang dilaporkan absen hari ini.</p>
                </div>
              )}
            </div>
          </div>
          <footer className="text-center text-gray-500 text-sm pt-4">
            © 2025 Rullp. All rights reserved.
          </footer>
        </main>
      </div>

      {/* --- MODALS --- */}

      {/* Full Schedule Modal */}
      <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} title="Jadwal Mengajar Lengkap">
        <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-2">
            <form onSubmit={handleAddScheduleSubmit} className="space-y-4 p-4 mb-4 border border-slate-700 rounded-lg bg-slate-900/50">
                <h4 className="font-bold text-lg text-white">Tambah Jadwal Baru</h4>
                 <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Hari</label>
                    <select name="day" value={newScheduleData.day} onChange={handleFormChange} className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Waktu (JJ:MM - JJ:MM)</label>
                    <input type="text" name="time" value={newScheduleData.time} onChange={handleFormChange} className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="07:20 - 08:30" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Mata Pelajaran</label>
                    <input type="text" name="subject" value={newScheduleData.subject} onChange={handleFormChange} className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Matematika" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Kelas</label>
                    <select name="class" value={newScheduleData.class} onChange={handleFormChange} className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Pilih Kelas</option>
                        {availableClasses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Jam Ke-</label>
                    <input type="number" name="period" value={newScheduleData.period === 0 ? '' : newScheduleData.period} onChange={handleFormChange} className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" min="1" />
                </div>

                {modalError && <p className="text-sm text-red-500 pt-1">{modalError}</p>}
                
                <div className="pt-2">
                    <Button type="submit" isLoading={isSubmitting} className="w-full">Simpan Jadwal</Button>
                </div>
            </form>

          {isLoadingSchedule ? <Spinner/> : scheduleOrder.map(day => groupedSchedule[day] && (
            <div key={day}>
              <h4 className="font-bold text-lg text-white sticky top-0 bg-slate-800 py-2">{day}</h4>
              <ul className="space-y-2 mt-2">
                {groupedSchedule[day].map(s => (
                   <li key={s.id} className="flex justify-between items-center bg-slate-700 p-3 rounded-md">
                      <div>
                        <p className="font-semibold text-white">{s.subject} <span className="text-slate-400 font-normal">- Jam ke-{s.period}</span></p>
                        <p className="text-sm text-slate-400">{s.class} • {s.time}</p>
                      </div>
                    </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Modal>

      {/* Report Absence Modal */}
      <Modal isOpen={isReportAbsenceModalOpen} onClose={() => setIsReportAbsenceModalOpen(false)} title="Lapor Ketidakhadiran">
         <form onSubmit={handleReportAbsenceSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">Alasan Tidak Hadir</label>
              <select value={absenceReason} onChange={(e) => setAbsenceReason(e.target.value as 'Sakit' | 'Izin')} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white">
                <option value="Sakit">Sakit</option>
                <option value="Izin">Izin</option>
              </select>
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-300">Pelajaran Ke- (Opsional)</label>
              <input type="text" value={absencePeriods} onChange={e => setAbsencePeriods(e.target.value)} placeholder="Contoh: 1-4" className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"/>
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-300">Keterangan Tambahan (Opsional)</label>
              <input type="text" value={absenceDescription} onChange={e => setAbsenceDescription(e.target.value)} placeholder="Contoh: Ada acara keluarga" className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"/>
            </div>
             {modalError && <p className="text-sm text-red-400">{modalError}</p>}
            {modalSuccess && <p className="text-sm text-green-400">{modalSuccess}</p>}
            <div className="flex justify-end pt-2">
              <Button type="submit" isLoading={isSubmitting} className="w-full">Kirim Laporan</Button>
            </div>
        </form>
      </Modal>

      {/* Report Student Absence Modal */}
      <Modal isOpen={isReportStudentModalOpen} onClose={() => setIsReportStudentModalOpen(false)} title="Lapor Siswa Tidak Hadir">
         <form onSubmit={handleReportStudentSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">Nama Lengkap Siswa</label>
              <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"/>
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-300">Kelas</label>
              <select value={studentClass} onChange={e => setStudentClass(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white">
                <option value="">Pilih Kelas</option>
                {uniqueTodayClasses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">Alasan</label>
              <select value={studentReason} onChange={(e) => setStudentReason(e.target.value as 'Sakit' | 'Izin' | 'Alpa')} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white">
                <option value="Sakit">Sakit</option>
                <option value="Izin">Izin</option>
                <option value="Alpa">Alpa</option>
              </select>
            </div>
            {modalError && <p className="text-sm text-red-400">{modalError}</p>}
            {modalSuccess && <p className="text-sm text-green-400">{modalSuccess}</p>}
            <div className="flex justify-end pt-2">
              <Button type="submit" isLoading={isSubmitting} className="w-full">Simpan Laporan</Button>
            </div>
        </form>
      </Modal>
      
      {/* Select Schedule for Attendance Modal */}
      <Modal isOpen={isSelectScheduleModalOpen} onClose={() => setIsSelectScheduleModalOpen(false)} title="Pilih Jadwal untuk Absen">
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-slate-400">Pilih pelajaran yang sedang Anda absen saat ini.</p>
          {todaysSchedule.length > 0 ? (
            todaysSchedule.map(schedule => {
              const isAttended = attendedTodaySet.has(schedule.id);
              return (
                <button
                  key={schedule.id}
                  onClick={() => handleSelectScheduleForAttendance(schedule)}
                  disabled={isAttended || isSubmitting}
                  className="w-full text-left p-4 rounded-lg flex justify-between items-center transition-colors bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div>
                    <p className="font-semibold text-white">{schedule.subject}</p>
                    <p className="text-sm text-slate-300">{schedule.class} - Jam ke-{schedule.period}</p>
                  </div>
                  {isAttended && <span className="text-sm font-semibold text-emerald-400">Sudah Absen</span>}
                </button>
              );
            })
          ) : (
            <p className="text-center text-slate-400 py-4">Tidak ada jadwal untuk dipilih.</p>
          )}

          {modalError && <p className="text-sm text-red-400 pt-2">{modalError}</p>}
          {modalSuccess && <p className="text-sm text-green-400 pt-2">{modalSuccess}</p>}
          {isSubmitting && <Spinner />}
        </div>
      </Modal>

    </>
  );
};

export default TeacherDashboard;