import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
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
    <Card title="QR Code Absensi Staf Administrasi">
      <div className="flex flex-col items-center space-y-6">
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
    </Card>
  );
};

export default StaffQRCodeGenerator;