import React, { useState, useEffect, useCallback } from 'react';
import { getAllClasses, addClass } from '../../services/dataService';
import { Button } from '../ui/Button';
import { Class } from '../../types';
import { Spinner } from '../ui/Spinner';
import { Modal } from '../ui/Modal';

const ManageClasses: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchClasses = useCallback(async () => {
    const data = await getAllClasses();
    setClasses(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchClasses();
  }, [fetchClasses]);

  const handleOpenModal = () => {
    setNewClassName('');
    setNewClassGrade('');
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || newClassGrade === '') {
      setError('Nama Kelas dan Tingkat harus diisi.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await addClass(newClassName.trim(), Number(newClassGrade));
      handleCloseModal();
      await fetchClasses(); // Refetch classes to show the new one
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan kelas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Manajemen Kelas</h1>
          <Button onClick={handleOpenModal} className="w-auto !bg-blue-600 hover:!bg-blue-700 px-6">Tambah</Button>
        </div>
        <div className="bg-slate-900 rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-8"><Spinner /></div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="p-4 text-sm font-semibold text-gray-200">Nama Kelas</th>
                    <th className="p-4 text-sm font-semibold text-gray-200">Tingkat</th>
                    <th className="p-4 text-sm font-semibold text-gray-200">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.length > 0 ? classes.map((cls) => (
                    <tr key={cls.id} className="border-b border-slate-700 last:border-0">
                      <td className="p-4 whitespace-nowrap font-medium">{cls.name}</td>
                      <td className="p-4 whitespace-nowrap text-gray-400">{cls.grade}</td>
                      <td className="p-4 space-x-4">
                        <button className="text-blue-400 hover:underline font-medium">QR Code</button>
                        <button className="text-red-400 hover:underline font-medium">Hapus</button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-gray-400">
                        Tidak ada data kelas. Coba jalankan 'Seed Initial Data' dari Dashboard.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Tambah Kelas Baru">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="className" className="block text-sm font-medium text-gray-300">Nama Kelas</label>
            <input
              id="className"
              type="text"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Contoh: VII A"
              disabled={isSubmitting}
              required
            />
          </div>
          <div>
            <label htmlFor="classGrade" className="block text-sm font-medium text-gray-300">Tingkat</label>
            <input
              id="classGrade"
              type="number"
              value={newClassGrade}
              onChange={(e) => setNewClassGrade(e.target.value === '' ? '' : Number(e.target.value))}
              className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Contoh: 7, 8, atau 9"
              min="1"
              max="12"
              disabled={isSubmitting}
              required
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" onClick={handleCloseModal} variant="secondary" className="w-auto !bg-slate-600 hover:!bg-slate-500 !text-white" disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="w-auto">
              Simpan
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default ManageClasses;