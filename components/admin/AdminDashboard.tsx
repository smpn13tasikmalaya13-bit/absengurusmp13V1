
import React, { useState } from 'react';
import Sidebar from '../layout/Sidebar';
import DashboardContent from './DashboardContent';
import TeacherAttendanceReportPage from './TeacherAttendanceReportPage';
import StaffAttendanceReportPage from './StaffAttendanceReportPage'; // Import baru
import StudentAbsenceReportPage from './StudentAbsenceReportPage';
import ManageUsers from './ManageUsers';
import ManageLessonSchedule from './ManageLessonSchedule';
import ManageExtracurricularSchedule from './ManageExtracurricularSchedule';
import ManageClasses from './ManageClasses';
import ManageExtracurriculars from './ManageExtracurriculars';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import StaffQRCodeGenerator from './StaffQRCodeGenerator';

const AdminDashboard: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for mobile sidebar

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardContent />;
      case 'teacher-attendance-report':
        return <TeacherAttendanceReportPage />;
      case 'staff-attendance-report': // Case baru
        return <StaffAttendanceReportPage />;
      case 'student-absence-report':
        return <StudentAbsenceReportPage />;
      case 'manage-teachers':
        return <ManageUsers mode="teachers" />;
      case 'manage-admins':
        return <ManageUsers mode="admins" />;
      case 'manage-lesson-schedule':
        return <ManageLessonSchedule />;
      case 'manage-eskul-schedule':
        return <ManageExtracurricularSchedule />;
      case 'manage-classes':
        return <ManageClasses />;
      case 'manage-eskuls':
        return <ManageExtracurriculars />;
      case 'staff-qr-code':
        return <StaffQRCodeGenerator />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-900 text-slate-300">
      {/* Sidebar for larger screens */}
      <div className="hidden md:block">
          <Sidebar currentView={currentView} onNavigate={setCurrentView} />
      </div>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-70 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)}>
              <div className="w-64 h-full" onClick={(e) => e.stopPropagation()}>
                 <Sidebar currentView={currentView} onNavigate={(view) => { setCurrentView(view); setIsSidebarOpen(false); }} />
              </div>
          </div>
      )}
      
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 md:hidden p-4 flex justify-between items-center sticky top-0 z-20">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarOpen(true)} className="text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                </button>
                 <div className="text-left">
                    <p className="text-xs text-slate-400 whitespace-nowrap">Selamat datang,</p>
                    <p className="font-semibold text-white -mt-1 whitespace-nowrap">{user?.name}</p>
                </div>
            </div>
            <button onClick={logout} aria-label="Logout" className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                </svg>
            </button>
        </header>

        {/* Desktop Header */}
         <header className="hidden md:flex bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 p-4 justify-between items-center sticky top-0 z-20">
            <div className="text-left">
                <p className="text-xs text-slate-400 whitespace-nowrap">Selamat datang,</p>
                <p className="font-semibold text-white -mt-1 whitespace-nowrap">{user?.name}</p>
            </div>
            <button onClick={logout} aria-label="Logout" className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                </svg>
            </button>
        </header>


        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;