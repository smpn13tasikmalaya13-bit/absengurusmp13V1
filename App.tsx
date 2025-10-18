import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/auth/Login';
import AdminDashboard from './components/admin/AdminDashboard';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import AdministrativeStaffDashboard from './components/staff/AdministrativeStaffDashboard'; // Import the new dashboard
import { Role } from './types';
import Layout from './components/layout/Layout';
import { Spinner } from './components/ui/Spinner';

const AppContent: React.FC = () => {
  const { user, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }
  
  // Admin now has its own route, separate from staff
  if (user.role === Role.Admin) {
    return <Layout><AdminDashboard /></Layout>;
  }

  // New route for Administrative Staff
  if (user.role === Role.AdministrativeStaff) {
    return <AdministrativeStaffDashboard />;
  }

  if (user.role === Role.Teacher || user.role === Role.Coach) {
    return <TeacherDashboard />;
  }

  return <Login />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
