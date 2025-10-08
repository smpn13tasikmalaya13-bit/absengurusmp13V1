import React, { useState } from 'react';
import Sidebar from '../layout/Sidebar';
import DashboardContent from './DashboardContent';
import ManageUsers from './ManageUsers';
import ManageClasses from './ManageClasses';
import ManageEskuls from './ManageExtracurriculars';
import ManageLessonSchedule from './ManageLessonSchedule';
import ManageEskulSchedule from './ManageExtracurricularSchedule';
import TeacherAttendanceReportPage from './TeacherAttendanceReportPage';
import StudentAbsenceReportPage from './StudentAbsenceReportPage';

export type AdminPage = 
  | 'dashboard'
  | 'manageTeachers'
  | 'manageAdmins'
  | 'manageClasses'
  | 'manageEskuls'
  | 'manageLessonSchedule'
  | 'manageEskulSchedule'
  | 'reportTeacherAttendance'
  | 'reportStudentAbsence';

const AdminDashboard: React.FC = () => {
  const [activePage, setActivePage] = useState<AdminPage>('dashboard');

  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardContent />;
      case 'manageTeachers':
        return <ManageUsers mode="teachers" />;
      case 'manageAdmins':
        return <ManageUsers mode="admins" />;
      case 'manageClasses':
        return <ManageClasses />;
      case 'manageEskuls':
        return <ManageEskuls />;
      case 'manageLessonSchedule':
        return <ManageLessonSchedule />;
      case 'manageEskulSchedule':
        return <ManageEskulSchedule />;
      case 'reportTeacherAttendance':
        return <TeacherAttendanceReportPage />;
      case 'reportStudentAbsence':
        return <StudentAbsenceReportPage />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-800 text-gray-300">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default AdminDashboard;