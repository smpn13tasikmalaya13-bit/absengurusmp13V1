import React, { useState, useEffect } from 'react';
import { getAllUsers } from '../../services/authService';
import { Role, User } from '../../types';
import { Spinner } from '../ui/Spinner';

interface ManageUsersProps {
  mode: 'teachers' | 'admins';
}

const ManageUsers: React.FC<ManageUsersProps> = ({ mode }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isTeachers = mode === 'teachers';
  const title = isTeachers ? 'Manajemen Guru & Pembina' : 'Manajemen Admin';
  
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      const allUsers = await getAllUsers();
      const filteredUsers = allUsers.filter(user => {
        if (isTeachers) {
          return user.role === Role.Teacher || user.role === Role.Coach;
        }
        return user.role === Role.Admin;
      });
      setUsers(filteredUsers);
      setIsLoading(false);
    };
    fetchUsers();
  }, [mode, isTeachers]);


  const ActionLinks: React.FC = () => (
    <div className="flex flex-col items-start space-y-1">
      {isTeachers && <button className="text-green-400 hover:underline text-sm">Kirim Pesan</button>}
      <button className="text-blue-400 hover:underline text-sm">Reset Perangkat</button>
      {isTeachers && <button className="text-red-400 hover:underline text-sm">Hapus</button>}
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">{title}</h1>
      <div className="bg-slate-900 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8"><Spinner /></div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="p-4 text-sm font-semibold text-gray-200">Nama</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">User ID (Email)</th>
                  {isTeachers && <th className="p-4 text-sm font-semibold text-gray-200">Peran</th>}
                  <th className="p-4 text-sm font-semibold text-gray-200">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-700 last:border-0">
                    <td className="p-4 whitespace-nowrap font-medium">{user.name}</td>
                    <td className="p-4 whitespace-nowrap text-gray-400">{user.email}</td>
                    {isTeachers && (
                      <td className="p-4">
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-500 text-white">
                          {user.role}
                        </span>
                      </td>
                    )}
                    <td className="p-4">
                      <ActionLinks />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
       <footer className="text-center text-gray-500 text-sm pt-4">
        © 2025 Rullp. All rights reserved.
      </footer>
    </div>
  );
};

export default ManageUsers;