import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { getAttendanceForTeacher, recordAdministrativeStaffAttendance } from '../../services/attendanceService';
import { AttendanceRecord } from '../../types';
import QRScanner from './QRScanner';
import { Spinner } from '../ui/Spinner';

const ClockInIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>;
const ClockOutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>;

const AdministrativeStaffDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [showScanner, setShowScanner] = useState(false);
    const [scannerMode, setScannerMode] = useState<'Datang' | 'Pulang' | null>(null);
    const [attendanceStatus, setAttendanceStatus] = useState<'none' | 'datang' | 'pulang'>('none');
    const [isLoading, setIsLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchAttendanceStatus = async () => {
        if (!user) return;
        setIsLoading(true);
        const todayStr = new Date().toISOString().split('T')[0];
        const records = await getAttendanceForTeacher(user.id, 1);
        const todaysRecord = records.find(r => r.date === todayStr);

        if (todaysRecord) {
            if (todaysRecord.status === 'Pulang') {
                setAttendanceStatus('pulang');
            } else if (todaysRecord.status === 'Datang') {
                setAttendanceStatus('datang');
            }
        } else {
            setAttendanceStatus('none');
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchAttendanceStatus();
    }, [user]);
    
    const timeLimits = useMemo(() => {
        const now = currentTime;
        const clockInStart = new Date(now);
        clockInStart.setHours(5, 0, 0, 0); // 5:00 AM
        const clockInEnd = new Date(now);
        clockInEnd.setHours(7, 15, 0, 0); // 7:15 AM
        const clockOutStart = new Date(now);
        clockOutStart.setHours(15, 15, 0, 0); // 3:15 PM

        return {
            isClockInTime: now >= clockInStart && now <= clockInEnd,
            isClockOutTime: now >= clockOutStart,
        };
    }, [currentTime]);

    const handleScanSuccess = async (qrData: string, type: 'Datang' | 'Pulang') => {
        setShowScanner(false);
        if (!user) return;
        
        setIsLoading(true);
        const result = await recordAdministrativeStaffAttendance(user, type);
        alert(result.message);
        if (result.success) {
            await fetchAttendanceStatus();
        }
        setIsLoading(false);
    };

    const openScanner = (mode: 'Datang' | 'Pulang') => {
        setScannerMode(mode);
        setShowScanner(true);
    }
    
    if (showScanner && scannerMode) {
        return <QRScanner onScanSuccess={(qr) => handleScanSuccess(qr, scannerMode)} onClose={() => setShowScanner(false)} />;
    }

    const getStatusInfo = () => {
        switch (attendanceStatus) {
            case 'datang':
                return { text: 'Anda sudah absen datang hari ini.', color: 'text-emerald-400' };
            case 'pulang':
                return { text: 'Anda sudah absen datang dan pulang hari ini. Sampai jumpa besok!', color: 'text-blue-400' };
            default:
                 return { text: 'Anda belum melakukan absensi hari ini.', color: 'text-yellow-400' };
        }
    };
    const statusInfo = getStatusInfo();

    return (
        <div className="bg-slate-900 text-slate-300 min-h-screen">
            <header className="flex justify-between items-center p-4 border-b border-slate-700/50 sticky top-0 bg-slate-900/50 backdrop-blur-sm z-10">
                <h1 className="text-xl font-bold text-white">Dashboard Staf Administrasi</h1>
                <Button onClick={logout} variant="secondary" className="w-auto py-1.5 px-3 text-sm">Keluar</Button>
            </header>

            <main className="p-6 md:p-8 space-y-8 flex flex-col items-center">
                 <div className="text-center">
                    <h2 className="text-3xl font-bold text-white">Selamat Datang, {user?.name}</h2>
                    <p className="text-slate-400 mt-2 text-lg">
                        {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        {' - '}
                        <span className="font-mono">{currentTime.toLocaleTimeString('id-ID')}</span>
                    </p>
                </div>
                
                {isLoading ? <Spinner /> : (
                    <div className="w-full max-w-4xl space-y-8">
                         <div className={`text-center p-4 rounded-lg border ${statusInfo.color.replace('text-', 'border-').replace('-400', '-500/50')} ${statusInfo.color.replace('text-', 'bg-').replace('-400', '-500/10')}`}>
                            <p className={`font-semibold ${statusInfo.color}`}>{statusInfo.text}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <button
                                onClick={() => openScanner('Datang')}
                                disabled={!timeLimits.isClockInTime || attendanceStatus !== 'none'}
                                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-8 rounded-xl text-center hover:border-emerald-500 hover:bg-slate-800/80 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-700 flex flex-col items-center justify-center space-y-4"
                            >
                                <ClockInIcon />
                                <h3 className="font-bold text-2xl text-white">Absen Datang</h3>
                                <p className="text-sm text-slate-400">
                                    {timeLimits.isClockInTime ? 'Ketuk untuk scan QR Code' : 'Absen datang dibuka pukul 05:00 - 07:15'}
                                </p>
                            </button>

                            <button
                                onClick={() => openScanner('Pulang')}
                                disabled={!timeLimits.isClockOutTime || attendanceStatus !== 'datang'}
                                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-8 rounded-xl text-center hover:border-red-500 hover:bg-slate-800/80 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-700 flex flex-col items-center justify-center space-y-4"
                            >
                                <ClockOutIcon />
                                <h3 className="font-bold text-2xl text-white">Absen Pulang</h3>
                                <p className="text-sm text-slate-400">
                                     {attendanceStatus === 'none' ? 'Harap absen datang terlebih dahulu' : timeLimits.isClockOutTime ? 'Ketuk untuk scan QR Code' : 'Absen pulang dibuka setelah pukul 15:15'}
                                </p>
                            </button>
                        </div>
                    </div>
                )}
                 <footer className="text-center text-slate-500 text-sm pt-8">
                    © 2025 Rullp. All rights reserved.
                </footer>
            </main>
        </div>
    );
};

export default AdministrativeStaffDashboard;
