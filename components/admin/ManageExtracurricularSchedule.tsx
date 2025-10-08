import React, { useState, useEffect, useCallback } from 'react';
import { 
  getAllEskulSchedules,
  addEskulSchedule,
  updateEskulSchedule,
  deleteEskulSchedule,
  getAllEskuls
} from '../../services/dataService';
import { getAllUsers } from '../../services/authService';
import { EskulSchedule, Eskul, User, Role } from '../../types';
import { Spinner } from '../ui/Spinner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

const initialFormState: Omit<EskulSchedule, 'id'> = {
  day: 'Senin',
  time: '',
  coach: '',
  activity: '',
};

const ManageEskulSchedule: React.FC = () => {
  const [schedules, setSchedules] = useState<EskulSchedule[]>([]);
  const [eskuls, setEskuls] = useState<Eskul[]>([]);
  const [coaches, setCoaches] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  
  const [formData, setFormData] = useState<Omit<EskulSchedule, 'id'>>(initialFormState);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<EskulSchedule | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [scheduleData, eskulData, userData] = await Promise.all([
        getAllEskulSchedules(),
        getAllEskuls(),
        getAllUsers()
      ]);
      setSchedules(scheduleData);
      setEskuls(eskulData);
      setCoaches(userData.filter(u => u.role === Role.Coach || u.role === Role.Teacher));
    } catch (err) {
      setError("Gagal memuat data. Silakan coba lagi.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenAddModal = () => {
    setModalMode('add');
    setFormData(initialFormState);
    setSelectedScheduleId(null);
    setError('');
    setIsModalOpen(true);
  };
  
  const handleOpenEditModal = (schedule: EskulSchedule) => {
    setModalMode('edit');
    const { id, ...scheduleData } = schedule;
    setFormData(scheduleData);
    setSelectedScheduleId(id);
    setError('');
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.day || !formData.time || !formData.coach || !formData.activity) {
      setError('Semua field harus diisi.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      if (modalMode === 'add') {
        await addEskulSchedule(formData);
      } else if (selectedScheduleId) {
        await updateEskulSchedule(selectedScheduleId, formData);
      }
      handleCloseModal();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan jadwal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (schedule: EskulSchedule) => {
    setScheduleToDelete(schedule);
    setError('');
    setIsDeleteModalOpen(true);
  };
  
  const handleCloseDeleteModal = () => {
    if (isSubmitting) return;
    setIsDeleteModalOpen(false);
    setScheduleToDelete(null);
  };
  
  const handleConfirmDelete = async () => {
    if (!scheduleToDelete) return;
    setError('');
    setIsSubmitting(true);
    try {
      await deleteEskulSchedule(scheduleToDelete.id);
      handleCloseDeleteModal();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus jadwal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  const renderModalContent = () => (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="day" className="block text-sm font-medium text-gray-300">Hari</label>
          <select id="day" name="day" value={formData.day} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            {daysOfWeek.map(day => <option key={day} value={day}>{day}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="time" className="block text-sm font-medium text-gray-300">Waktu (JJ:MM - JJ:MM)</label>
          <input id="time" name="time" type="text" value={formData.time} onChange={handleFormChange} required placeholder="Contoh: 14:00 - 16:00" className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>
      </div>
      <div>
        <label htmlFor="coach" className="block text-sm font-medium text-gray-300">Pembina</label>
        <select id="coach" name="coach" value={formData.coach} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500">
          <option value="">Pilih Pembina</option>
          {coaches.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="activity" className="block text-sm font-medium text-gray-300">Kegiatan</label>
        <select id="activity" name="activity" value={formData.activity} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500">
          <option value="">Pilih Kegiatan Eskul</option>
          {eskuls.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
        </select>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex justify-end space-x-3 pt-2">
        <Button type="button" onClick={handleCloseModal} variant="secondary" className="w-auto !bg-slate-600 hover:!bg-slate-500 !text-white" disabled={isSubmitting}>Batal</Button>
        <Button type="submit" isLoading={isSubmitting} className="w-auto">Simpan</Button>
      </div>
    </form>
  );

  return (
    <>
    <div className="space-y-6">
       <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Manajemen Jadwal Eskul</h1>
          <Button onClick={handleOpenAddModal} className="w-auto !bg-blue-600 hover:!bg-blue-700 px-6">Tambah Jadwal</Button>
        </div>
      <div className="bg-slate-900 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8"><Spinner /></div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="p-4 text-sm font-semibold text-gray-200">Hari</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Waktu</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Pembina</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Kegiatan</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length > 0 ? schedules.map((item) => (
                  <tr key={item.id} className="border-b border-slate-700 last:border-0">
                    <td className="p-4 whitespace-nowrap font-medium">{item.day}</td>
                    <td className="p-4 whitespace-nowrap text-gray-400">{item.time}</td>
                    <td className="p-4 whitespace-nowrap font-medium">{item.coach}</td>
                    <td className="p-4 whitespace-nowrap text-gray-400">{item.activity}</td>
                    <td className="p-4 space-x-4">
                      <button onClick={() => handleOpenEditModal(item)} className="text-blue-400 hover:underline font-medium">Ubah</button>
                      <button onClick={() => handleOpenDeleteModal(item)} className="text-red-400 hover:underline font-medium">Hapus</button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-400">
                      Tidak ada data jadwal eskul. Klik 'Tambah Jadwal' untuk memulai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <footer className="text-center text-gray-500 text-sm pt-4">
        © 2025 Rullp. All rights reserved.
      </footer>
    </div>

    {/* Add/Edit Modal */}
    <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={modalMode === 'add' ? 'Tambah Jadwal Eskul Baru' : 'Ubah Jadwal Eskul'}>
      {renderModalContent()}
    </Modal>
    
    {/* Delete Modal */}
    {scheduleToDelete && (
      <Modal isOpen={isDeleteModalOpen} onClose={handleCloseDeleteModal} title="Konfirmasi Hapus">
        <div className="space-y-4">
          <p className="text-gray-300">
            Apakah Anda yakin ingin menghapus jadwal <strong>{scheduleToDelete.activity}</strong> pada hari <strong>{scheduleToDelete.day}</strong>?
          </p>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" onClick={handleCloseDeleteModal} variant="secondary" className="w-auto !bg-slate-600 hover:!bg-slate-500 !text-white" disabled={isSubmitting}>Batal</Button>
            <Button onClick={handleConfirmDelete} isLoading={isSubmitting} variant="danger" className="w-auto">Hapus</Button>
          </div>
        </div>
      </Modal>
    )}
    </>
  );
};

export default ManageEskulSchedule;