import React, { useState, useEffect, useCallback } from 'react';
import {
    getAllUsers,
    deleteUser,
    resetDeviceBinding,
    register,
} from '../../services/authService';
import { Role, User } from '../../types';
import { Spinner } from '../ui/Spinner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { MAIN_ADMIN_EMAIL } from '../../constants';
import { useAuth } from '../../context/AuthContext';


interface ManageUsersProps {
  mode: 'teachers' | 'admins';
}

// FIX: Using React.FC to resolve JSX namespace error.
const ManageUsers: React.FC<ManageUsersProps> = ({ mode }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  
  // Data for modals
  const [userToAction, setUserToAction] = useState<User | null>(null);
  const [newAdminData, setNewAdminData] = useState({ name: '', email: '', password: '' });

  // General state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Main Admin state
  const { user: loggedInUser } = useAuth();

  // Directly check if the logged in user is the main admin.
  const isMainAdmin = loggedInUser?.email === MAIN_ADMIN_EMAIL;
  const isTeachers = mode === 'teachers';
  const title = isTeachers ? 'Manajemen Guru & Pembina' : 'Manajemen Admin & Staf';
  
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const allUsers = await getAllUsers();
    const filteredUsers = allUsers.filter(user => {
      if (isTeachers) {
        return user.role === Role.Teacher || user.role === Role.Coach;
      }
      return user.role === Role.Admin || user.role === Role.AdministrativeStaff;
    });
    setUsers(filteredUsers);
    setIsLoading(false);
  }, [isTeachers]);
  
  // Effect to fetch the list of users to display in the table.
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // === DELETE MODAL LOGIC ===
  const handleOpenDeleteModal = (user: User) => {
    setUserToAction(user);
    clearMessages();
    setIsDeleteModalOpen(true);
  };
  const handleConfirmDelete = async () => {
    if (!userToAction) return;
    clearMessages();
    setIsSubmitting(true);
    try {
      await deleteUser(userToAction.id);
      setIsDeleteModalOpen(false);
      setUserToAction(null);
      await fetchUsers();
      // FIX: Explicitly type error in catch block.
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus pengguna.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // === RESET DEVICE MODAL LOGIC ===
  const handleOpenResetModal = (user: User) => {
    setUserToAction(user);
    clearMessages();
    setIsResetModalOpen(true);
  };
  const handleConfirmReset = async () => {
    if (!userToAction) return;
    clearMessages();
    setIsSubmitting(true);
    try {
      await resetDeviceBinding(userToAction.id);
      setSuccess(`Ikatan perangkat untuk ${userToAction.name} berhasil direset.`);
      setTimeout(() => {
        setIsResetModalOpen(false);
        setUserToAction(null);
        clearMessages();
      }, 2000);
      // FIX: Explicitly type error in catch block.
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Gagal mereset perangkat.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // === ADD ADMIN MODAL LOGIC ===
  const handleOpenAddAdminModal = () => {
    setNewAdminData({ name: '', email: '', password: '' });
    clearMessages();
    setIsAddAdminModalOpen(true);
  };
  const handleAddAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsSubmitting(true);
    try {
      // Pass the static key for validation when an admin adds another admin
      await register(newAdminData.name, newAdminData.email, newAdminData.password, Role.Admin, "adm13v1");
      setSuccess(`Admin ${newAdminData.name} berhasil ditambahkan.`);
      await fetchUsers();
      setTimeout(() => {
        setIsAddAdminModalOpen(false);
        clearMessages();
      }, 2000);
      // FIX: Explicitly type error in catch block.
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Gagal menambah admin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = (modalSetter: React.Dispatch<React.SetStateAction<boolean>>) => {
      if(isSubmitting) return;
      modalSetter(false);
      setUserToAction(null);
  }

  const getRoleBadgeClass = (role: Role) => {
    switch (role) {
      case Role.Admin:
        return 'bg-purple-500/30 text-purple-300';
      case Role.Teacher:
        return 'bg-blue-500/30 text-blue-300';
      case Role.Coach:
        return 'bg-green-500/30 text-green-300';
      case Role.AdministrativeStaff:
        return 'bg-slate-500/30 text-slate-300';
      default:
        return 'bg-gray-500/30 text-gray-300';
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-white">{title}</h1>
            {!isTeachers && (
              <Button onClick={handleOpenAddAdminModal} className="w-auto px-6">Tambah Admin</Button>
            )}
        </div>

        {mode === 'admins' && isMainAdmin && (
            <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-500/50 p-6 rounded-xl space-y-3">
                <div>
                    <h3 className="font-bold text-lg text-yellow-400">Kode Pendaftaran Admin</h3>
                    <p className="text-slate-300 mt-1">Berikan kode berikut kepada pengguna yang ingin Anda daftarkan sebagai Admin baru. Kode ini bersifat tetap dan tidak dapat diubah.</p>
                    <div className="mt-3 bg-slate-900 p-3 rounded-md">
                        <p className="font-mono text-lg text-amber-300 select-all">adm13v1</p>
                    </div>
                </div>
            </div>
        )}

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg overflow-x-auto">
          {isLoading ? (
            <div className="p-8"><Spinner /></div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-800">
                <tr className="hidden md:table-row">
                  <th className="p-4 text-sm font-semibold text-slate-200">Nama</th>
                  <th className="p-4 text-sm font-semibold text-slate-200">User ID (Email)</th>
                  <th className="p-4 text-sm font-semibold text-slate-200">Peran</th>
                  <th className="p-4 text-sm font-semibold text-slate-200">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {users.map((user) => (
                  <tr key={user.id} className="block p-4 space-y-3 md:table-row md:p-0 md:space-y-0 hover:bg-slate-800/50 transition-colors">
                    <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap font-medium">
                      <span className="text-sm font-semibold text-slate-400 md:hidden">Nama</span>
                      <span>{user.name}</span>
                    </td>
                    <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap text-slate-400">
                      <span className="text-sm font-semibold text-slate-400 md:hidden">Email</span>
                      <span className="text-right break-all">{user.email}</span>
                    </td>
                    <td className="flex justify-between items-center md:table-cell md:p-4">
                      <span className="text-sm font-semibold text-slate-400 md:hidden">Peran</span>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="flex justify-between items-center md:table-cell md:p-4">
                      <span className="text-sm font-semibold text-slate-400 md:hidden">Aksi</span>
                      <div className="flex items-center space-x-4">
                        <button onClick={() => handleOpenResetModal(user)} className="text-indigo-400 hover:underline text-sm font-medium">Reset Perangkat</button>
                        <button onClick={() => handleOpenDeleteModal(user)} className="text-red-400 hover:underline text-sm font-medium">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
         <footer className="text-center text-slate-500 text-sm pt-4">
          © 2024 HadirKu. All rights reserved.
        </footer>
      </div>

      {/* MODALS */}
      
      <Modal isOpen={isAddAdminModalOpen} onClose={() => closeModal(setIsAddAdminModalOpen)} title="Tambah Admin Baru">
          <form onSubmit={handleAddAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Nama Lengkap</label>
                <input type="text" value={newAdminData.name} onChange={e => setNewAdminData({...newAdminData, name: e.target.value})} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Email</label>
                <input type="email" value={newAdminData.email} onChange={e => setNewAdminData({...newAdminData, email: e.target.value})} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Password</label>
                <input type="password" value={newAdminData.password} onChange={e => setNewAdminData({...newAdminData, password: e.target.value})} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              {success && <p className="text-sm text-green-400">{success}</p>}
              <div className="flex justify-end space-x-3 pt-2">
                  <Button type="button" onClick={() => closeModal(setIsAddAdminModalOpen)} variant="secondary" className="w-auto" disabled={isSubmitting}>Batal</Button>
                  <Button type="submit" isLoading={isSubmitting} className="w-auto">Simpan</Button>
              </div>
          </form>
      </Modal>

      {userToAction && (
          <Modal isOpen={isResetModalOpen} onClose={() => closeModal(setIsResetModalOpen)} title="Konfirmasi Reset Perangkat">
              <div className="space-y-4">
                  <p className="text-slate-300">
                      Apakah Anda yakin ingin mereset ikatan perangkat untuk <strong>{userToAction.name}</strong>? Pengguna akan dapat login dari perangkat baru setelah ini.
                  </p>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  {success && <p className="text-sm text-green-400">{success}</p>}
                  <div className="flex justify-end space-x-3 pt-2">
                      <Button type="button" onClick={() => closeModal(setIsResetModalOpen)} variant="secondary" className="w-auto" disabled={isSubmitting}>Batal</Button>
                      <Button onClick={handleConfirmReset} isLoading={isSubmitting} variant="primary" className="w-auto">Reset</Button>
                  </div>
              </div>
          </Modal>
      )}

      {userToAction && (
        <Modal isOpen={isDeleteModalOpen} onClose={() => closeModal(setIsDeleteModalOpen)} title="Konfirmasi Hapus">
          <div className="space-y-4">
            <p className="text-slate-300">
              Apakah Anda yakin ingin menghapus pengguna <strong>{userToAction.name}</strong>? Tindakan ini hanya menghapus profil dari database, bukan akun login.
            </p>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex justify-end space-x-3 pt-2">
              <Button type="button" onClick={() => closeModal(setIsDeleteModalOpen)} variant="secondary" className="w-auto" disabled={isSubmitting}>
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