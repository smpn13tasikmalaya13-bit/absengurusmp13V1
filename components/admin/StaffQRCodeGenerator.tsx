import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { generateQrCodeData, getCurrentQrCodeData } from '../../services/attendanceService';
import { QRCodeSVG } from 'qrcode.react';

const StaffQRCodeGenerator: React.FC = () => {
  const [qrData, setQrData] = useState<string | null>(null);

  useEffect(() => {
    const existingQrData = getCurrentQrCodeData();
    if (existingQrData) {
      setQrData(existingQrData);
    }
  }, []);

  const handleGenerate = () => {
    const newQrData = generateQrCodeData();
    setQrData(newQrData);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">QR Code Absensi Staf Administrasi</h1>
      </div>
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6 md:p-8">
        <div className="flex flex-col items-center space-y-6 max-w-md mx-auto">
          {qrData ? (
            <div className="p-4 bg-white border rounded-lg">
              <QRCodeSVG value={qrData} size={256} />
            </div>
          ) : (
            <div className="h-64 w-64 flex items-center justify-center bg-slate-700 rounded-lg">
              <p className="text-slate-400 text-center">Klik tombol untuk membuat QR code</p>
            </div>
          )}

          <div className="w-full max-w-xs">
            <Button onClick={handleGenerate}>
              {qrData ? 'Buat Ulang QR Code' : 'Buat QR Code'}
            </Button>
          </div>
          <p className="text-sm text-slate-400 text-center">
            QR code ini berlaku untuk hari ini. Staf harus memindai kode ini di area sekolah untuk mencatat waktu datang dan pulang.
          </p>
        </div>
      </div>
       <footer className="text-center text-slate-500 text-sm pt-4">
        © 2025 Rullp. All rights reserved.
      </footer>
    </div>
  );
};

export default StaffQRCodeGenerator;