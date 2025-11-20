import React from 'react';

// Icons for the sidebar items
const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const ReportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-3-5.197M15 21a9 9 0 00-9-9" /></svg>;
const ScheduleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const DataIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10m16-10v10M9 3h6l-3 4-3-4zM9 21h6l-3-4-3 4z" /></svg>;
const QRIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h-1m-1-6v1M5 12H4m1-6H4m16 0h-1M5 18H4m1-6h1M9 4v1m0 14v1m6-16v1m0 14v1m-6-1h1m4 0h1M9 9h1m4 0h1m-4 4h1m4 0h1M9 19h1m4 0h1m-1-4h1m-5-4h1" /></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const MessageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;


interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  unreadMessageCount?: number;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  view: string;
  currentView: string;
  onNavigate: (view: string) => void;
  badgeCount?: number;
}> = ({ icon, label, view, currentView, onNavigate, badgeCount }) => {
  const isActive = currentView === view;
  return (
    <button
      onClick={() => onNavigate(view)}
      className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      }`}
    >
      <div className="flex items-center">
        {icon}
        <span className="ml-3">{label}</span>
      </div>
      {badgeCount && badgeCount > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {badgeCount}
          </span>
      )}
    </button>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, unreadMessageCount }) => {
  return (
    <aside className="w-64 bg-slate-800 p-4 space-y-2 flex flex-col h-full border-r border-slate-700">
      <div className="flex items-center mb-6 px-2">
        <h1 className="text-2xl font-bold text-indigo-400">HadirKu</h1>
        <span className="ml-2 px-2 py-1 text-xs font-semibold text-indigo-200 bg-indigo-500/30 rounded-full">Admin</span>
      </div>
      <nav className="flex-1 space-y-2">
        <NavItem icon={<DashboardIcon />} label="Dasbor" view="dashboard" currentView={currentView} onNavigate={onNavigate} />
        <NavItem icon={<MessageIcon />} label="Pesan" view="messages" currentView={currentView} onNavigate={onNavigate} badgeCount={unreadMessageCount} />
        
        <div className="pt-4">
            <h3 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Laporan</h3>
            <div className="mt-2 space-y-2">
                <NavItem icon={<ReportIcon />} label="Absensi Guru" view="teacher-attendance-report" currentView={currentView} onNavigate={onNavigate} />
                <NavItem icon={<ReportIcon />} label="Absensi Tendik" view="staff-attendance-report" currentView={currentView} onNavigate={onNavigate} />
                <NavItem icon={<ReportIcon />} label="Absensi Pembina Eskul" view="coach-attendance-report" currentView={currentView} onNavigate={onNavigate} />
                <NavItem icon={<ReportIcon />} label="Absensi Siswa" view="student-absence-report" currentView={currentView} onNavigate={onNavigate} />
            </div>
        </div>
        
        <div className="pt-4">
            <h3 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Manajemen</h3>
            <div className="mt-2 space-y-2">
        <NavItem icon={<MessageIcon />} label="Pengumuman" view="manage-announcements" currentView={currentView} onNavigate={onNavigate} />
                
                <NavItem icon={<UsersIcon />} label="Guru & Pembina" view="manage-teachers" currentView={currentView} onNavigate={onNavigate} />
                <NavItem icon={<UsersIcon />} label="Admin & Tendik" view="manage-admins" currentView={currentView} onNavigate={onNavigate} />
                <NavItem icon={<ScheduleIcon />} label="Jadwal Pelajaran" view="manage-lesson-schedule" currentView={currentView} onNavigate={onNavigate} />
                <NavItem icon={<UploadIcon />} label="Unggah Jadwal Induk" view="upload-master-schedule" currentView={currentView} onNavigate={onNavigate} />
                <NavItem icon={<UploadIcon />} label="Unggah Data Tendik" view="upload-master-staff" currentView={currentView} onNavigate={onNavigate} />
                <NavItem icon={<UploadIcon />} label="Unggah Data Pembina" view="upload-master-coach" currentView={currentView} onNavigate={onNavigate} />
                <NavItem icon={<ScheduleIcon />} label="Jadwal Eskul" view="manage-eskul-schedule" currentView={currentView} onNavigate={onNavigate} />
                <NavItem icon={<DataIcon />} label="Data Kelas" view="manage-classes" currentView={currentView} onNavigate={onNavigate} />
                <NavItem icon={<DataIcon />} label="Data Eskul" view="manage-eskuls" currentView={currentView} onNavigate={onNavigate} />
                <NavItem icon={<QRIcon />} label="QR Code Tendik" view="staff-qr-code" currentView={currentView} onNavigate={onNavigate} />
            </div>
        </div>

      </nav>
    </aside>
  );
};

export default Sidebar;