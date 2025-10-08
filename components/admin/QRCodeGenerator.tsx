import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { generateQrCodeData, getCurrentQrCodeData } from '../../services/attendanceService';
import { QRCodeSVG } from 'qrcode.react';

const QRCodeGenerator: React.FC = () => {
  const [qrData, setQrData] = useState<string | null>(null);

  useEffect(() => {
    // Check if a QR code was already generated for today
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
    <Card title="Daily Attendance QR Code Generator">
      <div className="flex flex-col items-center space-y-6">
        {qrData ? (
          <div className="p-4 bg-white border rounded-lg">
            <QRCodeSVG value={qrData} size={256} />
          </div>
        ) : (
          <div className="h-64 w-64 flex items-center justify-center bg-gray-100 rounded-lg">
            <p className="text-gray-500">Click button to generate QR code</p>
          </div>
        )}

        <div className="w-full max-w-xs">
          <Button onClick={handleGenerate}>
            {qrData ? 'Generate New QR Code' : 'Generate QR Code'}
          </Button>
        </div>
        <p className="text-sm text-gray-500 text-center">
          This QR code is valid for today only. Teachers must scan this code within school premises to mark their attendance.
        </p>
      </div>
    </Card>
  );
};

export default QRCodeGenerator;