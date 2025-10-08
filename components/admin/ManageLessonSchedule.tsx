import React, { useState, useEffect } from 'react';
import { getAllLessonSchedules } from '../../services/dataService';
import { LessonSchedule } from '../../types';
import { Spinner } from '../ui/Spinner';

const ManageLessonSchedule: React.FC = () => {
  const [schedules, setSchedules] = useState<LessonSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      setIsLoading(true);
      const data = await getAllLessonSchedules();
      setSchedules(data);
      setIsLoading(false);
    };
    fetchSchedules();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Manajemen Jadwal Pelajaran</h1>
      <div className="bg-slate-900 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8"><Spinner /></div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="p-4 text-sm font-semibold text-gray-200">Hari</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Waktu</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Guru</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Mata Pelajaran</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Kelas</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Jam Ke</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length > 0 ? schedules.map((item) => (
                  <tr key={item.id} className="border-b border-slate-700 last:border-0">
                    <td className="p-4 whitespace-nowrap font-medium">{item.day}</td>
                    <td className="p-4 whitespace-nowrap text-gray-400">{item.time}</td>
                    <td className="p-4 whitespace-nowrap font-medium">{item.teacher}</td>
                    <td className="p-4 whitespace-nowrap text-gray-400">{item.subject}</td>
                    <td className="p-4 whitespace-nowrap text-gray-400">{item.class}</td>
                    <td className="p-4 whitespace-nowrap text-gray-400">{item.period}</td>
                    <td className="p-4 space-x-4">
                      <a href="#" className="text-blue-400 hover:underline font-medium">Ubah</a>
                      <a href="#" className="text-red-400 hover:underline font-medium">Hapus</a>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-gray-400">
                      Tidak ada data jadwal. Coba jalankan 'Seed Initial Data' dari Dashboard.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageLessonSchedule;