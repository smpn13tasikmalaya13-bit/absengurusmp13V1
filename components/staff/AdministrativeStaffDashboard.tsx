import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isWithinSchoolRadius, getCurrentPosition } from '../../services/locationService';
import { recordStaffAttendanceWithQR, getAttendanceForTeacher } from '../../services/attendanceService';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { AttendanceRecord } from '../../types';
import { Card } from '../ui/Card';
import QRScanner from './QRScanner';

const AdministrativeStaffDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [isWithinRadius, setIsWithinRadius] = useState<boolean | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [history, setHistory] = useState<AttendanceRecord[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [showScanner, setShowScanner] = useState(false);

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
            const records = await getAttendanceForTeacher(user.id, 10);
            setHistory(records);
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

    // Weekday check-in: 05:00 s.d. 07:15
    const isCheckInTime = !isWeekend && currentHour >= 5 && (currentHour < 7 || (currentHour === 7 && currentMinute <= 15));
    
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

    const hasClockedIn = !!latestRecordToday;
    const hasClockedOut = latestRecordToday?.status === 'Pulang';
    
    // Determine button state and text
    let buttonText = '';
    let timeStatusMessage = '';
    let isButtonDisabledByTime = false; // Default to enabled unless a rule disables it

    if (isWeekend) {
        // Weekend Logic for Overtime
        if (hasClockedOut) {
            buttonText = 'Selesai Absen Lembur';
            timeStatusMessage = 'Anda sudah menyelesaikan absensi lembur hari ini.';
            isButtonDisabledByTime = true;
        } else if (hasClockedIn) {
            buttonText = 'Scan QR untuk Absen Pulang (Lembur)';
            timeStatusMessage = 'Absensi lembur di akhir pekan. Silakan catat waktu pulang Anda.';
        } else {
            buttonText = 'Scan QR untuk Absen Datang (Lembur)';
            timeStatusMessage = 'Absensi lembur di akhir pekan. Silakan catat kehadiran Anda.';
        }
    } else {
        // Weekday Logic (Existing Rules)
        if (hasClockedOut) {
            buttonText = 'Selesai Absen';
            timeStatusMessage = 'Anda sudah menyelesaikan absensi hari ini.';
            isButtonDisabledByTime = true;
        } else if (hasClockedIn) {
            buttonText = 'Scan QR untuk Absen Pulang';
            if (isCheckOutTime) {
                timeStatusMessage = `Absen pulang (${currentDay === 5 ? 'Jumat' : 'Senin-Kamis'}) dibuka pukul ${checkOutStartTime} - ${checkOutEndTime}. Silakan absen.`;
                isButtonDisabledByTime = false;
            } else {
                timeStatusMessage = `Belum waktunya absen pulang. Dibuka pukul ${checkOutStartTime} - ${checkOutEndTime}.`;
                isButtonDisabledByTime = true;
            }
        } else { // Not clocked in yet
            buttonText = 'Scan QR untuk Absen Datang';
            if (isCheckInTime) {
                timeStatusMessage = 'Absen datang dibuka pukul 05:00 - 07:15. Silakan absen.';
                isButtonDisabledByTime = false;
            } else {
                 if (currentHour < 5) {
                    timeStatusMessage = 'Belum waktunya absen datang. Dibuka pukul 05:00.';
                 } else {
                    timeStatusMessage = 'Waktu absen datang sudah berakhir pada 07:15.';
                 }
                 isButtonDisabledByTime = true;
            }
        }
    }
    
    const isButtonDisabled = isWithinRadius !== true || isSubmitting || isButtonDisabledByTime;

    if (showScanner) {
        return <QRScanner onScanSuccess={handleScanSuccess} onClose={() => setShowScanner(false)} />;
    }

    return (
        <div className="bg-slate-900 text-slate-300 min-h-screen">
            <header className="flex justify-between items-center p-4 border-b border-slate-700/50 sticky top-0 bg-slate-900/50 backdrop-blur-sm z-10">
                <h1 className="text-xl font-bold text-white">Dashboard Staf</h1>
                <Button onClick={logout} variant="secondary" className="w-auto py-1.5 px-3 text-sm">Keluar</Button>
            </header>

            <main className="p-6 md:p-8 space-y-8 max-w-4xl mx-auto">
                <div>
                    <h2 className="text-3xl font-bold text-white">Absensi Tenaga Administrasi</h2>
                    <p className="text-slate-400 mt-1">Selamat datang, {user?.name || 'Staf'}</p>
                    <p className={`text-sm mt-2 font-semibold ${locationStatus.color}`}>{locationStatus.text}</p>
                </div>

                <Card>
                    <div className="space-y-4 text-center">
                        <h3 className="text-xl font-bold text-white">Catat Kehadiran Hari Ini</h3>
                        <p className="text-slate-400">
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
                
                <Card title="Riwayat Absensi Terkini">
                    {isLoadingHistory ? <Spinner /> : (
                        history.length > 0 ? (
                            <ul className="space-y-3">
                                {history.map(record => (
                                    <li key={record.id} className="flex justify-between items-center bg-slate-700/50 p-4 rounded-lg">
                                        <div>
                                            <p className="font-semibold text-white">{new Date(record.timestamp).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                            <p className="text-sm text-slate-400">
                                                Datang: {record.timestamp.toLocaleTimeString('id-ID')}
                                                {record.checkOutTimestamp && ` - Pulang: ${record.checkOutTimestamp.toLocaleTimeString('id-ID')}`}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${record.status === 'Datang' ? 'bg-emerald-500/30 text-emerald-200' : 'bg-blue-500/30 text-blue-200'}`}>
                                            {record.status}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-slate-400 py-4">Belum ada riwayat absensi.</p>
                        )
                    )}
                </Card>
                 <footer className="text-center text-slate-500 text-sm pt-4">
                    © 2025 Rullp. All rights reserved.
                </footer>
            </main>
        </div>
    );
};

export default AdministrativeStaffDashboard;