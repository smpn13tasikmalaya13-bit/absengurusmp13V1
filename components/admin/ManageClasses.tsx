import React, { useState, useEffect } from 'react';
import { getAllClasses } from '../../services/dataService';
import { Button } from '../ui/Button';
import { Class } from '../../types';
import { Spinner } from '../ui/Spinner';

const ManageClasses: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      setIsLoading(true);
      const data = await getAllClasses();
      setClasses(data);
      setIsLoading(false);
    };
    fetchClasses();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Manajemen Kelas</h1>
        <Button className="w-auto !bg-blue-600 hover:!bg-blue-700 px-6">Tambah</Button>
      </div>
      <div className="bg-slate-900 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8"><Spinner /></div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="p-4 text-sm font-semibold text-gray-200">Nama Kelas</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Tingkat</th>
                  <th className="p-4 text-sm font-semibold text-gray-200">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {classes.length > 0 ? classes.map((cls) => (
                  <tr key={cls.id} className="border-b border-slate-700 last:border-0">
                    <td className="p-4 whitespace-nowrap font-medium">{cls.name}</td>
                    <td className="p-4 whitespace-nowrap text-gray-400">{cls.grade}</td>
                    <td className="p-4 space-x-4">
                      <a href="#" className="text-blue-400 hover:underline font-medium">QR Code</a>
                      <a href="#" className="text-red-400 hover:underline font-medium">Hapus</a>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-gray-400">
                      Tidak ada data kelas. Coba jalankan 'Seed Initial Data' dari Dashboard.
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

export default ManageClasses;