import React, { useState, useEffect, useCallback } from 'react';
import {
    getAllUsers,
    deleteUser,
    resetDeviceBinding,
    register,
    getAdminRegistrationKey,
    updateAdminRegistrationKey
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
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [isKeyLoading, setIsKeyLoading] = useState(false);

  // Directly check if the logged in user is the main admin.
  const isMainAdmin = loggedInUser?.email === MAIN_ADMIN_EMAIL;
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
  
  // Effect to fetch the list of users to display in the table.
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  // Effect to fetch the admin key, ONLY if the user is the main admin.
  useEffect(() => {
    if (mode === 'admins' && isMainAdmin) {
      setIsKeyLoading(true);
      setError('');
      getAdminRegistrationKey()
        .then(key => setAdminKey(key))
        .catch(err => setError(err.message))
        .finally(() => setIsKeyLoading(false));
    } else {
      // If not the main admin or not on the admins page, ensure the key is cleared.
      setAdminKey(null);
    }
  }, [mode, isMainAdmin]);
  
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
    } catch (err) {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mereset perangkat.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleGenerateNewKey = async () => {
    setIsKeyLoading(true);
    setError('');
    try {
      const newKey = await updateAdminRegistrationKey();
      setAdminKey(newKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat kunci baru.');
    } finally {
      setIsKeyLoading(false);
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
      // Pass the dynamic key for validation
      await register(newAdminData.name, newAdminData.email, newAdminData.password, Role.Admin, adminKey || undefined);
      setSuccess(`Admin ${newAdminData.name} berhasil ditambahkan.`);
      await fetchUsers();
      setTimeout(() => {
        setIsAddAdminModalOpen(false);
        clearMessages();
      }, 2000);
    } catch (err) {
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

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-white">{title}</h1>
            {!isTeachers && (
              <Button onClick={handleOpenAddAdminModal} className="w-auto !bg-blue-600 hover:!bg-blue-700 px-6">Tambah Admin</Button>
            )}
        </div>

        {mode === 'admins' && isMainAdmin && (
            <div className="bg-slate-700 p-4 rounded-lg border border-yellow-500/50 space-y-3">
                <div>
                    <h3 className="font-bold text-lg text-yellow-400">Kode Pendaftaran Admin</h3>
                    <p className="text-slate-300 mt-1">Berikan kode berikut kepada pengguna yang ingin Anda daftarkan sebagai Admin baru. Hanya Anda yang dapat melihat dan mengubah kode ini.</p>
                    <div className="mt-2 bg-slate-900 p-3 rounded-md">
                        {isKeyLoading ? <Spinner /> : (
                            <p className="font-mono text-lg text-amber-300 select-all">{adminKey || 'Belum ada kode. Buat kode baru.'}</p>
                        )}
                    </div>
                </div>
                <div>
                    <Button 
                        onClick={handleGenerateNewKey} 
                        isLoading={isKeyLoading}
                        variant="secondary"
                        className="w-auto !bg-amber-600 hover:!bg-amber-700 !text-white"
                    >
                        Buat Kode Baru
                    </Button>
                </div>
            </div>
        )}


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
                          <button onClick={() => handleOpenResetModal(user)} className="text-blue-400 hover:underline text-sm">Reset Perangkat</button>
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

      {/* MODALS */}
      
      {/* ADD ADMIN MODAL */}
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
                  <Button type="button" onClick={() => closeModal(setIsAddAdminModalOpen)} variant="secondary" className="w-auto !bg-slate-600 hover:!bg-slate-500 !text-white" disabled={isSubmitting}>Batal</Button>
                  <Button type="submit" isLoading={isSubmitting} className="w-auto">Simpan</Button>
              </div>
          </form>
      </Modal>

      {/* RESET DEVICE CONFIRMATION MODAL */}
      {userToAction && (
          <Modal isOpen={isResetModalOpen} onClose={() => closeModal(setIsResetModalOpen)} title="Konfirmasi Reset Perangkat">
              <div className="space-y-4">
                  <p className="text-gray-300">
                      Apakah Anda yakin ingin mereset ikatan perangkat untuk <strong>{userToAction.name}</strong>? Pengguna akan dapat login dari perangkat baru setelah ini.
                  </p>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  {success && <p className="text-sm text-green-400">{success}</p>}
                  <div className="flex justify-end space-x-3 pt-2">
                      <Button type="button" onClick={() => closeModal(setIsResetModalOpen)} variant="secondary" className="w-auto !bg-slate-600 hover:!bg-slate-500 !text-white" disabled={isSubmitting}>Batal</Button>
                      <Button onClick={handleConfirmReset} isLoading={isSubmitting} variant="primary" className="w-auto !bg-blue-600 hover:!bg-blue-700">Reset</Button>
                  </div>
              </div>
          </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {userToAction && (
        <Modal isOpen={isDeleteModalOpen} onClose={() => closeModal(setIsDeleteModalOpen)} title="Konfirmasi Hapus">
          <div className="space-y-4">
            <p className="text-gray-300">
              Apakah Anda yakin ingin menghapus pengguna <strong>{userToAction.name}</strong>? Tindakan ini hanya menghapus profil dari database, bukan akun login.
            </p>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex justify-end space-x-3 pt-2">
              <Button type="button" onClick={() => closeModal(setIsDeleteModalOpen)} variant="secondary" className="w-auto !bg-slate-600 hover:!bg-slate-500 !text-white" disabled={isSubmitting}>
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