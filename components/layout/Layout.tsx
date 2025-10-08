import React, { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();
  
  if (user?.role === Role.Admin) {
    // The AdminDashboard now contains the Sidebar and manages its state
    return <>{children}</>;
  }

  // Fallback for other roles (e.g., Teacher) to use a simpler layout
  return (
    <div className="min-h-screen bg-slate-800">
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
