import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isWithinSchoolRadius, getCurrentPosition } from '../../services/locationService';
import QRScanner from './QRScanner';
import { reportStudentAbsence, getStudentAbsencesByTeacher, getAllClasses, getStudentAbsencesByTeacherForDate, uploadProfilePhoto, updateUserProfile, getAllMasterSchedules, getMessagesForUser, sendMessage, markMessagesAsRead, deleteMessage, getAdminUsers, getMasterSchedulesByTeacherCode, getAllMasterCoaches } from '../../services/dataService';
import { getAttendanceForTeacher, reportTeacherAbsence, recordAttendance } from '../../services/attendanceService';
import { getDeviceId } from '../../services/authService';
import { LessonSchedule, AttendanceRecord, StudentAbsenceRecord, Class, Role, User, MasterSchedule, Message, MasterCoach } from '../../types';
import { Modal } from '../ui/Modal';
import Announcements from '../ui/Announcements';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { useToast } from '../../context/ToastContext';

// SVG Icons for the dashboard & navbar
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const StudentHistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
const ProfileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const MessageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
const ScanIcon = () => <svg className="h-8 w-8 sm:h-12 sm:w-12 text-indigo-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 3H4C3.44772 3 3 3.44772 3 4V7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 3H20C20.5523 3 21 3.44772 21 4V7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 21H4C3.44772 21 3 20.5523 3 20V17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 21H20C20.5523 21 21 20.5523 21 20V17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 8V16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 12H16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ScheduleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-12 sm:w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const ReportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-12 sm:w-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const StudentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-12 sm:w-12 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const EmptyHistoryIcon = () => <svg className="h-16 w-16 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /><rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="4 4"/></svg>;
const EmptyScheduleIcon = () => <svg className="h-16 w-16 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const EmptyReportIcon = () => <svg className="h-16 w-16 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const EmptyMessageIcon = () => <svg className="h-16 w-16 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

// New interface for student list in the report modal
interface AbsentStudentEntry {
  id: number;
  name: string;
  reason: 'Sakit' | 'Izin' | 'Alpa';
  absentPeriods: number[];
}

const PesanContent: React.FC<{
    user: User | null;
    messages: Message[];
    isLoading: boolean;
    onSendMessage: (content: string) => Promise<void>;
    onDeleteMessage: (messageId: string) => Promise<void>;
}> = ({ user, messages, isLoading, onSendMessage, onDeleteMessage }) => {
    const [replyContent, setReplyContent] = useState('');
    const messagesEndRef = React.useRef<HTMLUListElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollTo({ top: messagesEndRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    const handleReplySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyContent.trim()) return;
        try {
            await onSendMessage(replyContent.trim());
            setReplyContent('');
        } catch (error) {
            console.error("Failed to send reply:", error);
        }
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl">
            <h3 className="font-bold text-lg text-white p-6 border-b border-slate-700">Pesan dari Admin</h3>
            {isLoading ? <div className="p-6"><Spinner /></div> : (
                <div className="flex flex-col h-[70vh]">
                    {messages.length > 0 ? (
                        <ul ref={messagesEndRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                            {messages.map(msg => (
                                <li key={msg.id} className={`flex flex-col ${msg.senderId === user?.id ? 'items-end' : 'items-start'}`}>
                                    <div className={`p-3 rounded-lg max-w-xs md:max-w-md ${msg.senderId === user?.id ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                                        <p className="text-sm text-white">{msg.content}</p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-slate-500">{new Date(msg.timestamp).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                        {msg.senderId === user?.id && (
                                            <button onClick={() => onDeleteMessage(msg.id)} className="text-xs text-red-500 hover:underline">Hapus</button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                            <EmptyMessageIcon />
                            <p className="mt-4 text-slate-400">Belum ada pesan.</p>
                        </div>
                    )}

                    <form onSubmit={handleReplySubmit} className="p-4 border-t border-slate-700 bg-slate-800/50 flex items-center gap-2">
                        <input
                            type="text"
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Ketik balasan..."
                            className="flex-1 w-full px-4 py-2 bg-slate-900 text-white border-2 border-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                        />
                        <Button type="submit" className="flex-shrink-0">Kirim</Button>
                    </form>
                </div>
            )}
        </div>
    );
};


const TeacherDashboard: React.FC = () => {
  const { user, logout, updateUserContext } = useAuth();
  const addToast = useToast();
  const [activeView, setActiveView] = useState('beranda');
  const [showScanner, setShowScanner] = useState(false);
  const [isWithinRadius, setIsWithinRadius] = useState<boolean | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Dynamic data states
  const [stats, setStats] = useState({ today: 0, week: 0, total: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [todaysSchedule, setTodaysSchedule] = useState<MasterSchedule[]>([]);
  const [fullSchedule, setFullSchedule] = useState<MasterSchedule[]>([]);
  const [masterSchedules, setMasterSchedules] = useState<MasterSchedule[]>([]);
  const [masterCoaches, setMasterCoaches] = useState<MasterCoach[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [reportedAbsences, setReportedAbsences] = useState<StudentAbsenceRecord[]>([]);
  const [allStudentAbsences, setAllStudentAbsences] = useState<StudentAbsenceRecord[]>([]);
  const [isLoadingReported, setIsLoadingReported] = useState(true);
  
  // Messaging states
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Modal states
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isReportAbsenceModalOpen, setIsReportAbsenceModalOpen] = useState(false);
  const [isReportStudentModalOpen, setIsReportStudentModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isProfileDataLoading, setIsProfileDataLoading] = useState(false);


  // Form states
  const [absenceReason, setAbsenceReason] = useState<'Sakit' | 'Izin' | 'Tugas Luar'>('Sakit');
  const [absencePeriods, setAbsencePeriods] = useState('');
  const [absenceDescription, setAbsenceDescription] = useState('');

  // New states for multi-student absence report
  const [absentStudents, setAbsentStudents] = useState<AbsentStudentEntry[]>([{ id: Date.now(), name: '', reason: 'Sakit', absentPeriods: [] }]);
  const [studentClass, setStudentClass] = useState('');
  
  // Profile form states
  const [profileData, setProfileData] = useState<Partial<User>>({});
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);


  // General UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  // State for adding schedule (now unused)
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);


  const refreshData = async () => {
    if (!user) return;
    setIsLoadingStats(true);
    setIsLoadingHistory(true);
    setIsLoadingReported(true);
    setDashboardError(null); 

    try {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        // Refresh stats and history
        const allAttendance = await getAttendanceForTeacher(user.id);
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
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;


    const fetchData = async () => {
      setIsLoadingSchedule(true);
      setIsLoadingHistory(true);
      setIsLoadingStats(true);
      setIsLoadingReported(true);
      setDashboardError(null);
      try {
        const [
            allAttendance, 
            reported, 
            classesData, 
            allReportedStudents,
        ] = await Promise.all([
          getAttendanceForTeacher(user.id),
          getStudentAbsencesByTeacherForDate(user.id, todayStr),
          getAllClasses(),
          getStudentAbsencesByTeacher(user.id),
        ]);

        if (user.kode) {
            // For teachers, use master schedule. For coaches, there is no schedule to show here.
            if (user.role === Role.Teacher) {
                const teacherSchedules = await getMasterSchedulesByTeacherCode(user.kode);
                setFullSchedule(teacherSchedules);
                const todayDayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay()];
                setTodaysSchedule(teacherSchedules.filter(s => s.day === todayDayName));
            } else {
                setFullSchedule([]);
                setTodaysSchedule([]);
            }
        } else {
            setFullSchedule([]);
            setTodaysSchedule([]);
        }

        setAvailableClasses(classesData);
        
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

    // Setup message listener
    const unsubscribe = getMessagesForUser(user.id, (newMessages) => {
        setMessages(newMessages);
        setUnreadCount(newMessages.filter(m => !m.isRead && m.recipientId === user.id).length);
        setIsLoadingMessages(false);
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [user]);

  // Effect to mark messages as read when the message view is opened
  useEffect(() => {
      if (activeView === 'pesan' && unreadCount > 0 && user) {
          const unreadMessageIds = messages
              .filter(m => !m.isRead && m.recipientId === user.id)
              .map(m => m.id);
          markMessagesAsRead(unreadMessageIds);
      }
  }, [activeView, messages, unreadCount, user]);

    const attendedTodaySet = useMemo(() => {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        return new Set(
            attendanceHistory
                .filter(r => r.date === todayStr && r.scheduleId)
                .map(r => r.scheduleId)
        );
    }, [attendanceHistory]);
    
    const availableCodes = useMemo(() => {
        if (user?.role === Role.Coach) {
            return [...new Set(masterCoaches.map(c => c.kode))].sort();
        }
        return [...new Set(masterSchedules.map(s => s.kode))].sort();
    }, [masterSchedules, masterCoaches, user?.role]);


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
        if (!user || !studentClass) {
            setModalError("Kelas harus dipilih.");
            return;
        }
        const validStudents = absentStudents.filter(s => s.name.trim() !== '');
        if (validStudents.length === 0) {
            setModalError("Mohon isi nama untuk setidaknya satu siswa.");
            return;
        }

        setIsSubmitting(true);
        setModalError('');
        setModalSuccess('');

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        const reportPromises = validStudents.map(student => {
            const record: Omit<StudentAbsenceRecord, 'id'> = {
                studentName: student.name.trim(),
                class: studentClass,
                date: todayStr,
                reason: student.reason,
                reportedBy: user.name,
                teacherId: user.id,
                absentPeriods: student.absentPeriods.length > 0 ? student.absentPeriods : undefined,
            };
            return reportStudentAbsence(record);
        });

        try {
            await Promise.all(reportPromises);
            setModalSuccess(`Laporan untuk ${validStudents.length} siswa berhasil disimpan.`);
            await refreshData();
            // Reset form
            setAbsentStudents([{ id: Date.now(), name: '', reason: 'Sakit', absentPeriods: [] }]);
            setStudentClass('');
            setTimeout(() => {
                setIsReportStudentModalOpen(false);
                setModalSuccess('');
            }, 2000);
        } catch (err) {
            setModalError(err instanceof Error ? err.message : "Gagal menyimpan laporan.");
        } finally {
            setIsSubmitting(false);
        }
    };
  
  const handleProfileFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'kode') {
        let autoFilledData: Partial<User> = {};
        if (user?.role === Role.Coach) {
            const selectedCoach = masterCoaches.find(s => s.kode === value);
            if(selectedCoach) {
                autoFilledData = {
                    kode: value,
                    name: selectedCoach.namaLengkap,
                    subject: selectedCoach.bidangEskul,
                    position: selectedCoach.jabatan,
                };
            }
        } else { // Teacher
            const selectedSchedule = masterSchedules.find(s => s.kode === value);
            if (selectedSchedule) {
                autoFilledData = {
                    kode: value,
                    name: selectedSchedule.namaGuru,
                    subject: selectedSchedule.subject,
                };
            }
        }
        
        if (value) {
            setProfileData(prev => ({ ...prev, ...autoFilledData }));
        } else {
            // Revert to original data on deselect
             setProfileData(prev => ({
                ...prev,
                kode: '',
                name: user?.name || '',
                subject: user?.subject || '',
                position: user?.position || '',
             }));
        }

    } else {
        // Handle other form fields normally
        setProfileData(prev => ({ ...prev, [name]: value }));
    }
};

    const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<File> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;

                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxWidth) {
                            width *= maxWidth / height;
                            height = maxWidth;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        return reject(new Error('Tidak bisa mendapatkan konteks canvas'));
                    }
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                return reject(new Error('Gagal konversi canvas ke Blob'));
                            }
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        },
                        'image/jpeg',
                        quality
                    );
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (!file.type.startsWith('image/')) {
            addToast('Silakan pilih file gambar yang valid.', 'error');
            return;
        }

        setPhotoPreview(URL.createObjectURL(file)); // Show temporary preview

        try {
            addToast('Mengompres gambar...', 'info');
            const compressedFile = await compressImage(file);
            setProfilePhotoFile(compressedFile);
            setPhotoPreview(URL.createObjectURL(compressedFile));
            addToast('Gambar berhasil dikompres.', 'success');
        } catch (error) {
            console.error("Image compression failed:", error);
            addToast(error instanceof Error ? error.message : 'Gagal memproses gambar.', 'error');
            setProfilePhotoFile(null);
            setPhotoPreview(user?.photoURL || null);
        }
    }
  };


  // Handlers for multi-student report form
    const handleAddStudent = () => {
        setAbsentStudents(prev => [...prev, { id: Date.now(), name: '', reason: 'Sakit', absentPeriods: [] }]);
    };

    const handleRemoveStudent = (idToRemove: number) => {
        if (absentStudents.length > 1) {
            setAbsentStudents(prev => prev.filter(student => student.id !== idToRemove));
        }
    };

    const handleStudentDataChange = (id: number, field: 'name' | 'reason', value: string) => {
        setAbsentStudents(prev => 
            prev.map(student => 
                student.id === id 
                ? { ...student, [field]: value as 'Sakit' | 'Izin' | 'Alpa' | string } 
                : student
            )
        );
    };

  const handleStudentPeriodChange = (studentId: number, period: number) => {
    setAbsentStudents(prev =>
      prev.map(student => {
        if (student.id === studentId) {
          const newPeriods = student.absentPeriods.includes(period)
            ? student.absentPeriods.filter(p => p !== period)
            : [...student.absentPeriods, period];
          return { ...student, absentPeriods: newPeriods.sort((a, b) => a - b) };
        }
        return student;
      })
    );
  };
  
  const handleScanSuccess = async (qrData: string) => {
    setShowScanner(false);
    if (!user) {
        alert('Sesi tidak valid. Silakan login ulang.');
        return;
    }
    setIsSubmitting(true);
    
    try {
        const now = new Date();
        const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

        const matchingSchedule = todaysSchedule.find(schedule => {
            const cleanedWaktu = schedule.waktu?.trim();
            if (!cleanedWaktu || !cleanedWaktu.includes('-')) return false;

            const timeParts = cleanedWaktu.split('-').map(p => p.trim());
            if (timeParts.length !== 2) return false;

            const [startTimeStr, endTimeStr] = timeParts;

            const startParts = startTimeStr.split(':');
            const endParts = endTimeStr.split(':');

            if (startParts.length !== 2 || endParts.length !== 2) return false;
            
            const startHour = parseInt(startParts[0], 10);
            const startMinute = parseInt(startParts[1], 10);
            const endHour = parseInt(endParts[0], 10);
            const endMinute = parseInt(endParts[1], 10);
            
            if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
                return false;
            }

            const scheduleStartMinutes = startHour * 60 + startMinute;
            const scheduleEndMinutes = endHour * 60 + endMinute;

            // Corrected logic: The interval is inclusive of the start time and exclusive of the end time [start, end).
            // This correctly handles back-to-back schedules where one ends at HH:MM and the next starts at HH:MM.
            return currentTimeInMinutes >= scheduleStartMinutes && currentTimeInMinutes < scheduleEndMinutes;
        });

        if (!matchingSchedule) {
            throw new Error('Tidak ada jadwal mengajar yang cocok pada saat ini.');
        }

        if (attendedTodaySet.has(matchingSchedule.id)) {
            throw new Error(`Anda sudah absen untuk pelajaran ${matchingSchedule.subject} hari ini.`);
        }

        const scheduleInfo = {
            id: matchingSchedule.id,
            subject: matchingSchedule.subject,
            class: matchingSchedule.class,
            period: matchingSchedule.period
        };

        const result = await recordAttendance(user, qrData, scheduleInfo);

        if (result.success) {
            alert(result.message);
            await refreshData();
        } else {
            throw new Error(result.message);
        }
    } catch (err) {
        alert(err instanceof Error ? err.message : 'Terjadi kesalahan saat merekam absensi.');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleEditProfile = async () => {
    if (user) {
        setProfileData(user);
        setPhotoPreview(user.photoURL || null);
        setProfilePhotoFile(null);
        setModalError('');
        setModalSuccess('');
        setIsEditProfileModalOpen(true);

        const shouldFetchSchedules = user.role === Role.Teacher && masterSchedules.length === 0;
        const shouldFetchCoaches = user.role === Role.Coach && masterCoaches.length === 0;

        if (shouldFetchSchedules || shouldFetchCoaches) {
            setIsProfileDataLoading(true);
            try {
                if (shouldFetchSchedules) {
                    const schedulesData = await getAllMasterSchedules();
                    setMasterSchedules(schedulesData);
                }
                if (shouldFetchCoaches) {
                    const coachesData = await getAllMasterCoaches();
                    setMasterCoaches(coachesData);
                }
            } catch (err) {
                setModalError(err instanceof Error ? err.message : "Gagal memuat data master.");
            } finally {
                setIsProfileDataLoading(false);
            }
        }
    }
  };

  const handleProfileUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!profileData.kode) {
        setModalError("Kode wajib diisi untuk validasi jadwal dan data.");
        return;
    }

    // --- PROFILE LOCKING CONFIRMATION ---
    // If user has no code yet, but is trying to set one
    if (!user.kode && profileData.kode) {
        const isConfirmed = window.confirm(
            "Apakah Anda yakin ingin memilih kode ini? Setelah disimpan, kode tidak dapat diubah lagi dan akun Anda akan terikat ke perangkat ini."
        );
        if (!isConfirmed) {
            return; // Abort if user cancels
        }
    }
    // --- END PROFILE LOCKING ---

    setIsSubmitting(true);
    setModalError('');
    setModalSuccess('');

    try {
        let photoURL = user.photoURL; // Start with the existing photo URL

        // If a new photo file is selected, upload it
        if (profilePhotoFile) {
            photoURL = await uploadProfilePhoto(profilePhotoFile, user.id);
        }

        // --- DEVICE BINDING LOGIC ---
        // If the user profile doesn't have a deviceId yet, bind the current one.
        // This happens when they first set their Kode.
        const dataToUpdate: Partial<User> = {};
        if (!user.deviceId) {
            dataToUpdate.deviceId = getDeviceId();
        }
        // --- END DEVICE BINDING ---

        // Prepare data for Firestore update, excluding fields that shouldn't be there
        const { id, email, role, ...updatableProfileData } = profileData;
        Object.assign(dataToUpdate, { ...updatableProfileData, photoURL: photoURL || null });

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

  const handleSendMessage = async (content: string) => {
    if (!user) return;
    try {
        // This robustly finds an admin, allowing new conversations.
        const admins = await getAdminUsers();
        if (admins.length === 0) {
            throw new Error("Tidak ada admin yang ditemukan untuk dikirimi pesan.");
        }
        const recipientId = admins[0].id; // Send to the first admin found
        await sendMessage(user.id, user.name, recipientId, content);
    } catch (error) {
        console.error("Failed to send reply:", error);
        // Optionally show an error to the user in the UI
        alert(error instanceof Error ? error.message : "Gagal mengirim pesan.");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
      if (window.confirm('Apakah Anda yakin ingin menghapus pesan ini?')) {
          try {
              await deleteMessage(messageId);
          } catch (error) {
              console.error("Failed to delete message:", error);
          }
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
  }, {} as Record<string, MasterSchedule[]>);
  const scheduleOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  
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
                <div className="md:col-span-2 lg:col-span-4">
                    <Announcements />
                </div>
        <button onClick={() => setShowScanner(true)} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl text-left hover:border-indigo-500 hover:bg-slate-800/80 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed group flex items-center sm:flex-col sm:items-start" disabled={isWithinRadius !== true}>
          <div className="p-3 bg-slate-700 rounded-lg mr-4 sm:mr-0 sm:mb-4 text-slate-300"><ScanIcon/></div>
          <div>
            <h3 className="font-bold text-lg text-white sm:mt-4">Scan QR Code</h3>
            <p className="text-sm text-slate-400 mt-1 sm:mt-1">Scan QR Code kelas untuk absensi</p>
            <p className={`text-sm mt-2 sm:mt-2 font-semibold ${locationStatus.color}`}>{locationStatus.text}</p>
          </div>
        </button>
        <button onClick={() => setIsScheduleModalOpen(true)} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl text-left hover:border-blue-500 hover:bg-slate-800/80 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center sm:flex-col sm:items-start">
          <div className="p-3 bg-slate-700 rounded-lg mr-4 sm:mr-0 sm:mb-4 text-slate-300"><ScheduleIcon/></div>
          <div>
            <h3 className="font-bold text-lg text-white sm:mt-4">Jadwal Mengajar</h3>
            <p className="text-sm text-slate-400 mt-1 sm:mt-1">Lihat jadwal mengajar lengkap Anda</p>
          </div>
        </button>
        <button onClick={() => setIsReportAbsenceModalOpen(true)} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl text-left hover:border-yellow-500 hover:bg-slate-800/80 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-yellow-500 flex items-center sm:flex-col sm:items-start">
          <div className="p-3 bg-slate-700 rounded-lg mr-4 sm:mr-0 sm:mb-4 text-slate-300"><ReportIcon/></div>
          <div>
            <h3 className="font-bold text-lg text-white sm:mt-4">Lapor Ketidakhadiran</h3>
            <p className="text-sm text-slate-400 mt-1 sm:mt-1">Laporkan jika tidak dapat hadir hari ini.</p>
            <p className="text-xs text-slate-500 mt-2 sm:mt-2">Fitur ini tidak memerlukan lokasi.</p>
          </div>
        </button>
        <button onClick={() => { if (todaysSchedule.length > 0) setIsReportStudentModalOpen(true) }} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl text-left hover:border-orange-500 hover:bg-slate-800/80 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center sm:flex-col sm:items-start" disabled={todaysSchedule.length === 0}>
          <div className="p-3 bg-slate-700 rounded-lg mr-4 sm:mr-0 sm:mb-4 text-slate-300"><StudentIcon/></div>
          <div>
            <h3 className="font-bold text-lg text-white sm:mt-4">Lapor Siswa Absen</h3>
            <p className="text-sm text-slate-400 mt-1 sm:mt-1">Input siswa yang tidak hadir hari ini</p>
            {isLoadingSchedule ? <p className="text-xs mt-2 font-semibold text-gray-400 sm:mt-2">Memuat jadwal...</p> : todaysSchedule.length === 0 && <p className="text-xs mt-2 font-semibold text-yellow-400 sm:mt-2">Tidak ada jadwal hari ini</p>}
          </div>
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
                      <p className="text-sm text-slate-400">{s.waktu} • {s.class} • {s.jumlahJam} JP</p>
                    </div>
                    {isAttended ? <CheckCircleIcon /> : <span className="px-2 py-1 text-xs font-semibold text-blue-300 bg-blue-500/30 rounded-full">Belum Absen</span>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-10">
              <EmptyScheduleIcon/>
              <p className="mt-4 text-slate-400">{user?.kode ? "Tidak ada jadwal mengajar hari ini." : "Atur 'Kode' di profil untuk melihat jadwal."}</p>
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
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${r.status === 'Present' ? 'bg-emerald-500/30 text-emerald-200' : r.status === 'Late' ? 'bg-yellow-500/30 text-yellow-200' : 'bg-slate-500/30 text-slate-200'}`}>
                    {r.status}
                  </span>
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
      </div>
    </>
  );

  const RiwayatContent = () => (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl">
        <h3 className="font-bold text-lg text-white mb-4">Semua Riwayat Absensi</h3>
        {isLoadingHistory ? <Spinner/> : attendanceHistory.length > 0 ? (
        <ul className="space-y-3 max-h-[70vh] overflow-y-auto">
            {attendanceHistory.map(r => (
            <li key={r.id} className="flex justify-between items-center bg-slate-700/50 p-4 rounded-lg">
                <div>
                    <p className="font-semibold text-white">{r.subject ? `${r.subject} (${r.class})` : new Date(r.timestamp).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    <p className="text-sm text-slate-400">{new Date(r.timestamp).toLocaleString('id-ID')}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${r.status === 'Present' ? 'bg-emerald-500/30 text-emerald-200' : r.status === 'Late' ? 'bg-yellow-500/30 text-yellow-200' : 'bg-slate-500/30 text-slate-200'}`}>
                    {r.status}
                </span>
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

  const LaporanSiswaContent = () => (
     <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl">
        <h3 className="font-bold text-lg text-white mb-4">Riwayat Laporan Siswa Absen</h3>
        {isLoadingReported ? <Spinner/> : allStudentAbsences.length > 0 ? (
        <ul className="space-y-3 max-h-[70vh] overflow-y-auto">
            {allStudentAbsences.map(r => (
            <li key={r.id} className="bg-slate-700/50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="font-semibold text-white">{r.studentName} - {r.class}</p>
                        <p className="text-sm text-slate-400">{new Date(r.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${r.reason === 'Sakit' ? 'bg-yellow-500/30 text-yellow-200' : r.reason === 'Izin' ? 'bg-blue-500/30 text-blue-200' : 'bg-red-500/30 text-red-200'}`}>
                        {r.reason}
                    </span>
                </div>
                {r.absentPeriods && <p className="text-xs text-slate-400 mt-2">Jam ke: {r.absentPeriods.join(', ')}</p>}
            </li>
            ))}
        </ul>
        ) : (
        <div className="text-center py-10">
            <EmptyReportIcon/>
            <p className="mt-4 text-slate-400">Anda belum pernah melaporkan siswa absen.</p>
        </div>
        )}
    </div>
  );

  const ProfilContent = () => (
       <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl">
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
                            <label className="text-sm text-slate-400">Kode Guru/Pembina</label>
                            <p className="text-white font-semibold">{user.kode || 'Belum diatur'}</p>
                        </div>
                        <div>
                            <label className="text-sm text-slate-400">Jabatan</label>
                            <p className="text-white font-semibold">{user.position || '-'}</p>
                        </div>
                         <div>
                            <label className="text-sm text-slate-400">Mapel/Bidang</label>
                            <p className="text-white font-semibold">{user.subject || '-'}</p>
                        </div>
                         <div>
                            <label className="text-sm text-slate-400">Gelar</label>
                            <p className="text-white font-semibold">{user.title || '-'}</p>
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
            case 'riwayat': return <RiwayatContent />;
            case 'laporan-siswa': return <LaporanSiswaContent />;
            case 'pesan': return <PesanContent user={user} messages={messages} isLoading={isLoadingMessages} onSendMessage={handleSendMessage} onDeleteMessage={handleDeleteMessage} />;
            case 'profil': return <ProfilContent />;
            default: return <BerandaContent />;
        }
    };
    
    const NavItem = ({ view, label, icon, hasNotification }: { view: string; label: string; icon: React.ReactNode; hasNotification?: boolean }) => (
        <button onClick={() => setActiveView(view)} className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${activeView === view ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}>
          <div className="relative">
            {icon}
            {hasNotification && (
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-slate-800"></span>
            )}
          </div>
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
                         <h2 className="text-xl font-bold text-white capitalize hidden md:block">{activeView}</h2>
                    </div>
                    <div className="flex-1 text-right">
                        <button onClick={logout} aria-label="Logout" className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                            </svg>
                        </button>
                    </div>
                </header>

                <main className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
                    {renderContent()}
                    <footer className="text-center text-slate-500 text-sm pt-4">
                        © Rullp 2025 HadirKu. All rights reserved.
                    </footer>
                </main>

                <footer className="fixed bottom-0 left-0 right-0 bg-slate-800/80 backdrop-blur-lg border-t border-slate-700 z-20 flex justify-around">
                    <NavItem view="beranda" label="Beranda" icon={<HomeIcon />} />
                    <NavItem view="riwayat" label="Riwayat Saya" icon={<HistoryIcon />} />
                    <NavItem view="laporan-siswa" label="Laporan Siswa" icon={<StudentHistoryIcon />} />
                    <NavItem view="pesan" label="Pesan" icon={<MessageIcon />} hasNotification={unreadCount > 0} />
                    <NavItem view="profil" label="Profil" icon={<ProfileIcon />} />
                </footer>
            </div>
            
            <Modal isOpen={isEditProfileModalOpen} onClose={() => setIsEditProfileModalOpen(false)} title="Ubah Profil">
                 <form onSubmit={handleProfileUpdateSubmit} className="space-y-4">
                    {isProfileDataLoading ? (
                        <div className="h-24 flex items-center justify-center"><Spinner /></div>
                    ) : (
                        <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
                            <label htmlFor="kode" className="block text-sm font-medium text-slate-300">
                                Pilih Kode Guru/Pembina Anda
                            </label>
                            <p className="text-xs text-slate-400 mt-1 mb-2">Pilih kode unik Anda dari jadwal induk. Ini akan menyinkronkan data Anda. Tindakan ini hanya bisa dilakukan sekali dan akan mengikat akun ke perangkat ini.</p>
                            <select
                                id="kode"
                                name="kode"
                                value={profileData.kode || ''}
                                onChange={handleProfileFormChange}
                                className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white disabled:bg-slate-800 disabled:cursor-not-allowed"
                                disabled={!!user?.kode} // Disable if kode is already set
                            >
                                <option value="">-- Pilih Kode --</option>
                                {availableCodes.map(code => (
                                    <option key={code} value={code}>{code}</option>
                                ))}
                            </select>
                        </div>
                    )}

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
                            <label className="block text-sm font-medium text-gray-300">Nama Lengkap</label>
                            <input name="name" value={profileData.name || ''} type="text" disabled className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-400 cursor-not-allowed"/>
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-300">Gelar (S.Pd, M.Kom)</label>
                            <input name="title" value={profileData.title || ''} onChange={handleProfileFormChange} type="text" className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                         </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-300">Jabatan</label>
                            <input name="position" value={profileData.position || ''} disabled type="text" className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-400 cursor-not-allowed"/>
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-300">Mapel / Bidang Eskul</label>
                            <input name="subject" value={profileData.subject || ''} disabled type="text" className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-400 cursor-not-allowed"/>
                         </div>
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
                        <label className="block text-sm font-medium text-gray-300">Keterangan Tambahan (Opsional)</label>
                        <input type="text" value={absenceDescription} onChange={e => setAbsenceDescription(e.target.value)} placeholder="Contoh: Ada acara keluarga" className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Untuk Jam Pelajaran Ke- (Opsional)</label>
                        <input type="text" value={absencePeriods} onChange={e => setAbsencePeriods(e.target.value)} placeholder="Contoh: 1, 2, 5" className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"/>
                    </div>
                    {modalError && <p className="text-sm text-red-400">{modalError}</p>}
                    {modalSuccess && <p className="text-sm text-green-400">{modalSuccess}</p>}
                    <div className="flex justify-end pt-2">
                        <Button type="submit" isLoading={isSubmitting} className="w-full">Kirim Laporan</Button>
                    </div>
                </form>
            </Modal>
            
            <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} title="Jadwal Mengajar Lengkap">
                {isLoadingSchedule ? <Spinner /> : fullSchedule.length > 0 ? (
                    <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-4">
                        {scheduleOrder.map(day => (
                            groupedSchedule[day] && (
                                <div key={day}>
                                    <h4 className="font-bold text-lg text-white mb-2 sticky top-0 bg-slate-800 py-1">{day}</h4>
                                    <ul className="space-y-2">
                                        {groupedSchedule[day].map(s => (
                                            <li key={s.id} className="bg-slate-700/50 p-3 rounded-lg">
                                                <p className="font-semibold text-white">{s.subject} - {s.class}</p>
                                                <p className="text-sm text-slate-400">{s.waktu} • Jam ke-{s.period} • {s.jumlahJam} JP</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )
                        ))}
                    </div>
                ) : (
                     <div className="text-center py-10">
                        <EmptyScheduleIcon/>
                        <p className="mt-4 text-slate-400">{user?.kode ? "Jadwal tidak ditemukan." : "Atur 'Kode' di profil Anda untuk melihat jadwal."}</p>
                    </div>
                )}
            </Modal>

            <Modal isOpen={isReportStudentModalOpen} onClose={() => setIsReportStudentModalOpen(false)} title="Lapor Siswa Tidak Hadir">
                 <form onSubmit={handleReportStudentSubmit} className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Kelas</label>
                        <select value={studentClass} onChange={e => setStudentClass(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white">
                            <option value="">-- Pilih Kelas --</option>
                            {uniqueTodayClasses.map(className => (
                                <option key={className} value={className}>{className}</option>
                            ))}
                        </select>
                     </div>
                     <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                        {absentStudents.map((student, index) => (
                            <div key={student.id} className="p-3 bg-slate-700/50 rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm text-slate-300">Siswa #{index + 1}</label>
                                    {absentStudents.length > 1 && (
                                        <button type="button" onClick={() => handleRemoveStudent(student.id)} className="text-red-400 hover:text-red-300"><TrashIcon /></button>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={student.name}
                                    onChange={(e) => handleStudentDataChange(student.id, 'name', e.target.value)}
                                    placeholder="Nama Siswa"
                                    required
                                    className="block w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-white"
                                />
                                <select
                                    value={student.reason}
                                    onChange={(e) => handleStudentDataChange(student.id, 'reason', e.target.value)}
                                    className="block w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-white"
                                >
                                    <option value="Sakit">Sakit</option>
                                    <option value="Izin">Izin</option>
                                    <option value="Alpa">Alpa</option>
                                </select>
                                <div className="pt-1">
                                    <label className="block text-xs text-slate-400 mb-1">Tidak Hadir Jam Ke- (Opsional)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {[...Array(10)].map((_, i) => (
                                            <button
                                                type="button"
                                                key={i}
                                                onClick={() => handleStudentPeriodChange(student.id, i + 1)}
                                                className={`h-8 w-8 rounded-md text-sm transition-colors ${student.absentPeriods.includes(i + 1) ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'}`}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Button type="button" onClick={handleAddStudent} variant="secondary" className="w-full text-sm">Tambah Siswa Lain</Button>

                    {modalError && <p className="text-sm text-red-400">{modalError}</p>}
                    {modalSuccess && <p className="text-sm text-green-400">{modalSuccess}</p>}
                     <div className="flex justify-end pt-2">
                         <Button type="submit" isLoading={isSubmitting} className="w-full">Simpan Laporan</Button>
                     </div>
                 </form>
            </Modal>
        </>
    );
};

export default TeacherDashboard;