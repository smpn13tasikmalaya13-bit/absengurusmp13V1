import React from 'react';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';

const GuidePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Panduan Aplikasi</h1>
      <Card>
        <div className="space-y-4">
          <p className="text-slate-300">Di halaman ini Anda dapat melihat panduan penggunaan aplikasi dalam format PDF. Jika PDF tidak tampil, gunakan tombol unduh di bawah.</p>
          <div className="w-full h-[80vh] bg-slate-900 rounded overflow-hidden border border-slate-700">
            <iframe src="/panduan.pdf" title="Panduan Aplikasi" className="w-full h-full" />
          </div>
          <div className="flex justify-end">
            <a href="/panduan.pdf" download className="px-4 py-2 bg-indigo-600 text-white rounded">Unduh Panduan (PDF)</a>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GuidePage;
