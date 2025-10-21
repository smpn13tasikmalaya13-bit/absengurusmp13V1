import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isWithinSchoolRadius, getCurrentPosition } from '../../services/locationService';
import QRScanner from './QRScanner';
import { getSchedulesByTeacher, reportStudentAbsence, getStudentAbsencesByTeacher, getAllClasses, addLessonSchedule, checkScheduleConflict, getStudentAbsencesByTeacherForDate, uploadProfilePhoto, updateUserProfile } from '../../services/dataService';
import { getAttendanceForTeacher, reportTeacherAbsence, recordAttendance } from '../../services/attendanceService';
import { LessonSchedule, AttendanceRecord, StudentAbsenceRecord, Class, Role, User } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

// SVG Icons for the dashboard & navbar
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const StudentHistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
const ProfileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
const ScanIcon = () => <svg className="h-12 w-12 text-indigo-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 3H4C3.44772 3 3 3.44772 3 4V7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 3H20C20.5523 3 21 3.44772 21 4V7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 21H4C3.44772 21 3 20.5523 3 20V17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 21H20C20.5523 21 21 20.5523 21 20V17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 8V16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 12H16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ScheduleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const ReportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const StudentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const EmptyHistoryIcon = () => <svg className="h-16 w-16 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /><rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="4 4"/></svg>;
const EmptyScheduleIcon = () => <svg className="h-16 w-16 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const EmptyReportIcon = () => <svg className="h-16 w-16 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;

const TeacherDashboard: React.FC = () => {
  const { user, logout, updateUserContext } = useAuth();
  const [activeView, setActiveView] = useState('beranda');
  const [showScanner, setShowScanner] = useState(false);
  const [isWithinRadius, setIsWithinRadius] = useState<boolean | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Dynamic data states
  const [stats, setStats] = useState({ today: 0, week: 0, total: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [todaysSchedule, setTodaysSchedule] = useState<LessonSchedule[]>([]);
  const [fullSchedule, setFullSchedule] = useState<LessonSchedule[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [reportedAbsences, setReportedAbsences] = useState<StudentAbsenceRecord[]>([]);
  const [allStudentAbsences, setAllStudentAbsences] = useState<StudentAbsenceRecord[]>([]);
  const [isLoadingReported, setIsLoadingReported] = useState(true);
  
  // Modal states
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isReportAbsenceModalOpen, setIsReportAbsenceModalOpen] = useState(false);
  const [isReportStudentModalOpen, setIsReportStudentModalOpen] = useState(false);
  const [isSelectScheduleModalOpen, setIsSelectScheduleModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);


  // Form states
  const [absenceReason, setAbsenceReason] = useState<'Sakit' | 'Izin' | 'Tugas Luar'>('Sakit');
  const [absencePeriods, setAbsencePeriods] = useState('');
  const [absenceDescription, setAbsenceDescription] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentReason, setStudentReason] = useState<'Sakit' | 'Izin' | 'Alpa'>('Sakit');
  const [studentAbsentPeriods, setStudentAbsentPeriods] = useState<number[]>([]);
  
  // Profile form states
  const [profileData, setProfileData] = useState<Partial<User>>({});
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);


  // General UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [scannedQrData, setScannedQrData] = useState<string | null>(null);

  // State for adding schedule
  const [newScheduleData, setNewScheduleData] = useState({
      day: 'Senin',
      startTime: '',
      endTime: '',
      subject: '',
      class: '',
      period: 1,
  });
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);


  const refreshData = async () => {
    if (!user) return;
    setIsLoadingStats(true);
    setIsLoadingHistory(true);
    setIsLoadingReported(true);
    setDashboardError(null); 

    try {
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

        const allReported = await getStudentAbsencesByTeacher(user.id);
        setAllStudentAbsences(allReported);
    } catch (error) {
        console.error("Failed to refresh data:", error);
        setDashboardError(error instanceof Error ? error.message : 'Gagal memuat ulang data.');
    } finally {
        setIsLoadingStats(false);
        setIsLoadingHistory(false);
        setIsLoadingReported(false);
    }
  };


  useEffect(() => {
    const checkLocation = async () => {
      try {
        setLocationError(null);
        const position = await getCurrentPosition();
        if (isWithinSchoolRadius(position.coords)) {
          setIsWithinRadius(true);
        } else {
          setIsWithinRadius(false);
        }
      } catch (error) {
        setIsWithinRadius(false);
        setLocationError('Gagal mendapatkan lokasi. Aktifkan GPS.');
      }
    };
    checkLocation();

    if (!user) return;
    const todayDayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay()];

    const fetchData = async () => {
      setIsLoadingSchedule(true);
      setIsLoadingHistory(true);
      setIsLoadingStats(true);
      setIsLoadingReported(true);
      setDashboardError(null);
      try {
        const [allSchedules, allAttendance, reported, classesData, allReportedStudents] = await Promise.all([
          getSchedulesByTeacher(user.id),
          getAttendanceForTeacher(user.id),
          getStudentAbsencesByTeacherForDate(user.id, new Date().toISOString().split('T')[0]),
          getAllClasses(),
          getStudentAbsencesByTeacher(user.id)
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
        setAllStudentAbsences(allReportedStudents);
      } catch (error) {
        console.error("Failed to fetch teacher dashboard data:", error);
        setDashboardError(error instanceof Error ? error.message : "Gagal memuat data. Periksa koneksi Anda.");
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
        teacherId: user.id,
        absentPeriods: studentAbsentPeriods,
    };
    try {
        await reportStudentAbsence(record);
        setModalSuccess("Laporan siswa berhasil disimpan.");
        await refreshData();
        // Reset form
        setStudentName('');
        setStudentClass(todaysSchedule[0]?.class || '');
        setStudentReason('Sakit');
        setStudentAbsentPeriods([]);
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
  
  const handleProfileFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };


  const handleStudentPeriodChange = (period: number) => {
    setStudentAbsentPeriods(prev =>
      prev.includes(period)
        ? prev.filter(p => p !== period)
        : [...prev, period].sort((a, b) => a - b)
    );
  };


  const handleAddScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const scheduleToAdd: Omit<LessonSchedule, 'id'> = {
        day: newScheduleData.day,
        time: `${newScheduleData.startTime} - ${newScheduleData.endTime}`,
        subject: newScheduleData.subject,
        class: newScheduleData.class,
        period: newScheduleData.period,
        teacher: user.name,
        teacherId: user.id,
    };

    if (!newScheduleData.startTime || !newScheduleData.endTime || !scheduleToAdd.subject || !scheduleToAdd.class || scheduleToAdd.period <= 0) {
        setModalError("Semua kolom harus diisi dengan benar. Pastikan 'Jam Ke-' lebih dari 0.");
        return;
    }

    setIsSubmitting(true);
    setModalError('');

    try {
        // Check for schedule conflicts before adding
        const conflict = await checkScheduleConflict(scheduleToAdd.day, scheduleToAdd.period, scheduleToAdd.class);
        if (conflict) {
            setModalError(`Jadwal bentrok! Kelas ${conflict.class} jam ke-${conflict.period} pada hari ${conflict.day} sudah diisi oleh ${conflict.teacher} (${conflict.subject}).`);
            setIsSubmitting(false);
            return;
        }

        const newScheduleWithId = await addLessonSchedule(scheduleToAdd);
        
        // Update the full schedule list for the modal
        setFullSchedule(prevSchedules => {
            const updatedSchedules = [...prevSchedules, newScheduleWithId];
            // Sort to maintain order in the modal view
            const dayOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            return updatedSchedules.sort((a, b) => {
                const dayComparison = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
                if (dayComparison !== 0) return dayComparison;
                return a.time.localeCompare(b.time);
            });
        });

        // Update today's schedule list for the dashboard view
        const todayDayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay()];
        if (newScheduleWithId.day === todayDayName) {
            setTodaysSchedule(prevSchedules => {
                const updatedSchedules = [...prevSchedules, newScheduleWithId];
                return updatedSchedules.sort((a, b) => a.time.localeCompare(b.time));
            });
        }
        
        // Reset form
        setNewScheduleData({ day: 'Senin', startTime: '', endTime: '', subject: '', class: '', period: 1 });
        setModalError('');
    } catch (err) {
        setModalError(err instanceof Error ? err.message : "Gagal menambahkan jadwal. Coba lagi.");
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
  
  const handleEditProfile = () => {
    if (user) {
        setProfileData(user); // Pre-fill with existing user data
        setPhotoPreview(user.photoURL || null); // Show current photo
        setProfilePhotoFile(null); // Clear any previous selection
        setModalError('');
        setModalSuccess('');
        setIsEditProfileModalOpen(true);
    }
  };

  const handleProfileUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setModalError('');
    setModalSuccess('');

    try {
        let photoURL = user.photoURL; // Start with the existing photo URL

        // If a new photo file is selected, upload it
        if (profilePhotoFile) {
            photoURL = await uploadProfilePhoto(profilePhotoFile, user.id);
        }

        // Prepare data for Firestore update, excluding fields that shouldn't be there
        const { id, boundDeviceId, email, role, ...updatableProfileData } = profileData;
        const dataToUpdate = { ...updatableProfileData, photoURL: photoURL || null };

        // Update Firestore
        await updateUserProfile(user.id, dataToUpdate);
        
        // Update local context to reflect changes immediately
        updateUserContext(dataToUpdate);

        setModalSuccess('Profil berhasil diperbarui!');
        setTimeout(() => {
            setIsEditProfileModalOpen(false);
            setModalSuccess('');
        }, 2000);
    } catch (err) {
        setModalError(err instanceof Error ? err.message : 'Gagal memperbarui profil.');
    } finally {
        setIsSubmitting(false);
    }
  };



  const uniqueTodayClasses = useMemo(() => {
    const classNames = todaysSchedule.map(s => s.class);
    return [...new Set(classNames)];
  }, [todaysSchedule]);

  if (showScanner) {
    return <div className="min-h-screen bg-slate-900 p-8 flex items-center justify-center"><QRScanner onScanSuccess={handleScanSuccess} onClose={() => setShowScanner(false)} /></div>;
  }

  const groupedSchedule = fullSchedule.reduce((acc, schedule) => {
    const day = schedule.day;
    if (!acc[day]) acc[day] = [];
    acc[day].push(schedule);
    return acc;
  }, {} as Record<string, LessonSchedule[]>);
  const scheduleOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  
  const getRoleBadgeClass = (role: Role) => {
    switch (role) {
      case Role.Admin:
        return 'bg-purple-500/30 text-purple-300';
      case Role.Teacher:
        return 'bg-blue-500/30 text-blue-300';
      case Role.Coach:
        return 'bg-green-500/30 text-green-300';
      case Role.AdministrativeStaff:
        return 'bg-slate-500/30 text-slate-300';
      default:
        return 'bg-gray-500/30 text-gray-300';
    }
  };
  
  const BerandaContent = () => (
    <>
      {dashboardError && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-300 text-sm p-4 rounded-lg mb-6">
          <p className="font-bold">Gagal Memuat Data</p>
          <p>{dashboardError}</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <button onClick={() => setShowScanner(true)} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl text-left hover:border-indigo-500 hover:bg-slate-800/80 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed group" disabled={isWithinRadius !== true}>
          <ScanIcon/>
          <h3 className="font-bold text-lg mt-4 text-white">Scan QR Code</h3>
          <p className="text-sm text-slate-400 mt-1">Scan QR Code kelas untuk absensi</p>
          <p className={`text-sm mt-2 font-semibold ${locationStatus.color}`}>{locationStatus.text}</p>
        </button>
        <button onClick={() => setIsScheduleModalOpen(true)} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl text-left hover:border-blue-500 hover:bg-slate-800/80 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <ScheduleIcon/>
          <h3 className="font-bold text-lg mt-4 text-white">Jadwal Mengajar</h3>
          <p className="text-sm text-slate-400 mt-1">Lihat & tambah jadwal mengajar Anda</p>
        </button>
        <button onClick={() => setIsReportAbsenceModalOpen(true)} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl text-left hover:border-yellow-500 hover:bg-slate-800/80 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-yellow-500">
          <ReportIcon/>
          <h3 className="font-bold text-lg mt-4 text-white">Lapor Ketidakhadiran</h3>
          <p className="text-sm text-slate-400 mt-1">Laporkan jika tidak dapat hadir hari ini</p>
        </button>
        <button onClick={() => { if (todaysSchedule.length > 0) setIsReportStudentModalOpen(true) }} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl text-left hover:border-orange-500 hover:bg-slate-800/80 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed" disabled={todaysSchedule.length === 0}>
          <StudentIcon/>
          <h3 className="font-bold text-lg mt-4 text-white">Lapor Siswa Absen</h3>
          <p className="text-sm text-slate-400 mt-1">Input siswa yang tidak hadir hari ini</p>
          {isLoadingSchedule ? <p className="text-xs mt-2 font-semibold text-gray-400">Memuat jadwal...</p> : todaysSchedule.length === 0 && <p className="text-xs mt-2 font-semibold text-yellow-400">Tidak ada jadwal hari ini</p>}
        </button>
      </div>
        
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-5 rounded-xl flex items-center"><div className="p-3 bg-slate-700 rounded-lg mr-4 text-slate-300"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div><div><p className="text-sm text-slate-400">Absensi Hari Ini</p>{isLoadingStats ? <div className="h-7 w-10 bg-slate-700 rounded-md animate-pulse mt-1"></div> : <p className="text-2xl font-bold text-white">{stats.today}</p>}</div></div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-5 rounded-xl flex items-center"><div className="p-3 bg-slate-700 rounded-lg mr-4 text-slate-300"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><div><p className="text-sm text-slate-400">Minggu Ini</p>{isLoadingStats ? <div className="h-7 w-10 bg-slate-700 rounded-md animate-pulse mt-1"></div> : <p className="text-2xl font-bold text-white">{stats.week}</p>}</div></div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-5 rounded-xl flex items-center"><div className="p-3 bg-slate-700 rounded-lg mr-4 text-slate-300"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div><div><p className="text-sm text-slate-400">Total Absensi</p>{isLoadingStats ? <div className="h-7 w-10 bg-slate-700 rounded-md animate-pulse mt-1"></div> : <p className="text-2xl font-bold text-white">{stats.total}</p>}</div></div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl">
          <h3 className="font-bold text-lg text-white mb-4">Jadwal Hari Ini</h3>
          {isLoadingSchedule ? <Spinner/> : todaysSchedule.length > 0 ? (
            <ul className="space-y-3">
              {todaysSchedule.map(s => {
                const isAttended = attendedTodaySet.has(s.id);
                return (
                  <li key={s.id} className={`flex justify-between items-center p-4 rounded-lg transition-colors ${isAttended ? 'bg-slate-800 opacity-60' : 'bg-slate-700/50'}`}>
                    <div>
                      <p className={`font-semibold text-base ${isAttended ? 'text-slate-400 line-through' : 'text-white'}`}>{s.subject} <span className="text-slate-400 font-normal">- Jam ke-{s.period}</span></p>
                      <p className="text-sm text-slate-400">{s.class} • {s.time}</p>
                    </div>
                    {isAttended ? <CheckCircleIcon /> : <span className="px-2 py-1 text-xs font-semibold text-blue-300 bg-blue-500/30 rounded-full">Belum Absen</span>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-10">
              <EmptyScheduleIcon/>
              <p className="mt-4 text-slate-400">Tidak ada jadwal mengajar hari ini.</p>
            </div>
          )}
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl">
          <h3 className="font-bold text-lg text-white mb-4">Riwayat Absensi Terkini</h3>
          {isLoadingHistory ? <Spinner/> : attendanceHistory.length > 0 ? (
            <ul className="space-y-3">
              {attendanceHistory.slice(0, 5).map(r => (
                <li key={r.id} className="flex justify-between items-center bg-slate-700/50 p-4 rounded-lg">
                  <div>
                    <p className="font-semibold text-white">{r.subject ? `${r.subject} (${r.class})` : new Date(r.timestamp).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    <p className="text-sm text-slate-400">{new Date(r.timestamp).toLocaleString('id-ID')}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${r.status === 'Present' ? 'bg-emerald-500/30 text-emerald-200' : r.status === 'Late' ? 'bg-yellow-500/30 text-yellow-200' : 'bg-red-500/30 text-red-200'}`}>{r.status}</span>
                </li>
              ))}
            </ul>
          ) : (
              <div className="text-center py-10">
              <EmptyHistoryIcon/>
              <p className="mt-4 text-slate-400">Belum ada riwayat absensi.</p>
            </div>
          )}
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl lg:col-span-2">
          <h3 className="font-bold text-lg text-white mb-4">Siswa Absen Dilaporkan Hari Ini</h3>
          {isLoadingReported ? <Spinner/> : reportedAbsences.length > 0 ? (
              <ul className="space-y-3">
              {reportedAbsences.map(r => (
                <li key={r.id} className="flex justify-between items-center bg-slate-700/50 p-4 rounded-lg">
                  <div>
                    <p className="font-semibold text-white">{r.studentName} <span className="text-slate-400 font-normal">({r.class})</span></p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${r.reason === 'Sakit' ? 'bg-yellow-500/30 text-yellow-200' : r.reason === 'Izin' ? 'bg-blue-500/30 text-blue-200' : 'bg-red-500/30 text-red-200'}`}>{r.reason}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-10">
              <EmptyReportIcon/>
              <p className="mt-4 text-slate-400">Belum ada siswa yang dilaporkan absen hari ini.</p>
            </div>
          )}
        </div>
      </div>
      <footer className="text-center text-slate-500 text-sm pt-4">
        © 2024 HadirKu. All rights reserved.
      </footer>
    </>
  );

  const RiwayatAbsenContent = () => (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl">
        <h3 className="font-bold text-lg text-white mb-4">Semua Riwayat Absensi</h3>
        {isLoadingHistory ? <Spinner/> : attendanceHistory.length > 0 ? (
        <ul className="space-y-3 max-h-[60vh] overflow-y-auto">
            {attendanceHistory.map(r => (
            <li key={r.id} className="flex justify-between items-center bg-slate-700/50 p-4 rounded-lg">
                <div>
                <p className="font-semibold text-white">{r.subject ? `${r.subject} (${r.class})` : new Date(r.timestamp).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <p className="text-sm text-slate-400">{new Date(r.timestamp).toLocaleString('id-ID')}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${r.status === 'Present' ? 'bg-emerald-500/30 text-emerald-200' : r.status === 'Late' ? 'bg-yellow-500/30 text-yellow-200' : 'bg-red-500/30 text-red-200'}`}>{r.status}</span>
            </li>
            ))}
        </ul>
        ) : (
            <div className="text-center py-10">
            <EmptyHistoryIcon/>
            <p className="mt-4 text-slate-400">Belum ada riwayat absensi.</p>
        </div>
        )}
    </div>
  );

  const RiwayatSiswaContent = () => (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl">
        <h3 className="font-bold text-lg text-white mb-4">Semua Riwayat Laporan Siswa</h3>
        {isLoadingReported ? <Spinner/> : allStudentAbsences.length > 0 ? (
            <ul className="space-y-3 max-h-[60vh] overflow-y-auto">
            {allStudentAbsences.map(r => (
                <li key={r.id} className="flex justify-between items-center bg-slate-700/50 p-4 rounded-lg">
                <div>
                    <p className="font-semibold text-white">{r.studentName} <span className="text-slate-400 font-normal">({r.class})</span></p>
                    <p className="text-sm text-slate-400">{new Date(r.date).toLocaleDateString('id-ID', { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${r.reason === 'Sakit' ? 'bg-yellow-500/30 text-yellow-200' : r.reason === 'Izin' ? 'bg-blue-500/30 text-blue-200' : 'bg-red-500/30 text-red-200'}`}>{r.reason}</span>
                </li>
            ))}
            </ul>
        ) : (
            <div className="text-center py-10">
                <EmptyReportIcon/>
                <p className="mt-4 text-slate-400">Belum ada siswa yang dilaporkan absen.</p>
            </div>
        )}
    </div>
  );
  
  const ProfilContent = () => (
     <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl">
        <h3 className="font-bold text-lg text-white mb-4">Profil Anda</h3>
        {user && (
             <div className="space-y-4">
                 <div className="flex items-center space-x-4">
                    <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.name.replace(' ', '+')}&background=0f172a&color=cbd5e1`} alt="Profile" className="h-20 w-20 rounded-full object-cover border-2 border-slate-600" />
                    <div>
                        <p className="text-white font-semibold text-xl">{user.name}</p>
                        <p className="text-slate-400 text-sm">{user.email}</p>
                        <span className={`mt-1 inline-block px-3 py-1 text-xs font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>{user.role}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                    <div>
                        <label className="text-sm text-slate-400">Jabatan</label>
                        <p className="text-white font-semibold">{user.position || '-'}</p>
                    </div>
                    <div>
                        <label className="text-sm text-slate-400">Gol/Pangkat</label>
                        <p className="text-white font-semibold">{user.rank || '-'}</p>
                    </div>
                </div>

                <div className="pt-4">
                    <Button onClick={handleEditProfile} variant="primary" className="w-full max-w-xs mx-auto">Ubah Profil</Button>
                </div>
            </div>
        )}
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'beranda': return <BerandaContent />;
      case 'riwayatAbsen': return <RiwayatAbsenContent />;
      case 'riwayatSiswa': return <RiwayatSiswaContent />;
      case 'profil': return <ProfilContent />;
      default: return <BerandaContent />;
    }
  };


  const NavItem = ({ view, label, icon }: { view: string; label: string; icon: React.ReactNode }) => (
    <button onClick={() => setActiveView(view)} className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${activeView === view ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}>
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </button>
  );

  return (
    <>
      <div className="bg-slate-900 text-slate-300 min-h-screen pb-24">
        <header className="flex justify-between items-center p-4 border-b border-slate-700/50 sticky top-0 bg-slate-900/50 backdrop-blur-sm z-10">
            <div className="flex items-center gap-3">
                <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.name.replace(' ', '+')}&background=1e293b&color=cbd5e1&size=128`} alt="Avatar" className="h-10 w-10 rounded-full object-cover"/>
                <div className="text-left">
                    <p className="text-xs text-slate-400 whitespace-nowrap">Selamat datang,</p>
                    <p className="font-semibold text-white -mt-1 whitespace-nowrap">{user?.name}</p>
                </div>
            </div>
            <div className="flex-1 text-center">
                <h2 className="text-xl font-bold text-white capitalize hidden md:block">{activeView === 'riwayatAbsen' ? 'Riwayat Absen' : activeView === 'riwayatSiswa' ? 'Riwayat Siswa' : activeView}</h2>
            </div>
            <div className="flex-1 text-right">
                <button onClick={logout} aria-label="Logout" className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                    </svg>
                </button>
            </div>
        </header>

        <main className="p-6 md:p-8 space-y-6">
          {renderContent()}
        </main>
        
        <footer className="fixed bottom-0 left-0 right-0 bg-slate-800/80 backdrop-blur-lg border-t border-slate-700 z-20 flex justify-around">
            <NavItem view="beranda" label="Beranda" icon={<HomeIcon />} />
            <NavItem view="riwayatAbsen" label="Absensi" icon={<HistoryIcon />} />
            <NavItem view="riwayatSiswa" label="Siswa" icon={<StudentHistoryIcon />} />
            <NavItem view="profil" label="Profil" icon={<ProfileIcon />} />
        </footer>
      </div>

      {/* --- MODALS --- */}
       <Modal isOpen={isEditProfileModalOpen} onClose={() => setIsEditProfileModalOpen(false)} title="Ubah Profil">
         <form onSubmit={handleProfileUpdateSubmit} className="space-y-4">
            <div className="flex items-center space-x-4">
                <img src={photoPreview || `https://ui-avatars.com/api/?name=${profileData.name?.replace(' ', '+')}&background=0f172a&color=cbd5e1`} alt="Preview" className="h-20 w-20 rounded-full object-cover border-2 border-slate-600" />
                <div>
                    <label htmlFor="photo-upload" className="cursor-pointer bg-slate-600 text-white text-sm font-semibold py-2 px-4 rounded-lg hover:bg-slate-500 transition-colors">
                        Unggah Foto
                    </label>
                    <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    <p className="text-xs text-slate-400 mt-2">JPG, PNG. Max 2MB.</p>
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-300">Nama Lengkap & Gelar</label>
                    <input name="name" value={profileData.name || ''} onChange={handleProfileFormChange} type="text" className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"/>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-300">Jabatan</label>
                    <input name="position" value={profileData.position || ''} onChange={handleProfileFormChange} type="text" className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" placeholder="Contoh: Guru Mapel"/>
                 </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300">Gol/Pangkat</label>
                    <input name="rank" value={profileData.rank || ''} onChange={handleProfileFormChange} type="text" className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" placeholder="Contoh: III/d, Penata Tk. I"/>
                </div>
                {(user?.role === Role.Teacher || user?.role === Role.Coach) && (
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Mata Pelajaran</label>
                        <input name="subject" value={profileData.subject || ''} onChange={handleProfileFormChange} type="text" className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" placeholder="Contoh: Matematika"/>
                    </div>
                )}
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-300">Email</label>
                <input value={profileData.email || ''} type="email" disabled className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-400 cursor-not-allowed"/>
             </div>
             {modalError && <p className="text-sm text-red-400">{modalError}</p>}
             {modalSuccess && <p className="text-sm text-green-400">{modalSuccess}</p>}
             <div className="flex justify-end pt-2">
                 <Button type="submit" isLoading={isSubmitting} className="w-full">Simpan Perubahan</Button>
             </div>
         </form>
       </Modal>


      <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} title="Jadwal Mengajar Lengkap">
        <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-2">
            <form onSubmit={handleAddScheduleSubmit} className="space-y-4 p-4 mb-4 border border-slate-700 rounded-lg bg-slate-900/50">
                <h4 className="font-bold text-lg text-white">Tambah Jadwal Baru</h4>
                 <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Hari</label>
                    <select name="day" value={newScheduleData.day} onChange={handleFormChange} className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Waktu Mulai</label>
                        <input type="time" name="startTime" value={newScheduleData.startTime} onChange={handleFormChange} required className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Waktu Selesai</label>
                        <input type="time" name="endTime" value={newScheduleData.endTime} onChange={handleFormChange} required className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Mata Pelajaran</label>
                    <input type="text" name="subject" value={newScheduleData.subject} onChange={handleFormChange} className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Matematika" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Kelas</label>
                    <select name="class" value={newScheduleData.class} onChange={handleFormChange} className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">Pilih Kelas</option>
                        {availableClasses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Jam Ke-</label>
                    <input type="number" name="period" value={newScheduleData.period === 0 ? '' : newScheduleData.period} onChange={handleFormChange} className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" min="1" />
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

      <Modal isOpen={isReportAbsenceModalOpen} onClose={() => setIsReportAbsenceModalOpen(false)} title="Lapor Ketidakhadiran">
         <form onSubmit={handleReportAbsenceSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">Alasan Tidak Hadir</label>
              <select value={absenceReason} onChange={(e) => setAbsenceReason(e.target.value as 'Sakit' | 'Izin' | 'Tugas Luar')} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white">
                <option value="Sakit">Sakit</option>
                <option value="Izin">Izin</option>
                <option value="Tugas Luar">Tugas Luar</option>
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
              <label className="block text-sm font-medium text-gray-300">Tidak Hadir Pada Jam Pelajaran Ke-</label>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(period => (
                  <label key={period} className="flex items-center space-x-2 p-1 rounded-md hover:bg-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={studentAbsentPeriods.includes(period)}
                      onChange={() => handleStudentPeriodChange(period)}
                      className="h-5 w-5 rounded bg-slate-600 border-slate-500 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-800"
                    />
                    <span className="text-sm select-none">{period}</span>
                  </label>
                ))}
              </div>
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
