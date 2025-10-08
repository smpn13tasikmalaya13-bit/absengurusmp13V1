
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isWithinSchoolRadius, getCurrentPosition } from '../../services/locationService';
import QRScanner from './QRScanner';

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

  useEffect(() => {
    const checkLocation = async () => {
      setLocationError(null);
      try {
        const position = await getCurrentPosition();
        setIsWithinRadius(isWithinSchoolRadius(position.coords));
      } catch (error: unknown) {
        let userMessage = "Gagal mendapatkan lokasi. Pastikan GPS aktif.";
        if (error instanceof GeolocationPositionError) {
          if (error.code === error.PERMISSION_DENIED) {
            userMessage = "Izin lokasi ditolak. Aktifkan di pengaturan browser.";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            userMessage = "Informasi lokasi tidak tersedia.";
          } else if (error.code === error.TIMEOUT) {
            userMessage = "Waktu permintaan lokasi habis.";
          }
        }
        console.error("Could not get location", error);
        setLocationError(userMessage);
        setIsWithinRadius(false);
      }
    };
    checkLocation();
  }, []);

  const locationStatus = locationError
    ? { text: locationError, color: 'text-red-400' }
    : isWithinRadius === null 
    ? { text: 'Mengecek lokasi...', color: 'text-yellow-400' }
    : isWithinRadius
    ? { text: 'Anda berada di dalam radius sekolah', color: 'text-emerald-400' }
    : { text: 'Anda berada di luar radius sekolah', color: 'text-red-400' };

  if (showScanner) {
    return (
      <div className="min-h-screen bg-slate-800 p-8 flex items-center justify-center">
        <QRScanner onClose={() => setShowScanner(false)} />
      </div>
    );
  }

  return (
    <div className="bg-slate-800 text-gray-300 min-h-screen">
      {/* Header */}
      <header className="flex justify-between items-center p-4 border-b border-slate-700">
        <h1 className="text-xl font-bold">HadirKu - Sistem Absensi Guru</h1>
        <div className="flex items-center space-x-4">
          <button className="p-2 hover:bg-slate-700 rounded-full"><LocationIcon /></button>
          <button className="p-2 hover:bg-slate-700 rounded-full"><SearchIcon /></button>
          <button className="p-2 hover:bg-slate-700 rounded-full"><OptionsIcon /></button>
          <div className="w-px h-6 bg-slate-600"></div>
          <button className="p-2 hover:bg-slate-700 rounded-full"><MailIcon /></button>
          <button onClick={logout} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm rounded-md font-semibold">Keluar</button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-white">Dashboard Guru</h2>
          <p className="text-slate-400">Selamat datang, {user?.name || 'gurulaptop'}</p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <button onClick={() => setShowScanner(true)} className="bg-slate-700 p-6 rounded-lg text-left hover:bg-slate-600 transition-colors">
            <QrCodeIcon/>
            <h3 className="font-bold text-lg mt-4 text-white">Scan QR Code</h3>
            <p className="text-sm text-slate-400">Scan QR Code kelas untuk absensi</p>
            <p className={`text-sm mt-2 font-semibold ${locationStatus.color}`}>{locationStatus.text}</p>
          </button>
          <div className="bg-slate-700 p-6 rounded-lg">
            <ScheduleIcon/>
            <h3 className="font-bold text-lg mt-4 text-white">Jadwal Mengajar</h3>
            <p className="text-sm text-slate-400">Lihat dan kelola jadwal mengajar Anda</p>
          </div>
          <div className="bg-slate-700 p-6 rounded-lg">
            <ReportIcon/>
            <h3 className="font-bold text-lg mt-4 text-white">Lapor Ketidakhadiran</h3>
            <p className="text-sm text-slate-400">Laporkan jika tidak dapat hadir hari ini</p>
          </div>
          <div className="bg-slate-700 p-6 rounded-lg">
            <StudentIcon/>
            <h3 className="font-bold text-lg mt-4 text-white">Lapor Siswa Absen</h3>
            <p className="text-sm text-slate-400">Input siswa yang tidak hadir hari ini</p>
            <p className="text-sm mt-2 font-semibold text-yellow-400">Tidak ada jadwal hari ini</p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-700 p-4 rounded-lg flex items-center">
            <div className="p-3 bg-slate-600 rounded-md mr-4 text-slate-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div>
              <p className="text-sm text-slate-400">Absensi Hari Ini</p>
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-xs text-slate-500">Jam pelajaran yang sudah diabsen</p>
            </div>
          </div>
           <div className="bg-slate-700 p-4 rounded-lg flex items-center">
             <div className="p-3 bg-slate-600 rounded-md mr-4 text-slate-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </div>
            <div>
              <p className="text-sm text-slate-400">Minggu Ini</p>
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-xs text-slate-500">Total absensi minggu ini</p>
            </div>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg flex items-center">
             <div className="p-3 bg-slate-600 rounded-md mr-4 text-slate-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             </div>
            <div>
              <p className="text-sm text-slate-400">Total Absensi</p>
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-xs text-slate-500">Semua absensi Anda</p>
            </div>
          </div>
        </div>

        {/* Detail Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-700 p-6 rounded-lg min-h-[250px] flex flex-col">
            <h3 className="font-bold text-lg text-white">Riwayat Absensi Terbaru</h3>
            <p className="text-sm text-slate-400 mb-4">10 absensi terakhir Anda</p>
            <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-500">
              <EmptyHistoryIcon />
              <p className="font-semibold mt-4">Belum ada riwayat absensi</p>
              <p className="text-sm">Scan QR Code kelas untuk mulai absensi</p>
            </div>
          </div>
          <div className="bg-slate-700 p-6 rounded-lg min-h-[250px] flex flex-col">
            <h3 className="font-bold text-lg text-white">Jadwal Hari Ini</h3>
            <p className="text-sm text-slate-400 mb-4">Jadwal mengajar Anda hari ini</p>
             <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-500">
              <EmptyScheduleIcon />
              <p className="font-semibold mt-4">Belum ada jadwal mengajar</p>
              <p className="text-sm">Hubungi admin untuk mengatur jadwal</p>
            </div>
          </div>
        </div>
        
        {/* Student Report Card */}
        <div className="bg-slate-700 p-6 rounded-lg min-h-[250px] flex flex-col">
          <h3 className="font-bold text-lg text-white">Laporan Siswa Tidak Hadir Hari Ini</h3>
          <p className="text-sm text-slate-400 mb-4">Daftar siswa yang Anda laporkan tidak hadir</p>
          <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-500">
            <EmptyReportIcon />
            <p className="font-semibold mt-4">Belum ada laporan</p>
            <p className="text-sm">Klik tombol 'Lapor Siswa Absen' untuk menambahkan.</p>
          </div>
        </div>

      </main>
      
      {/* Footer */}
      <footer className="text-center text-slate-500 text-sm p-6">
        © 2025 Rullp. All rights reserved.
      </footer>
    </div>
  );
};

export default TeacherDashboard;
