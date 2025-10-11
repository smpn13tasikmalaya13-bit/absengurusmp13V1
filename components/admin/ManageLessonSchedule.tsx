import React, { useState, useEffect, useCallback } from 'react';
import { 
  getAllLessonSchedules, 
  addLessonSchedule, 
  updateLessonSchedule, 
  deleteLessonSchedule,
  getAllClasses 
} from '../../services/dataService';
import { getAllUsers } from '../../services/authService';
import { LessonSchedule, Class, User, Role } from '../../types';
import { Spinner } from '../ui/Spinner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { LESSON_TIME_SLOTS } from '../../constants';

// Initial state for the form
// FIX: Added missing teacherId to match the LessonSchedule type.
const initialFormState: Omit<LessonSchedule, 'id'> = {
  day: 'Senin',
  time: LESSON_TIME_SLOTS[0],
  teacher: '',
  teacherId: '',
  subject: '',
  class: '',
  period: 1,
};

const ManageLessonSchedule: React.FC = () => {
  const [schedules, setSchedules] = useState<LessonSchedule[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  
  // Data for modals
  const [formData, setFormData] = useState<Omit<LessonSchedule, 'id'>>(initialFormState);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<LessonSchedule | null>(null);

  // General state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    try {
      const [scheduleData, classData, userData] = await Promise.all([
        getAllLessonSchedules(),
        getAllClasses(),
        getAllUsers()
      ]);
      setSchedules(scheduleData);
      setClasses(classData);
      setTeachers(userData.filter(u => u.role === Role.Teacher || u.role === Role.Coach));
    } catch (err) {
      setError("Gagal memuat data. Silakan coba lagi.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleOpenAddModal = () => {
    setModalMode('add');
    setFormData(initialFormState);
    setSelectedScheduleId(null);
    setError('');
    setIsModalOpen(true);
  };
  
  const handleOpenEditModal = (schedule: LessonSchedule) => {
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

  // FIX: Updated form handler to set both teacher name and teacherId.
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'teacher') {
      const selectedTeacherData = teachers.find(t => t.name === value);
      setFormData(prev => ({
        ...prev,
        teacher: value,
        teacherId: selectedTeacherData ? selectedTeacherData.id : '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'period' ? Number(value) : value,
      }));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.day || !formData.time || !formData.teacher || !formData.subject || !formData.class || !formData.period) {
      setError('Semua field harus diisi.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      if (modalMode === 'add') {
        await addLessonSchedule(formData);
      } else if (selectedScheduleId) {
        await updateLessonSchedule(selectedScheduleId, formData);
      }
      handleCloseModal();
      await fetchSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan jadwal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (schedule: LessonSchedule) => {
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
      await deleteLessonSchedule(scheduleToDelete.id);
      handleCloseDeleteModal();
      await fetchSchedules();
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
          <label htmlFor="time" className="block text-sm font-medium text-gray-300">Waktu</label>
          <select id="time" name="time" value={formData.time} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            {LESSON_TIME_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}
          </select>
        </div>
      </div>
       <div>
        <label htmlFor="teacher" className="block text-sm font-medium text-gray-300">Guru</label>
        <select id="teacher" name="teacher" value={formData.teacher} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500">
          <option value="">Pilih Guru</option>
          {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
      </div>
       <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-300">Mata Pelajaran</label>
        <input id="subject" name="subject" type="text" value={formData.subject} onChange={handleFormChange} required placeholder="Contoh: Matematika" className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="class" className="block text-sm font-medium text-gray-300">Kelas</label>
          <select id="class" name="class" value={formData.class} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            <option value="">Pilih Kelas</option>
            {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="period" className="block text-sm font-medium text-gray-300">Jam Ke</label>
          <input id="period" name="period" type="number" value={formData.period} onChange={handleFormChange} required min="1" max="12" className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>
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
          <h1 className="text-3xl font-bold text-white">Manajemen Jadwal Pelajaran</h1>
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
                    <th className="p-4 text-sm font-semibold text-gray-200">Guru</th>
                    <th className="p-4 text-sm font-semibold text-gray-200">Mata Pelajaran</th>
                    <th className="p-4 text-sm font-semibold text-gray-200">Kelas</th>
                    <th className="p-4 text-sm font-semibold text-gray-200">Jam Ke</th>
                    <th className="p-4 text-sm font-semibold text-gray-200">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.length > 0 ? schedules.map((item) => (
                    <tr key={item.id} className="border-b border-slate-700 last:border-0">
                      <td className="p-4 whitespace-nowrap font-medium">{item.day}</td>
                      <td className="p-4 whitespace-nowrap text-gray-400">{item.time}</td>
                      <td className="p-4 whitespace-nowrap font-medium">{item.teacher}</td>
                      <td className="p-4 whitespace-nowrap text-gray-400">{item.subject}</td>
                      <td className="p-4 whitespace-nowrap text-gray-400">{item.class}</td>
                      <td className="p-4 whitespace-nowrap text-gray-400">{item.period}</td>
                      <td className="p-4 space-x-4">
                        <button onClick={() => handleOpenEditModal(item)} className="text-blue-400 hover:underline font-medium">Ubah</button>
                        <button onClick={() => handleOpenDeleteModal(item)} className="text-red-400 hover:underline font-medium">Hapus</button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-400">
                        Tidak ada data jadwal. Klik 'Tambah Jadwal' untuk memulai.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={modalMode === 'add' ? 'Tambah Jadwal Baru' : 'Ubah Jadwal'}>
        {renderModalContent()}
      </Modal>
      
      {/* Delete Modal */}
      {scheduleToDelete && (
        <Modal isOpen={isDeleteModalOpen} onClose={handleCloseDeleteModal} title="Konfirmasi Hapus">
          <div className="space-y-4">
            <p className="text-gray-300">
              Apakah Anda yakin ingin menghapus jadwal <strong>{scheduleToDelete.subject}</strong> untuk kelas <strong>{scheduleToDelete.class}</strong> pada hari <strong>{scheduleToDelete.day}</strong>?
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

export default ManageLessonSchedule;
