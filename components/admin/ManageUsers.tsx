import React, { useState, useEffect, useCallback } from 'react';
import { getAllUsers, deleteUser } from '../../services/authService';
import { Role, User } from '../../types';
import { Spinner } from '../ui/Spinner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface ManageUsersProps {
  mode: 'teachers' | 'admins';
}

const ManageUsers: React.FC<ManageUsersProps> = ({ mode }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isTeachers = mode === 'teachers';
  const title = isTeachers ? 'Manajemen Guru & Pembina' : 'Manajemen Admin';
  
  const fetchUsers = useCallback(async () => {
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
  }, [isTeachers]);
  
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // === DELETE MODAL LOGIC ===
  const handleOpenDeleteModal = (user: User) => {
    setUserToDelete(user);
    setError('');
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    if (isSubmitting) return;
    setIsDeleteModalOpen(false);
    setUserToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setError('');
    setIsSubmitting(true);
    try {
      await deleteUser(userToDelete.id);
      handleCloseDeleteModal();
      await fetchUsers(); // Refetch users
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus pengguna.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
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
                        <div className="flex flex-col items-start space-y-1">
                          {isTeachers && <button className="text-green-400 hover:underline text-sm">Kirim Pesan</button>}
                          <button className="text-blue-400 hover:underline text-sm">Reset Perangkat</button>
                          <button onClick={() => handleOpenDeleteModal(user)} className="text-red-400 hover:underline text-sm">Hapus</button>
                        </div>
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

      {/* DELETE CONFIRMATION MODAL */}
      {userToDelete && (
        <Modal isOpen={isDeleteModalOpen} onClose={handleCloseDeleteModal} title="Konfirmasi Hapus">
          <div className="space-y-4">
            <p className="text-gray-300">
              Apakah Anda yakin ingin menghapus pengguna <strong>{userToDelete.name}</strong>? Tindakan ini hanya menghapus profil dari database, bukan akun login.
            </p>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex justify-end space-x-3 pt-2">
              <Button type="button" onClick={handleCloseDeleteModal} variant="secondary" className="w-auto !bg-slate-600 hover:!bg-slate-500 !text-white" disabled={isSubmitting}>
                Batal
              </Button>
              <Button onClick={handleConfirmDelete} isLoading={isSubmitting} variant="danger" className="w-auto">
                Hapus
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default ManageUsers;