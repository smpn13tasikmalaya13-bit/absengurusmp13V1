
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
             <h1 className="text-xl font-bold text-blue-600">HadirKu</h1>
          </div>
          <div className="flex items-center">
            <span className="text-gray-700 mr-4">
              Welcome, <span className="font-medium">{user?.name}</span>
            </span>
            <Button onClick={logout} variant="secondary" className="w-auto py-1 px-3 text-sm">
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
