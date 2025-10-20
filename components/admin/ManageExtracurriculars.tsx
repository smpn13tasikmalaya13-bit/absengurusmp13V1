import React, { useState, useEffect, useCallback } from 'react';
import { getAllEskuls, addEskul, deleteEskul } from '../../services/dataService';
import { Button } from '../ui/Button';
import { Eskul } from '../../types';
import { Spinner } from '../ui/Spinner';
import { Modal } from '../ui/Modal';
import { QRCodeSVG } from 'qrcode.react';

const ManageEskuls: React.FC = () => {
  const [eskuls, setEskuls] = useState<Eskul[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  
  // Data for modals
  const [newEskulName, setNewEskulName] = useState('');
  const [eskulToAction, setEskulToAction] = useState<Eskul | null>(null);

  // General state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchEskuls = useCallback(async () => {
    setIsLoading(true);
    const data = await getAllEskuls();
    setEskuls(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchEskuls();
  }, [fetchEskuls]);

  // === ADD MODAL LOGIC ===
  const handleOpenAddModal = () => {
    setNewEskulName('');
    setError('');
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    if (isSubmitting) return;
    setIsAddModalOpen(false);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEskulName.trim()) {
      setError('Nama Eskul harus diisi.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await addEskul(newEskulName.trim());
      handleCloseAddModal();
      await fetchEskuls();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan eskul.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // === DELETE MODAL LOGIC ===
  const handleOpenDeleteModal = (eskul: Eskul) => {
    setEskulToAction(eskul);
    setError('');
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    if (isSubmitting) return;
    setIsDeleteModalOpen(false);
    setEskulToAction(null);
  };

  const handleConfirmDelete = async () => {
    if (!eskulToAction) return;
    setError('');
    setIsSubmitting(true);
    try {
      await deleteEskul(eskulToAction.id);
      handleCloseDeleteModal();
      await fetchEskuls();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus eskul.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // === QR CODE MODAL LOGIC ===
  const handleOpenQrModal = (eskul: Eskul) => {
    setEskulToAction(eskul);
    setIsQrModalOpen(true);
  };

  const handleCloseQrModal = () => {
    setIsQrModalOpen(false);
    setEskulToAction(null);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Manajemen Eskul</h1>
          <Button onClick={handleOpenAddModal} className="w-auto !bg-blue-600 hover:!bg-blue-700 px-6">Tambah</Button>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg overflow-x-auto">
          {isLoading ? (
            <div className="p-8"><Spinner /></div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-800">
                <tr className="hidden md:table-row">
                  <th className="p-4 text-sm font-semibold text-gray-200">Nama Kegiatan</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {eskuls.length > 0 ? eskuls.map((eskul) => (
                  <tr key={eskul.id} className="block p-4 space-y-3 md:table-row md:p-0 md:space-y-0 hover:bg-slate-800/50 transition-colors">
                    <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap font-medium">
                        <span className="text-sm font-semibold text-slate-400 md:hidden">Nama Kegiatan</span>
                        <span>{eskul.name}</span>
                    </td>
                    <td className="flex justify-between items-center md:table-cell md:p-4">
                        <span className="text-sm font-semibold text-slate-400 md:hidden">Aksi</span>
                        <div className="flex items-center space-x-4">
                            <button onClick={() => handleOpenQrModal(eskul)} className="text-blue-400 hover:underline font-medium text-sm">QR Code</button>
                            <button onClick={() => handleOpenDeleteModal(eskul)} className="text-red-400 hover:underline font-medium text-sm">Hapus</button>
                        </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-gray-400">
                      Tidak ada data eskul. Coba jalankan 'Seed Initial Data' dari Dashboard.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ADD MODAL */}
      <Modal isOpen={isAddModalOpen} onClose={handleCloseAddModal} title="Tambah Eskul Baru">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label htmlFor="eskulName" className="block text-sm font-medium text-gray-300">Nama Eskul</label>
            <input
              id="eskulName"
              type="text"
              value={newEskulName}
              onChange={(e) => setNewEskulName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Contoh: Pramuka"
              disabled={isSubmitting}
              required
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" onClick={handleCloseAddModal} variant="secondary" className="w-auto !bg-slate-600 hover:!bg-slate-500 !text-white" disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="w-auto">
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      {/* QR CODE MODAL */}
      {eskulToAction && (
        <Modal isOpen={isQrModalOpen} onClose={handleCloseQrModal} title={`QR Code untuk ${eskulToAction.name}`}>
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-white rounded-lg">
              <QRCodeSVG value={eskulToAction.id} size={256} />
            </div>
            <p className="text-sm text-gray-400 text-center">
              QR Code ini berisi ID unik untuk ${eskulToAction.name}. Gunakan untuk absensi atau keperluan lain.
            </p>
             <div className="w-full pt-2">
                <Button onClick={handleCloseQrModal} className="w-full !bg-slate-600 hover:!bg-slate-500 !text-white">Tutup</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {eskulToAction && (
        <Modal isOpen={isDeleteModalOpen} onClose={handleCloseDeleteModal} title="Konfirmasi Hapus">
          <div className="space-y-4">
            <p className="text-gray-300">
              Apakah Anda yakin ingin menghapus <strong>{eskulToAction.name}</strong>? Tindakan ini tidak dapat diurungkan.
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

export default ManageEskuls;