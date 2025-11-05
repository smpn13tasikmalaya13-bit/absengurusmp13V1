import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { AttendanceRecord, MasterSchedule, Role, User } from '../../types';
import { getFullReport } from '../../services/attendanceService';
import { getAllUsers } from '../../services/authService';
import { getAllMasterSchedules } from '../../services/dataService';
import AttendancePieChart from './AttendancePieChart';
import { Spinner } from '../ui/Spinner';

const EmptyStateDashboard: React.FC = () => (
  <Card title="Selamat Datang di HadirKu">
    <div className="text-center py-8">
      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2-2H5a2 2 0 01-2-2z" />
      </svg>
      <h3 className="mt-2 text-lg font-medium text-white">Database Kosong</h3>
      <p className="mt-1 text-sm text-gray-400">
        Sepertinya ini adalah pertama kalinya Anda menjalankan aplikasi. Silakan mulai dengan menambahkan data melalui menu manajemen.
      </p>
    </div>
  </Card>
);

const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const DashboardContent: React.FC = () => {
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    teachers: 0,
    staff: 0,
    coaches: 0,
  });
  // State for breakdowns
  const [presentBreakdown, setPresentBreakdown] = useState({ teachers: 0, staff: 0, coaches: 0 });
  const [absentBreakdown, setAbsentBreakdown] = useState({ teachers: 0, staff: 0, coaches: 0 });

  const [recentRecords, setRecentRecords] = useState<(AttendanceRecord & { role?: Role })[]>([]);
  const [absentPersonnel, setAbsentPersonnel] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSystemEmpty, setIsSystemEmpty] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [allUsers, masterSchedules, allAttendanceRecords] = await Promise.all([
            getAllUsers(),
            getAllMasterSchedules(),
            getFullReport(),
        ]);

        if (allUsers.length <= 1 && masterSchedules.length === 0) {
            setIsSystemEmpty(true);
        } else {
            setIsSystemEmpty(false);

            const personnelUsers = allUsers.filter(u =>
                u.role === Role.Teacher ||
                u.role === Role.Coach ||
                u.role === Role.AdministrativeStaff
            );
            const totalPersonnel = personnelUsers.length;
            const teacherCount = personnelUsers.filter(u => u.role === Role.Teacher).length;
            const staffCount = personnelUsers.filter(u => u.role === Role.AdministrativeStaff).length;
            const coachCount = personnelUsers.filter(u => u.role === Role.Coach).length;

            const todayStr = getLocalDateString(new Date());
            const personnelIds = new Set(personnelUsers.map(u => u.id));

            const presentPersonnelIds = new Set(
                allAttendanceRecords
                    .filter(r => r.date === todayStr && personnelIds.has(r.teacherId))
                    .map(r => r.teacherId)
            );
            const presentCount = presentPersonnelIds.size;
            
            setStats({
                total: totalPersonnel,
                present: presentCount,
                absent: totalPersonnel - presentCount,
                teachers: teacherCount,
                staff: staffCount,
                coaches: coachCount,
            });

            const absentUsers = personnelUsers.filter(u => !presentPersonnelIds.has(u.id));
            setAbsentPersonnel(absentUsers);
            
            // Calculate breakdowns
            const presentUsers = allUsers.filter(u => presentPersonnelIds.has(u.id));
            const pBreakdown = { teachers: 0, staff: 0, coaches: 0 };
            presentUsers.forEach(user => {
                if (user.role === Role.Teacher) pBreakdown.teachers++;
                if (user.role === Role.AdministrativeStaff) pBreakdown.staff++;
                if (user.role === Role.Coach) pBreakdown.coaches++;
            });
            setPresentBreakdown(pBreakdown);

            const aBreakdown = { teachers: 0, staff: 0, coaches: 0 };
            absentUsers.forEach(user => {
                if (user.role === Role.Teacher) aBreakdown.teachers++;
                if (user.role === Role.AdministrativeStaff) aBreakdown.staff++;
                if (user.role === Role.Coach) aBreakdown.coaches++;
            });
            setAbsentBreakdown(aBreakdown);

            const userMap = new Map(allUsers.map(user => [user.id, user.role]));
            const recentWithRoles = allAttendanceRecords.slice(0, 5).map(record => ({
                ...record,
                role: userMap.get(record.teacherId)
            }));
            setRecentRecords(recentWithRoles);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);
  
  const formatDate = (date: Date) => {
    const datePart = date.toLocaleDateString('id-ID', {day: '2-digit', month: '2-digit', year: 'numeric'});
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

      {isSystemEmpty ? (
        <EmptyStateDashboard />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <h4 className="text-sm font-medium text-gray-400 text-center">Total Personil Terdaftar</h4>
              <p className="text-5xl font-bold text-white text-center py-4">{stats.total}</p>
              <div className="mt-2 pt-2 border-t border-slate-700 grid grid-cols-3 gap-1 text-center">
                  <div>
                      <p className="font-bold text-lg text-slate-200">{stats.teachers}</p>
                      <p className="text-xs text-slate-400">Guru</p>
                  </div>
                  <div>
                      <p className="font-bold text-lg text-slate-200">{stats.staff}</p>
                      <p className="text-xs text-slate-400">Tendik</p>
                  </div>
                  <div>
                      <p className="font-bold text-lg text-slate-200">{stats.coaches}</p>
                      <p className="text-xs text-slate-400">Pembina</p>
                  </div>
              </div>
            </Card>
            <Card>
              <h4 className="text-sm font-medium text-gray-400 text-center">Personil Hadir Hari Ini</h4>
              <p className="text-5xl font-bold text-emerald-400 text-center py-4">{stats.present}</p>
              <div className="mt-2 pt-2 border-t border-slate-700 grid grid-cols-3 gap-1 text-center">
                  <div>
                      <p className="font-bold text-lg text-slate-200">{presentBreakdown.teachers}</p>
                      <p className="text-xs text-slate-400">Guru</p>
                  </div>
                  <div>
                      <p className="font-bold text-lg text-slate-200">{presentBreakdown.staff}</p>
                      <p className="text-xs text-slate-400">Tendik</p>
                  </div>
                  <div>
                      <p className="font-bold text-lg text-slate-200">{presentBreakdown.coaches}</p>
                      <p className="text-xs text-slate-400">Pembina</p>
                  </div>
              </div>
            </Card>
            <Card>
              <h4 className="text-sm font-medium text-gray-400 text-center">Personil Absen Hari Ini</h4>
              <p className="text-5xl font-bold text-red-400 text-center py-4">{stats.absent}</p>
              <div className="mt-2 pt-2 border-t border-slate-700 grid grid-cols-3 gap-1 text-center">
                  <div>
                      <p className="font-bold text-lg text-slate-200">{absentBreakdown.teachers}</p>
                      <p className="text-xs text-slate-400">Guru</p>
                  </div>
                  <div>
                      <p className="font-bold text-lg text-slate-200">{absentBreakdown.staff}</p>
                      <p className="text-xs text-slate-400">Tendik</p>
                  </div>
                  <div>
                      <p className="font-bold text-lg text-slate-200">{absentBreakdown.coaches}</p>
                      <p className="text-xs text-slate-400">Pembina</p>
                  </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
                <Card title="Ringkasan Absensi Hari Ini">
                    <AttendancePieChart present={stats.present} absent={stats.absent} />
                </Card>
            </div>
            <div className="lg:col-span-3 flex flex-col gap-6">
                <Card title="Aktivitas Absensi Terbaru">
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
                <Card title="Personil Belum Absen Hari Ini">
                    <div className="overflow-y-auto max-h-80">
                        {absentPersonnel.length > 0 ? (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-600 text-sm font-semibold text-gray-200">
                                        <th className="p-3">Nama</th>
                                        <th className="p-3">Peran</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {absentPersonnel.map(user => (
                                        <tr key={user.id} className="border-b border-slate-700 last:border-0 text-sm">
                                            <td className="p-3 whitespace-nowrap">{user.name}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="p-3 text-center text-gray-400">Semua personil sudah melakukan absensi hari ini.</p>
                        )}
                    </div>
                </Card>
            </div>
          </div>
        </>
      )}

      <footer className="text-center text-gray-500 text-sm pt-4">
        © Rullp 2025 HadirKu. All rights reserved.
      </footer>
    </div>
  );
};

export default DashboardContent;