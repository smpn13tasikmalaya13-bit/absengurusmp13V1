
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
            <button onClick={logout} aria-label="Logout" className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-indigo-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;