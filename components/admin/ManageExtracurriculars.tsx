import React from 'react';
import { MOCK_EXTRACURRICULARS } from '../../services/dataService';
import { Button } from '../ui/Button';

const ManageExtracurriculars: React.FC = () => {
  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Manajemen Ekstrakurikuler</h1>
        <Button className="w-auto !bg-blue-600 hover:!bg-blue-700 px-6">Tambah</Button>
      </div>
      <div className="bg-slate-900 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="p-4 text-sm font-semibold text-gray-200">Nama Kegiatan</th>
                <th className="p-4 text-sm font-semibold text-gray-200">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_EXTRACURRICULARS.map((extra) => (
                <tr key={extra.id} className="border-b border-slate-700 last:border-0">
                  <td className="p-4 whitespace-nowrap font-medium">{extra.name}</td>
                  <td className="p-4 space-x-4">
                    <a href="#" className="text-blue-400 hover:underline font-medium">QR Code</a>
                    <a href="#" className="text-red-400 hover:underline font-medium">Hapus</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageExtracurriculars;
