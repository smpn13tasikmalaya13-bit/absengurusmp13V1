import React from 'react';
import { MOCK_EXTRA_SCHEDULE } from '../../services/dataService';

const ManageExtracurricularSchedule: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Manajemen Jadwal Ekstrakurikuler</h1>
      <div className="bg-slate-900 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="p-4 text-sm font-semibold text-gray-200">Hari</th>
                <th className="p-4 text-sm font-semibold text-gray-200">Waktu</th>
                <th className="p-4 text-sm font-semibold text-gray-200">Pembina</th>
                <th className="p-4 text-sm font-semibold text-gray-200">Kegiatan</th>
                <th className="p-4 text-sm font-semibold text-gray-200">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_EXTRA_SCHEDULE.map((item) => (
                <tr key={item.id} className="border-b border-slate-700 last:border-0">
                  <td className="p-4 whitespace-nowrap font-medium">{item.day}</td>
                  <td className="p-4 whitespace-nowrap text-gray-400">{item.time}</td>
                  <td className="p-4 whitespace-nowrap font-medium">{item.coach}</td>
                  <td className="p-4 whitespace-nowrap text-gray-400">{item.activity}</td>
                  <td className="p-4 space-x-4">
                    <a href="#" className="text-blue-400 hover:underline font-medium">Ubah</a>
                    <a href="#" className="text-red-400 hover:underline font-medium">Hapus</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <footer className="text-center text-gray-500 text-sm pt-4">
        © 2025 Rullp. All rights reserved.
      </footer>
    </div>
  );
};

export default ManageExtracurricularSchedule;
