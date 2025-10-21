import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { AttendanceRecord, Role, User } from '../../types';
import { getAttendanceReport, getFullReport } from '../../services/attendanceService';
import { getAllUsers } from '../../services/authService';
import AttendancePieChart from './AttendancePieChart';
import { Spinner } from '../ui/Spinner';
import { Button } from '../ui/Button';
import { seedDatabase } from '../../services/seedDatabase';
import QRCodeGenerator from './QRCodeGenerator';

interface StatCardProps {
  title: string;
  value: number | string;
  colorClass?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, colorClass = 'text-white' }) => (
  <Card>
    <h4 className="text-sm font-medium text-gray-400">{title}</h4>
    <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
  </Card>
);

const EmptyStateDashboard: React.FC<{ onSeedClick: () => void; isSeeding: boolean }> = ({ onSeedClick, isSeeding }) => (
  <Card title="Selamat Datang di HadirKu">
    <div className="text-center py-8">
      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2-2H5a2 2 0 01-2-2z" />
      </svg>
      <h3 className="mt-2 text-lg font-medium text-white">Database Kosong</h3>
      <p className="mt-1 text-sm text-gray-400">
        Sepertinya ini adalah pertama kalinya Anda menjalankan aplikasi. Untuk memulai, isi database dengan data awal.
      </p>
      <div className="mt-6">
        <Button
          onClick={onSeedClick}
          isLoading={isSeeding}
          variant="primary"
          className="w-auto !bg-blue-600 hover:!bg-blue-700"
        >
          Isi Data Awal (Seed Database)
        </Button>
      </div>
    </div>
  </Card>
);

const DashboardContent: React.FC = () => {
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 });
  const [recentRecords, setRecentRecords] = useState<(AttendanceRecord & { role?: Role })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const allUsers = await getAllUsers();
        const userMap = new Map(allUsers.map(user => [user.id, user.role]));

        const totalTeachers = allUsers.filter(u => u.role === Role.Teacher || u.role === Role.Coach).length;
        
        const today = new Date();
        const presentRecords = await getAttendanceReport(today);
        const presentCount = presentRecords.length;

        const recent = await getFullReport(5);
        const recentWithRoles = recent.map(record => ({
            ...record,
            role: userMap.get(record.teacherId)
        }));

        setStats({
          total: totalTeachers,
          present: presentCount,
          absent: totalTeachers - presentCount,
        });
        setRecentRecords(recentWithRoles);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);
  
  const handleSeedDatabase = async () => {
      if (window.confirm("Are you sure you want to seed the database? This will add mock data and should only be done on a fresh database.")) {
          setIsSeeding(true);
          try {
              await seedDatabase();
              // Reload to reflect new data
              window.location.reload();
          } catch (error) {
              console.error(error);
          } finally {
              setIsSeeding(false);
          }
      }
  };


  const formatDate = (date: Date) => {
    const datePart = date.toLocaleDateString('en-GB'); // dd/mm/yyyy
    const timePart = date.toLocaleTimeString('id-ID', { hour12: false }).replace(/\./g, ':');
    return `${datePart}, ${timePart}`;
  };
  
  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-full">
            <Spinner />
        </div>
    );
  }
  
  const isDataEmpty = stats.total === 0 && recentRecords.length === 0;
  
    const getRoleBadgeClass = (role?: Role) => {
    if (!role) return 'bg-gray-500/30 text-gray-300';
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      </div>

      {isDataEmpty ? (
        <EmptyStateDashboard onSeedClick={handleSeedDatabase} isSeeding={isSeeding} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard title="Total Guru" value={stats.total} />
            <StatCard title="Guru Hadir Hari Ini" value={stats.present} colorClass="text-emerald-400" />
            <StatCard title="Guru Absen Hari Ini" value={stats.absent} colorClass="text-red-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card title="Ringkasan Absensi Hari Ini">
                    <AttendancePieChart present={stats.present} absent={stats.absent} />
                </Card>
                <QRCodeGenerator />
            </div>
            <div className="lg:col-span-3">
                <Card title="Aktivitas Absensi Terbaru" className="h-full">
                  <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-600 text-sm font-semibold text-gray-200">
                                    <th className="p-3">Pengguna</th>
                                    <th className="p-3">Peran</th>
                                    <th className="p-3">Waktu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentRecords.length > 0 ? recentRecords.map(record => (
                                    <tr key={record.id} className="border-b border-slate-700 last:border-0 text-sm">
                                        <td className="p-3 whitespace-nowrap">{record.userName}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeClass(record.role)}`}>
                                                {record.role || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-gray-400">{formatDate(record.timestamp)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                      <td colSpan={3} className="p-3 text-center text-gray-400">Belum ada aktivitas.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                  </div>
                </Card>
            </div>
          </div>
        </>
      )}

      <Card title="Developer Tools">
          <div className="flex flex-col items-start space-y-4">
              <p className="text-sm text-gray-400">Gunakan tombol ini untuk mengisi database Firebase yang kosong dengan data awal (kelas, eskul, jadwal).</p>
              <Button
                  onClick={handleSeedDatabase}
                  isLoading={isSeeding}
                  variant="secondary"
                  className="w-auto !bg-amber-600 hover:!bg-amber-700 !text-white"
                >
                  Seed Initial Data
              </Button>
          </div>
      </Card>

      <footer className="text-center text-gray-500 text-sm pt-4">
        © Rullp 2025 HadirKu. All rights reserved.
      </footer>
    </div>
  );
};

export default DashboardContent;