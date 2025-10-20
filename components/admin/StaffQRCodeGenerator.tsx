import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { STAFF_QR_CODE_DATA } from '../../constants';
import { Card } from '../ui/Card';

const StaffQRCodeGenerator: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">QR Code Absensi Staf Administrasi</h1>
      </div>
      <Card>
        <div className="flex flex-col items-center space-y-6 max-w-md mx-auto text-center">
            <div className="p-4 bg-white border rounded-lg">
              <QRCodeSVG value={STAFF_QR_CODE_DATA} size={256} />
            </div>
            <p className="text-sm text-slate-400">
                QR code ini bersifat <strong className="text-amber-400">statis (tidak berubah)</strong>. Silakan cetak dan tempelkan di pintu masuk. Staf harus memindai kode ini di area sekolah untuk mencatat waktu datang dan pulang.
            </p>
        </div>
      </Card>
       <footer className="text-center text-slate-500 text-sm pt-4">
        © 2025 Rullp. All rights reserved.
      </footer>
    </div>
  );
};

export default StaffQRCodeGenerator;
