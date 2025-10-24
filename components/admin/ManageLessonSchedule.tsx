import React, { useState, useEffect, useCallback } from 'react';
import { getAllMasterSchedules } from '../../services/dataService';
import { MasterSchedule } from '../../types';
import { Spinner } from '../ui/Spinner';


const ManageLessonSchedule: React.FC = () => {
  const [schedules, setSchedules] = useState<MasterSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    try {
      const scheduleData = await getAllMasterSchedules();
      
      // Sort data for a consistent view
      const dayOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      scheduleData.sort((a, b) => {
        const dayComparison = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
        if (dayComparison !== 0) return dayComparison;
        if (a.class !== b.class) return a.class.localeCompare(b.class);
        return a.period - b.period;
      });

      setSchedules(scheduleData);
    } catch (err: any) {
      setError("Gagal memuat jadwal induk. Pastikan data sudah diunggah melalui menu 'Unggah Jadwal Induk'.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);


  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Manajemen Jadwal Pelajaran</h1>
          {/* "Tambah Jadwal" button is removed as schedules are now managed via upload */}
        </div>

        {error && <p className="text-sm text-center text-red-400 p-4 bg-red-500/10 rounded-lg border border-red-500/30">{error}</p>}

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg overflow-x-auto">
          {isLoading ? (
            <div className="p-8"><Spinner /></div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-800">
                <tr className="hidden md:table-row">
                  <th className="p-4 text-sm font-semibold text-gray-200">Hari</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Waktu</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Guru</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Mata Pelajaran</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Kelas</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Jam Ke</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {schedules.length > 0 ? schedules.map((item) => (
                  <tr key={item.id} className="block p-4 space-y-3 md:table-row md:p-0 md:space-y-0 hover:bg-slate-800/50 transition-colors">
                    <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap"><span className="text-sm font-semibold text-slate-400 md:hidden">Hari</span><span>{item.day}</span></td>
                    <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap text-gray-400"><span className="text-sm font-semibold text-slate-400 md:hidden">Waktu</span><span>{item.waktu}</span></td>
                    <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap"><span className="text-sm font-semibold text-slate-400 md:hidden">Guru</span><span>{item.namaGuru}</span></td>
                    <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap text-gray-400"><span className="text-sm font-semibold text-slate-400 md:hidden">Mapel</span><span>{item.subject}</span></td>
                    <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap text-gray-400"><span className="text-sm font-semibold text-slate-400 md:hidden">Kelas</span><span>{item.class}</span></td>
                    <td className="flex justify-between items-center md:table-cell md:p-4 md:whitespace-nowrap text-gray-400"><span className="text-sm font-semibold text-slate-400 md:hidden">Jam Ke</span><span>{item.period}</span></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-400">
                      Tidak ada data jadwal. Silakan unggah jadwal melalui menu 'Unggah Jadwal Induk' untuk memulai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
};

export default ManageLessonSchedule;