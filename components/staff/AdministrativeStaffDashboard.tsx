import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isWithinSchoolRadius, getCurrentPosition } from '../../services/locationService';
import { recordStaffAttendanceWithQR, getAttendanceForTeacher, reportTeacherAbsence } from '../../services/attendanceService';
import { updateUserProfile, uploadProfilePhoto } from '../../services/dataService';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { AttendanceRecord, Role, User } from '../../types';
import { Card } from '../ui/Card';
import QRScanner from './QRScanner';
import { Modal } from '../ui/Modal';

// Add a new interface for processed records with fine information
interface ProcessedHistoryRecord extends AttendanceRecord {
  denda: number;
}

// Icons for Navbar
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ProfileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;


const AdministrativeStaffDashboard: React.FC = () => {
    const { user, logout, updateUserContext } = useAuth();
    const [activeView, setActiveView] = useState('beranda');
    const [isWithinRadius, setIsWithinRadius] = useState<boolean | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [history, setHistory] = useState<ProcessedHistoryRecord[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [showScanner, setShowScanner] = useState(false);
    const [totalFine, setTotalFine] = useState(0); // State for total fine

    // Modal states
    const [isReportAbsenceModalOpen, setIsReportAbsenceModalOpen] = useState(false);
    const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

    // Form states
    const [absenceReason, setAbsenceReason] = useState<'Sakit' | 'Izin' | 'Tugas Luar'>('Sakit');
    const [absenceDescription, setAbsenceDescription] = useState('');
    const [modalError, setModalError] = useState('');
    const [modalSuccess, setModalSuccess] = useState('');
    
    // Profile form states
    const [profileData, setProfileData] = useState<Partial<User>>({});
    const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);


    useEffect(() => {
        const checkLocation = async () => {
            try {
                const position = await getCurrentPosition();
                setIsWithinRadius(isWithinSchoolRadius(position.coords));
                setLocationError(null);
            } catch (error) {
                setIsWithinRadius(false);
                setLocationError('Gagal mendapatkan lokasi. Aktifkan GPS.');
            }
        };
        checkLocation();
    }, []);

    const fetchHistory = async () => {
        if (user) {
            setIsLoadingHistory(true);
            const allRecords = await getAttendanceForTeacher(user.id);

            // Filter for the last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const recentRecords = allRecords.filter(r => new Date(r.timestamp) >= thirtyDaysAgo);

            // Process records to add fine information
            const lateFine = 2000;
            const processed = recentRecords.map(record => {
                let denda = 0;
                const recordDate = new Date(record.timestamp);
                const day = recordDate.getDay(); // 0 = Sunday, 6 = Saturday

                // Fine rules apply on weekdays for 'Datang' or 'Pulang' status, based on clock-in time
                if ((record.status === 'Datang' || record.status === 'Pulang') && day >= 1 && day <= 5) {
                    const checkInHour = recordDate.getHours();
                    const checkInMinute = recordDate.getMinutes();
                    // Check if clocked in late (after 07:15)
                    if (checkInHour > 7 || (checkInHour === 7 && checkInMinute > 15)) {
                        denda = lateFine;
                    }
                }
                
                return { ...record, denda };
            });

            const totalDenda = processed.reduce((acc, record) => acc + record.denda, 0);
            setTotalFine(totalDenda);

            setHistory(processed);
            setIsLoadingHistory(false);
        }
    };


    useEffect(() => {
        if(user) {
            fetchHistory();
        }
    }, [user]);

    const handleScanSuccess = async (qrData: string) => {
        if (!user) return;
        setShowScanner(false);
        setIsSubmitting(true);
        setMessage(null);
        const result = await recordStaffAttendanceWithQR(user, qrData);
        if (result.success) {
            setMessage({ text: result.message, type: 'success' });
            fetchHistory(); // Refresh history
        } else {
            setMessage({ text: result.message, type: 'error' });
        }
        setIsSubmitting(false);
    };

    // New handler for reporting absence
    const handleReportAbsenceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSubmitting(true);
        setModalError('');
        setModalSuccess('');

        const result = await reportTeacherAbsence(user, absenceReason, absenceDescription);

        if (result.success) {
            setModalSuccess(result.message);
            await fetchHistory(); // Refresh data to disable buttons
            setTimeout(() => {
                setIsReportAbsenceModalOpen(false);
                setModalSuccess('');
                setAbsenceDescription('');
            }, 2000);
        } else {
            setModalError(result.message);
        }
        setIsSubmitting(false);
    };

    const handleEditProfile = () => {
       if (user) {
            setProfileData(user);
            setPhotoPreview(user.photoURL || null);
            setProfilePhotoFile(null);
            setModalError('');
            setModalSuccess('');
            setIsEditProfileModalOpen(true);
        }
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
    
    const handleProfileUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSubmitting(true);
        setModalError('');
        setModalSuccess('');

        try {
            let photoURL = user.photoURL;

            if (profilePhotoFile) {
                photoURL = await uploadProfilePhoto(profilePhotoFile, user.id);
            }

            const { id, email, role, ...updatableProfileData } = profileData;
            const dataToUpdate = { ...updatableProfileData, photoURL: photoURL || null };

            await updateUserProfile(user.id, dataToUpdate);
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


    const getStatusBadge = (record: ProcessedHistoryRecord) => {
        let statusText = record.status;
        let className = '';
    
        // The record.status is the final state for the day ('Pulang') or the current state ('Datang')
        switch (record.status) {
            case 'Datang':
                // If they are only clocked in, show if they were late on arrival.
                if (record.denda > 0) {
                    statusText = 'Telat Datang';
                    className = 'bg-red-500/30 text-red-200'; // Red for late
                } else {
                    statusText = 'Datang';
                    className = 'bg-emerald-500/30 text-emerald-200'; // Green for on-time arrival
                }
                break;
            case 'Pulang':
                // If they have clocked out, the badge just says "Pulang".
                // The lateness is indicated by the separate "Denda" text.
                statusText = 'Pulang';
                className = 'bg-blue-500/30 text-blue-200'; // Blue for completed
                break;
            default: // For 'Sakit', 'Izin', etc.
                statusText = record.status;
                className = 'bg-yellow-500/30 text-yellow-200'; // Yellow for other statuses
                break;
        }
        
        return (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${className}`}>
                {statusText}
            </span>
        );
    };


    const locationStatus = locationError 
        ? { text: locationError, color: 'text-red-400' }
        : isWithinRadius === null ? { text: 'Mengecek lokasi...', color: 'text-yellow-400' }
        : isWithinRadius ? { text: 'Anda berada di dalam radius sekolah', color: 'text-emerald-400' }
        : { text: 'Anda berada di luar radius sekolah', color: 'text-red-400' };

    // Determine attendance status and time validity
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // Sunday: 0, Monday: 1, ..., Saturday: 6

    const isWeekend = currentDay === 0 || currentDay === 6;
    
    // Weekday check-out logic
    let isCheckOutTime = false;
    let checkOutStartTime = "15:00";
    let checkOutEndTime = "15:20";
    
    if (!isWeekend) {
        if (currentDay === 5) { // It's Friday
            checkOutStartTime = "11:30";
            checkOutEndTime = "15:20";
            const isAfterStart = currentHour > 11 || (currentHour === 11 && currentMinute >= 30);
            const isBeforeEnd = currentHour < 15 || (currentHour === 15 && currentMinute <= 20);
            isCheckOutTime = isAfterStart && isBeforeEnd;
        } else { // It's Monday-Thursday
            isCheckOutTime = currentHour === 15 && currentMinute >= 0 && currentMinute <= 20;
        }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const latestRecordToday = history.length > 0 && history[0].date === todayStr ? history[0] : null;

    // Updated logic to check for various statuses
    const hasReportedAbsence = latestRecordToday && ['Sakit', 'Izin', 'Tugas Luar'].includes(latestRecordToday.status);
    const hasClockedIn = latestRecordToday?.status === 'Datang';
    const hasClockedOut = latestRecordToday?.status === 'Pulang';
    
    // Determine button state and text
    let buttonText = '';
    let timeStatusMessage = '';
    let isButtonDisabledByTime = false; 

    if (hasReportedAbsence) {
        buttonText = 'Ketidakhadiran Telah Dilaporkan';
        timeStatusMessage = `Anda sudah tercatat '${latestRecordToday.status}' hari ini.`;
        isButtonDisabledByTime = true;
    } else if (hasClockedOut) {
        buttonText = isWeekend ? 'Selesai Absen Lembur' : 'Selesai Absen';
        timeStatusMessage = `Anda sudah menyelesaikan absensi ${isWeekend ? 'lembur ' : ''}hari ini.`;
        isButtonDisabledByTime = true;
    } else if (hasClockedIn) {
        buttonText = `Scan QR untuk Absen Pulang${isWeekend ? ' (Lembur)' : ''}`;
        if (isWeekend) {
            timeStatusMessage = 'Absensi lembur di akhir pekan. Silakan catat waktu pulang Anda.';
            isButtonDisabledByTime = false;
        } else if (isCheckOutTime) {
            timeStatusMessage = `Absen pulang (${currentDay === 5 ? 'Jumat' : 'Senin-Kamis'}) dibuka pukul ${checkOutStartTime} - ${checkOutEndTime}. Silakan absen.`;
            isButtonDisabledByTime = false;
        } else {
            timeStatusMessage = `Belum waktunya absen pulang. Dibuka pukul ${checkOutStartTime} - ${checkOutEndTime}.`;
            isButtonDisabledByTime = true;
        }
    } else { // Not clocked in yet
        buttonText = `Scan QR untuk Absen Datang${isWeekend ? ' (Lembur)' : ''}`;
        if (isWeekend) {
            timeStatusMessage = 'Absensi lembur di akhir pekan. Silakan catat kehadiran Anda.';
            isButtonDisabledByTime = false;
        } else { // It's a weekday
            const isBeforeWork = currentHour < 5;
            const isAfterWork = currentHour > 15 || (currentHour === 15 && currentMinute > 20); // After 15:20

            if (isBeforeWork) {
                timeStatusMessage = 'Belum waktunya absen datang. Dibuka pukul 05:00.';
                isButtonDisabledByTime = true;
            } else if (isAfterWork) {
                timeStatusMessage = 'Waktu kerja sudah berakhir. Tidak bisa absen datang.';
                isButtonDisabledByTime = true;
            } else { // It's during work hours (5:00 - 15:20)
                isButtonDisabledByTime = false; // Enable the button
                const isLate = currentHour > 7 || (currentHour === 7 && currentMinute > 15);
                if (isLate) {
                    timeStatusMessage = 'Anda akan diabsen sebagai TELAT (setelah 07:15). Silakan absen.';
                } else {
                    timeStatusMessage = 'Waktu absen datang: 05:00 - 07:15. Silakan absen.';
                }
            }
        }
    }
    
    const isButtonDisabled = isWithinRadius !== true || isSubmitting || isButtonDisabledByTime;

    if (showScanner) {
        return <QRScanner onScanSuccess={handleScanSuccess} onClose={() => setShowScanner(false)} />;
    }
    
    const getRoleBadgeClass = (role: Role) => {
        switch (role) {
          case Role.Admin: return 'bg-purple-500/30 text-purple-300';
          case Role.Teacher: return 'bg-blue-500/30 text-blue-300';
          case Role.Coach: return 'bg-green-500/30 text-green-300';
          case Role.AdministrativeStaff: return 'bg-slate-500/30 text-slate-300';
          default: return 'bg-gray-500/30 text-gray-300';
        }
    };

    const BerandaContent = () => (
        <>
            <Card>
                <div className="space-y-4 text-center">
                    <h3 className="text-lg font-bold text-white">Catat Kehadiran Hari Ini</h3>
                    <p className="text-slate-400 text-sm">
                    {timeStatusMessage}
                    </p>
                    <div className="pt-2">
                        <Button
                            onClick={() => setShowScanner(true)}
                            isLoading={isSubmitting}
                            disabled={isButtonDisabled}
                            variant="primary"
                            className="w-full max-w-sm mx-auto"
                        >
                            {buttonText}
                        </Button>
                    </div>
                    {message && (
                        <p className={`text-sm text-center p-2 rounded-md mt-4 ${message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            {message.text}
                        </p>
                    )}
                </div>
            </Card>

            <Card title="Opsi Lain">
                <div className="text-center">
                    <p className="text-slate-400 mb-4 text-sm">Jika Anda tidak dapat hadir hari ini, silakan laporkan di sini.</p>
                    <Button
                        onClick={() => setIsReportAbsenceModalOpen(true)}
                        variant="secondary"
                        className="w-full max-w-sm mx-auto"
                        disabled={!!latestRecordToday}
                    >
                        Lapor Ketidakhadiran
                    </Button>
                </div>
            </Card>
            
            <Card title="Ringkasan Denda (30 Hari Terakhir)">
                <div className="text-center space-y-2">
                    <p className="text-slate-400 text-base">Total Denda Keterlambatan Anda:</p>
                    <p className="text-3xl font-bold text-amber-400">
                        Rp {totalFine.toLocaleString('id-ID')}
                    </p>
                </div>
            </Card>
        </>
    );

    const RiwayatContent = () => (
        <Card title="Riwayat Absensi (30 Hari Terakhir)">
            {isLoadingHistory ? <Spinner /> : (
                history.length > 0 ? (
                    <ul className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {history.map(record => (
                            <li key={record.id} className="flex justify-between items-center bg-slate-700/50 p-4 rounded-lg">
                                <div>
                                    <p className="font-semibold text-white">{new Date(record.timestamp).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                    <p className="text-sm text-slate-400">
                                        {record.status === 'Datang' || record.status === 'Pulang' || (record.denda > 0)
                                            ? `Datang: ${record.timestamp.toLocaleTimeString('id-ID')} ${record.checkOutTimestamp ? ` - Pulang: ${record.checkOutTimestamp.toLocaleTimeString('id-ID')}` : ''}`
                                            : record.reason || new Date(record.timestamp).toLocaleTimeString('id-ID')
                                        }
                                    </p>
                                    {record.denda > 0 && (
                                        <p className="text-sm font-semibold text-red-400 mt-1">
                                            Denda: Rp {record.denda.toLocaleString('id-ID')}
                                            <span className="text-slate-400 font-normal"> (Telat Masuk)</span>
                                        </p>
                                    )}
                                </div>
                                {getStatusBadge(record)}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-center text-slate-400 py-4">Belum ada riwayat absensi.</p>
                )
            )}
        </Card>
    );

    const ProfilContent = () => (
       <Card title="Profil Anda">
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
       </Card>
    );

    const renderContent = () => {
        switch (activeView) {
            case 'beranda': return <BerandaContent />;
            case 'riwayat': return <RiwayatContent />;
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

                <main className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Dashboard Tendik</h2>
                        <p className={`text-sm mt-1 font-semibold ${locationStatus.color}`}>{locationStatus.text}</p>
                    </div>
                    {renderContent()}
                    <footer className="text-center text-slate-500 text-sm pt-4">
                        © Rullp 2025 HadirKu. All rights reserved.
                    </footer>
                </main>

                <footer className="fixed bottom-0 left-0 right-0 bg-slate-800/80 backdrop-blur-lg border-t border-slate-700 z-20 flex justify-around">
                    <NavItem view="beranda" label="Beranda" icon={<HomeIcon />} />
                    <NavItem view="riwayat" label="Riwayat" icon={<HistoryIcon />} />
                    <NavItem view="profil" label="Profil" icon={<ProfileIcon />} />
                </footer>
            </div>
            
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
                            <input name="position" value={profileData.position || ''} onChange={handleProfileFormChange} type="text" className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" placeholder="Contoh: Kepala TU"/>
                         </div>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300">Gol/Pangkat</label>
                        <input name="rank" value={profileData.rank || ''} onChange={handleProfileFormChange} type="text" className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" placeholder="Contoh: III/d, Penata Tk. I"/>
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
                    {modalError && <p className="text-sm text-red-400">{modalError}</p>}
                    {modalSuccess && <p className="text-sm text-green-400">{modalSuccess}</p>}
                    <div className="flex justify-end pt-2">
                        <Button type="submit" isLoading={isSubmitting} className="w-full">Kirim Laporan</Button>
                    </div>
                </form>
            </Modal>
        </>
    );
};

export default AdministrativeStaffDashboard;