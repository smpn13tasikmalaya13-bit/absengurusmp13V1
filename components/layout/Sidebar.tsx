import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AdminPage } from '../admin/AdminDashboard';

interface SidebarProps {
  activePage: AdminPage;
  onNavigate: (page: AdminPage) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  const { user, logout } = useAuth();

  const navItems: { label: string; page: AdminPage }[] = [
    { label: 'Dashboard', page: 'dashboard' },
    { label: 'Data Guru & Pembina', page: 'manageTeachers' },
    { label: 'Data Admin', page: 'manageAdmins' },
    { label: 'Data Kelas', page: 'manageClasses' },
    { label: 'Data Ekstrakurikuler', page: 'manageExtracurriculars' },
    { label: 'Jadwal Pelajaran', page: 'manageLessonSchedule' },
    { label: 'Jadwal Ekstrakurikuler', page: 'manageExtraSchedule' },
    { label: 'Laporan Absensi Guru', page: 'reportTeacherAttendance' },
    { label: 'Laporan Siswa Absen', page: 'reportStudentAbsence' },
  ];

  return (
    <div className="w-64 bg-slate-900 text-gray-300 flex flex-col h-screen fixed top-0 left-0">
      <div className="p-6">
        <h2 className="text-xl font-bold text-white">Panel Admin</h2>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.page}
            onClick={() => onNavigate(item.page)}
            className={`w-full text-left block px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activePage === item.page
                ? 'bg-slate-700 text-white'
                : 'hover:bg-slate-700 hover:text-white'
            }`}
            aria-current={activePage === item.page ? 'page' : undefined}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-700">
        <p className="font-semibold text-white">{user?.name || 'AdminLaptop'}</p>
        <button
          onClick={logout}
          className="text-sm text-red-400 hover:text-red-300 transition-colors"
        >
          Keluar
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
