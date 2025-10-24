import React, { useState, useEffect, useCallback } from 'react';
import { 
  getAllLessonSchedules, 
  addLessonSchedule, 
  updateLessonSchedule, 
  deleteLessonSchedule,
  getAllClasses,
  getAllMasterSchedules
} from '../../services/dataService';
import { getAllUsers } from '../../services/authService';
import { LessonSchedule, Class, User, Role, MasterSchedule } from '../../types';
import { Spinner } from '../ui/Spinner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

// Initial state for the form
const initialFormState = {
  day: 'Senin',
  startTime: '',
  endTime: '',
  teacher: '',
  teacherId: '',
  subject: '',
  class: '',
  period: 1,
};

// FIX: Using React.FC to resolve JSX namespace error.
const ManageLessonSchedule: React.FC = () => {
  const [schedules, setSchedules] = useState<LessonSchedule[]>([]);
  const [masterSchedules, setMasterSchedules] = useState<MasterSchedule[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [uniqueSubjects, setUniqueSubjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  
  // Data for modals
  const [formData, setFormData] = useState(initialFormState);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<LessonSchedule | null>(null);

  // General state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    try {
      const [scheduleData, classData, userData, masterScheduleData] = await Promise.all([
        getAllLessonSchedules(),
        getAllClasses(),
        getAllUsers(),
        getAllMasterSchedules()
      ]);
      setSchedules(scheduleData);
      setClasses(classData);
      setTeachers(userData.filter(u => u.role === Role.Teacher || u.role === Role.Coach));
      setMasterSchedules(masterScheduleData);
      
      const subjects = [...new Set(masterScheduleData.map(s => s.subject))].sort();
      setUniqueSubjects(subjects);

      // FIX: Explicitly type error in catch block.
    } catch (err: any) {
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
    const { id, time, ...scheduleData } = schedule;
    const [startTime = '', endTime = ''] = time.split(' - ');
    
    setFormData({
      ...initialFormState, // ensure all fields are present
      ...scheduleData,
      startTime: startTime.trim(),
      endTime: endTime.trim(),
    });

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
    if (!formData.day || !formData.startTime || !formData.endTime || !formData.teacher || !formData.subject || !formData.class || !formData.period) {
      setError('Semua field harus diisi.');
      return;
    }
    
    setError('');
    setIsSubmitting(true);

    // --- VALIDATION AGAINST MASTER SCHEDULE (REVISED LOGIC FOR ADMIN) ---
    const selectedTeacher = teachers.find(t => t.id === formData.teacherId);
    if (!selectedTeacher?.kode) {
        setError(`Guru '${formData.teacher}' belum mengatur 'Kode Guru' di profilnya. Validasi tidak dapat dilakukan. Minta guru untuk melengkapi profilnya.`);
        setIsSubmitting(false);
        return;
    }

    // FIX: Corrected validation logic to sum all hours for a subject and teacher from the master schedule.
    // Also fixed incorrect property 'totalHours' to 'jumlahJam'.
    // Find all master schedule entries for this teacher and subject to calculate total allocation
    const teacherMasterRules = masterSchedules.filter(ms =>
        ms.kode === selectedTeacher.kode &&
        ms.subject === formData.subject
    );

    if (teacherMasterRules.length > 0) {
        const totalAllocatedHours = teacherMasterRules.reduce((total, rule) => total + rule.jumlahJam, 0);

        const currentHours = schedules.filter(s =>
            s.teacherId === formData.teacherId &&
            s.subject === formData.subject &&
            s.id !== selectedScheduleId
        ).length;

        if (currentHours >= totalAllocatedHours) {
            setError(`Total jam untuk guru ${formData.teacher} pada mata pelajaran ${formData.subject} sudah mencapai batas maksimum (${totalAllocatedHours} jam) dari jadwal induk.`);
            setIsSubmitting(false);
            return;
        }
    }
    
    const schedulePayload: Omit<LessonSchedule, 'id'> = {
      day: formData.day,
      time: `${formData.startTime} - ${formData.endTime}`,
      teacher: formData.teacher,
      teacherId: formData.teacherId,
      subject: formData.subject,
      class: formData.class,
      period: formData.period,
    };

    try {
      if (modalMode === 'add') {
        await addLessonSchedule(schedulePayload);
      } else if (selectedScheduleId) {
        await updateLessonSchedule(selectedScheduleId, schedulePayload);
      }
      handleCloseModal();
      await fetchSchedules();
      // FIX: Explicitly type error in catch block.
    } catch (err: any) {
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
      // FIX: Explicitly type error in catch block.
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus jadwal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  const renderModalContent = () => (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div>
        <label htmlFor="day" className="block text-sm font-medium text-gray-300">Hari</label>
        <select id="day" name="day" value={formData.day} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500">
          {daysOfWeek.map(day => <option key={day} value={day}>{day}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="startTime" className="block text-sm font-medium text-gray-300">Waktu Mulai</label>
          <input id="startTime" name="startTime" type="time" value={formData.startTime} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label htmlFor="endTime" className="block text-sm font-medium text-gray-300">Waktu Selesai</label>
          <input id="endTime" name="endTime" type="time" value={formData.endTime} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
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
        <select id="subject" name="subject" value={formData.subject} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            <option value="">Pilih Mata Pelajaran</option>
            {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
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
          <h1 className="text-xl font-bold text-white">Manajemen Jadwal Pelajaran</h1>
          <Button onClick={handleOpenAddModal} className="w-auto !bg-blue-600 hover:!bg-blue-700 px-6">Tambah Jadwal</Button>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg overflow-x-auto">
          {isLoading ? (
            <div className="p-8"><Spinner /></div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-800">
                <tr className="hidden md:table-row">
                  <th className="p-4 text-sm font-semibold text-gray-200">Hari</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Waktu</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Guru</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Mata Pelajaran</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Kelas</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Jam Ke</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {schedules.length > 0 ? schedules.map((item) => (
                  <tr key={item.id} className="block p-4 space-y-3 md:table-row md:p-0 md:space-y-0 hover:bg-slate-800/50 transition-colors">
                    <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap"><span className="text-sm font-semibold text-slate-400 md:hidden">Hari</span><span>{item.day}</span></td>
                    <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap text-gray-400"><span className="text-sm font-semibold text-slate-400 md:hidden">Waktu</span><span>{item.time}</span></td>
                    <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap"><span className="text-sm font-semibold text-slate-400 md:hidden">Guru</span><span>{item.teacher}</span></td>
                    <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap text-gray-400"><span className="text-sm font-semibold text-slate-400 md:hidden">Mapel</span><span>{item.subject}</span></td>
                    <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap text-gray-400"><span className="text-sm font-semibold text-slate-400 md:hidden">Kelas</span><span>{item.class}</span></td>
                    <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap text-gray-400"><span className="text-sm font-semibold text-slate-400 md:hidden">Jam Ke</span><span>{item.period}</span></td>
                    <td className="flex justify-between items-center md:table-cell md:p-4">
                        <span className="text-sm font-semibold text-slate-400 md:hidden">Aksi</span>
                        <div className="flex items-center space-x-4">
                            <button onClick={() => handleOpenEditModal(item)} className="text-blue-400 hover:underline font-medium text-sm">Ubah</button>
                            <button onClick={() => handleOpenDeleteModal(item)} className="text-red-400 hover:underline font-medium text-sm">Hapus</button>
                        </div>
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