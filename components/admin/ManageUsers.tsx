import React, { useState, useEffect, useCallback } from 'react';
import {
    getAllUsers,
    deleteUser,
    register,
    resetUserDevice,
} from '../../services/authService';
  import { getAllMasterSchedules, sendMessage, updateUserProfile } from '../../services/dataService';
import { Role, User, MasterSchedule } from '../../types';
import { Spinner } from '../ui/Spinner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { MAIN_ADMIN_EMAIL } from '../../constants';
import { useAuth } from '../../context/AuthContext';


interface ManageUsersProps {
  mode: 'teachers' | 'admins';
}

interface SendMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    userToAction: User | null;
    loggedInUser: User | null;
}

const SendMessageModal: React.FC<SendMessageModalProps> = ({ isOpen, onClose, userToAction, loggedInUser }) => {
    const [messageContent, setMessageContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (isOpen) {
            setMessageContent('');
            setError('');
            setSuccess('');
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userToAction || !loggedInUser || !messageContent.trim()) return;
        setError('');
        setSuccess('');
        setIsSubmitting(true);
        try {
            await sendMessage(loggedInUser.id, loggedInUser.name, userToAction.id, messageContent.trim());
            setSuccess(`Pesan untuk ${userToAction.name} berhasil terkirim.`);
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal mengirim pesan.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!userToAction) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Kirim Pesan ke ${userToAction.name}`}>
            <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300">Pesan</label>
                    <textarea
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        required
                        rows={4}
                        className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
                        placeholder="Tulis pesan Anda di sini..."
                    />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                {success && <p className="text-sm text-green-400">{success}</p>}
                <div className="flex justify-end space-x-3 pt-2">
                    <Button type="button" onClick={onClose} variant="secondary" className="w-auto" disabled={isSubmitting}>
                        Batal
                    </Button>
                    <Button type="submit" isLoading={isSubmitting} className="w-auto">
                        Kirim
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

const ManageUsers: React.FC<ManageUsersProps> = ({ mode }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [isResetDeviceModalOpen, setIsResetDeviceModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  
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
  const title = isTeachers ? 'Manajemen Guru & Pembina' : 'Manajemen Admin & Tendik';
  
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
        const allRegisteredUsers = await getAllUsers();

        if (isTeachers) {
            const masterSchedules = await getAllMasterSchedules();
            const masterTeachers = new Map<string, { namaGuru: string }>();
            masterSchedules.forEach(schedule => {
                if (!masterTeachers.has(schedule.kode)) {
                    masterTeachers.set(schedule.kode, { namaGuru: schedule.namaGuru });
                }
            });

            const registeredUsersByCode = new Map<string, User>();
            allRegisteredUsers.forEach(u => {
                if (u.kode && (u.role === Role.Teacher || u.role === Role.Coach)) {
                    registeredUsersByCode.set(u.kode, u);
                }
            });

            const combinedUsers: User[] = Array.from(masterTeachers.entries()).map(([kode, { namaGuru }]) => {
                const registeredUser = registeredUsersByCode.get(kode);
                if (registeredUser) {
                    return { ...registeredUser, name: namaGuru }; // Sync name
                } else {
                    return {
                        id: `master_${kode}`,
                        kode: kode,
                        name: namaGuru,
                        email: 'Belum terdaftar',
                        role: Role.Teacher, // Default role
                    };
                }
            });
            setUsers(combinedUsers);
        } else {
            const filteredAdminsAndStaff = allRegisteredUsers.filter(user =>
                user.role === Role.Admin || user.role === Role.AdministrativeStaff
            );
            setUsers(filteredAdminsAndStaff);
        }
    } catch (err) {
        console.error("Failed to fetch user data:", err);
        setError("Gagal memuat data pengguna.");
    } finally {
        setIsLoading(false);
    }
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
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus pengguna.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // === RESET DEVICE MODAL LOGIC ===
  const handleOpenResetDeviceModal = (user: User) => {
    setUserToAction(user);
    clearMessages();
    setIsResetDeviceModalOpen(true);
  };

  const handleConfirmResetDevice = async () => {
    if (!userToAction) return;
    clearMessages();
    setIsSubmitting(true);
    try {
      await resetUserDevice(userToAction.id);
      setSuccess(`Perangkat untuk ${userToAction.name} telah di-reset.`);
      setTimeout(() => {
        closeModal(setIsResetDeviceModalOpen);
        setSuccess('');
      }, 2000);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Gagal mereset perangkat.');
    } finally {
        setIsSubmitting(false);
    }
  };

  // === SEND MESSAGE MODAL LOGIC ===
  const handleOpenMessageModal = (user: User) => {
    setUserToAction(user);
    setIsMessageModalOpen(true);
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

        {error && <p className="text-center text-sm text-red-400 bg-red-500/10 py-2 px-3 rounded-md border border-red-500/30">{error}</p>}
        
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
                  <th className="p-4 text-sm font-semibold text-slate-200">ID Pengguna (Email)</th>
                  <th className="p-4 text-sm font-semibold text-slate-200">Peran</th>
                  <th className="p-4 text-sm font-semibold text-slate-200">Status Scan</th>
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
                      {user.email === 'Belum terdaftar' ? (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-500/30 text-yellow-300">
                              Guru (Belum Aktif)
                          </span>
                      ) : (
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
                              {user.role}
                          </span>
                      )}
                    </td>
                    <td className="flex justify-between items-center md:table-cell md:p-4">
                      <span className="text-sm font-semibold text-slate-400 md:hidden">Status Scan</span>
                      {user.email === 'Belum terdaftar' ? (
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-700 text-slate-300">—</span>
                      ) : (
                        user.qrScanEnabled === false ? (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-300 border border-red-500/30">Nonaktif</span>
                        ) : (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Aktif</span>
                        )
                      )}
                    </td>
                    <td className="flex justify-between items-center md:table-cell md:p-4">
                      <span className="text-sm font-semibold text-slate-400 md:hidden">Aksi</span>
                      <div className="flex items-center space-x-4">
                        <button onClick={() => handleOpenMessageModal(user)} className="text-emerald-400 hover:underline text-sm font-medium disabled:text-slate-500 disabled:no-underline disabled:cursor-not-allowed" disabled={user.email === 'Belum terdaftar'}>Kirim Pesan</button>
                        <button onClick={() => handleOpenResetDeviceModal(user)} className="text-sky-400 hover:underline text-sm font-medium disabled:text-slate-500 disabled:no-underline disabled:cursor-not-allowed" disabled={user.email === 'Belum terdaftar'}>Reset Perangkat</button>
                        <button onClick={async () => {
                          // Toggle per-user QR scan permission
                          if (user.email === 'Belum terdaftar') return;
                          clearMessages();
                          setIsSubmitting(true);
                          try {
                            const currently = user.qrScanEnabled === false ? false : true;
                            await updateUserProfile(user.id, { qrScanEnabled: !currently });
                            setSuccess(`Pengaturan Scan QR untuk ${user.name} diperbarui.`);
                            await fetchUsers();
                            setTimeout(() => setSuccess(''), 2000);
                          } catch (err: any) {
                            setError(err instanceof Error ? err.message : 'Gagal memperbarui pengaturan.');
                          } finally {
                            setIsSubmitting(false);
                          }
                        }} className="text-amber-400 hover:underline text-sm font-medium disabled:text-slate-500 disabled:no-underline disabled:cursor-not-allowed" disabled={user.email === 'Belum terdaftar'}>
                          {user.qrScanEnabled === false ? 'Aktifkan Scan' : 'Nonaktifkan Scan'}
                        </button>
                        <button onClick={() => handleOpenDeleteModal(user)} className="text-red-400 hover:underline text-sm font-medium disabled:text-slate-500 disabled:no-underline disabled:cursor-not-allowed" disabled={user.email === 'Belum terdaftar'}>Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
         <footer className="text-center text-slate-500 text-sm pt-4">
          © Rullp 2025 HadirKu. All rights reserved.
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

      <SendMessageModal 
        isOpen={isMessageModalOpen}
        onClose={() => closeModal(setIsMessageModalOpen)}
        userToAction={userToAction}
        loggedInUser={loggedInUser}
      />
      
      {userToAction && (
        <Modal isOpen={isResetDeviceModalOpen} onClose={() => closeModal(setIsResetDeviceModalOpen)} title="Konfirmasi Reset Perangkat">
          <div className="space-y-4">
            {success ? (
                <p className="text-sm text-green-400">{success}</p>
            ) : (
                <>
                    <p className="text-slate-300">
                        Apakah Anda yakin ingin mereset perangkat untuk <strong>{userToAction.name}</strong>? Tindakan ini akan menghapus ikatan perangkat dan 'Kode Guru', memungkinkan pengguna untuk melakukan aktivasi ulang dari perangkat baru.
                    </p>
                    {error && <p className="text-sm text-red-400">{error}</p>}
                    <div className="flex justify-end space-x-3 pt-2">
                        <Button type="button" onClick={() => closeModal(setIsResetDeviceModalOpen)} variant="secondary" className="w-auto" disabled={isSubmitting}>
                            Batal
                        </Button>
                        <Button onClick={handleConfirmResetDevice} isLoading={isSubmitting} variant="primary" className="w-auto">
                            Reset
                        </Button>
                    </div>
                </>
            )}
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