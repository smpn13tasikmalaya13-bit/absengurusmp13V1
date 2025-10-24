
import React, { useState, useEffect, useCallback } from 'react';
import { getAllClasses } from '../../services/dataService';
import { Button } from '../ui/Button';
import { Class } from '../../types';
import { Spinner } from '../ui/Spinner';
import { Modal } from '../ui/Modal';
import { QRCodeSVG } from 'qrcode.react';

const ManageClasses: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for QR Code Modal
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  const fetchClasses = useCallback(async () => {
    const data = await getAllClasses();
    setClasses(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchClasses();
  }, [fetchClasses]);
  
  // === QR CODE MODAL LOGIC ===
  const handleOpenQrModal = (cls: Class) => {
    setSelectedClass(cls);
    setIsQrModalOpen(true);
  };

  const handleCloseQrModal = () => {
    setIsQrModalOpen(false);
    setSelectedClass(null);
  };
  
  const handlePrint = () => {
    const svgElement = document.getElementById('qr-code-svg');
    if (svgElement && selectedClass) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const printWindow = window.open('', '', 'height=400,width=400');
        printWindow?.document.write('<html><head><title>Cetak QR Code</title>');
        printWindow?.document.write('<style>body { text-align: center; font-family: sans-serif; } .qr-container { display: inline-block; padding: 20px; border: 2px solid #000; } h2 { margin-bottom: 20px; }</style>');
        printWindow?.document.write('</head><body>');
        printWindow?.document.write('<div class="qr-container">');
        printWindow?.document.write(`<h2>QR Code Absensi Kelas</h2><h1>${selectedClass.name}</h1>`);
        printWindow?.document.write(svgData);
        printWindow?.document.write('</div>');
        printWindow?.document.write('</body></html>');
        printWindow?.document.close();
        printWindow?.focus();
        printWindow?.print();
    }
  };


  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Manajemen Data Kelas & QR Code</h1>
        </div>
        <p className="text-sm text-slate-400 -mt-4">
            Daftar kelas di bawah ini dikelola secara otomatis berdasarkan file yang Anda unggah di menu 'Unggah Jadwal Induk'. Halaman ini berfungsi untuk mencetak QR code absensi untuk setiap kelas.
        </p>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg overflow-x-auto">
          {isLoading ? (
            <div className="p-8"><Spinner /></div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-800">
                <tr className="hidden md:table-row">
                  <th className="p-4 text-sm font-semibold text-gray-200">Nama Kelas</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Tingkat</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {classes.length > 0 ? classes.map((cls) => (
                  <tr key={cls.id} className="block p-4 space-y-3 md:table-row md:p-0 md:space-y-0 hover:bg-slate-800/50 transition-colors">
                    <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap font-medium">
                        <span className="text-sm font-semibold text-slate-400 md:hidden">Nama Kelas</span>
                        <span>{cls.name}</span>
                    </td>
                    <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap text-gray-400">
                        <span className="text-sm font-semibold text-slate-400 md:hidden">Tingkat</span>
                        <span>{cls.grade}</span>
                    </td>
                    <td className="flex justify-between items-center md:table-cell md:p-4">
                        <span className="text-sm font-semibold text-slate-400 md:hidden">Aksi</span>
                        <div className="flex items-center space-x-4">
                            <button onClick={() => handleOpenQrModal(cls)} className="text-blue-400 hover:underline font-medium text-sm">Lihat & Cetak QR Code</button>
                        </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-gray-400">
                      Tidak ada data kelas. Silakan unggah jadwal melalui menu 'Unggah Jadwal Induk' untuk mengisi daftar ini secara otomatis.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* QR CODE MODAL */}
      {selectedClass && (
        <Modal isOpen={isQrModalOpen} onClose={handleCloseQrModal} title={`QR Code untuk Kelas ${selectedClass.name}`}>
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-white rounded-lg">
              <QRCodeSVG id="qr-code-svg" value={selectedClass.id} size={256} />
            </div>
            <p className="text-sm text-gray-400 text-center">
              Tempel QR Code ini di dalam kelas <strong>{selectedClass.name}</strong>. Guru akan memindai kode ini untuk absensi setiap jam pelajaran.
            </p>
             <div className="w-full pt-2 grid grid-cols-2 gap-4">
                <Button onClick={handleCloseQrModal} variant="secondary">Tutup</Button>
                <Button onClick={handlePrint} variant="primary">Cetak</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default ManageClasses;
