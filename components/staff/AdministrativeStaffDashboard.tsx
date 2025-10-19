import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isWithinSchoolRadius, getCurrentPosition } from '../../services/locationService';
import { recordAdministrativeStaffAttendance, getAttendanceForTeacher } from '../../services/attendanceService';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { AttendanceRecord } from '../../types';
import { Card } from '../ui/Card';

const AdministrativeStaffDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const [isWithinRadius, setIsWithinRadius] = useState<boolean | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [history, setHistory] = useState<AttendanceRecord[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

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

    const handleAttendance = async (type: 'Datang' | 'Pulang') => {
        if (!user) return;
        setIsSubmitting(true);
        setMessage(null);
        const result = await recordAdministrativeStaffAttendance(user, type);
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
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white">Catat Kehadiran Hari Ini</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Button
                                onClick={() => handleAttendance('Datang')}
                                isLoading={isSubmitting}
                                disabled={isWithinRadius !== true || isSubmitting}
                                variant="primary"
                            >
                                Absen Datang
                            </Button>
                            <Button
                                onClick={() => handleAttendance('Pulang')}
                                isLoading={isSubmitting}
                                disabled={isWithinRadius !== true || isSubmitting}
                                variant="secondary"
                            >
                                Absen Pulang
                            </Button>
                        </div>
                        {message && (
                            <p className={`text-sm text-center p-2 rounded-md ${message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
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
                                                {record.checkOutTimestamp && ` - Pulang: ${new Date(record.checkOutTimestamp).toLocaleTimeString('id-ID')}`}
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
