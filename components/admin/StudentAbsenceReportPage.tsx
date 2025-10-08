import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { getAllUsers } from '../../services/authService';
import { getAllClasses } from '../../services/dataService';
import { User, Class, Role } from '../../types';

const StudentAbsenceReportPage: React.FC = () => {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);

  useEffect(() => {
    const fetchFilterData = async () => {
      const allUsers = await getAllUsers();
      setTeachers(allUsers.filter(u => u.role === Role.Teacher || u.role === Role.Coach));
      const classData = await getAllClasses();
      setClasses(classData);
    };
    fetchFilterData();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Laporan Siswa Tidak Hadir</h1>
      <Card>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {/* Filters */}
            <div>
                <label className="text-sm text-gray-400">Guru Pelapor</label>
                <select className="w-full mt-1 p-2 bg-slate-600 border border-slate-500 rounded-md">
                    <option value="">Semua Guru</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>
            <div>
                <label className="text-sm text-gray-400">Kelas</label>
                <select className="w-full mt-1 p-2 bg-slate-600 border border-slate-500 rounded-md">
                    <option value="">Semua Kelas</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            <div>
                <label className="text-sm text-gray-400">Tanggal Mulai</label>
                <input type="date" className="w-full mt-1 p-2 bg-slate-600 border border-slate-500 rounded-md placeholder-gray-400"/>
            </div>
             <div>
                <label className="text-sm text-gray-400">Tanggal Selesai</label>
                <input type="date" className="w-full mt-1 p-2 bg-slate-600 border border-slate-500 rounded-md placeholder-gray-400"/>
            </div>
          </div>
          <div className="flex justify-end space-x-4">
              <Button variant="secondary" className="w-auto !bg-gray-600 hover:!bg-gray-700 !text-white px-6" disabled>Ekspor PDF</Button>
              <Button variant="secondary" className="w-auto !bg-gray-600 hover:!bg-gray-700 !text-white px-6" disabled>Ekspor Excel</Button>
          </div>
        </div>
      </Card>
      
      <div className="text-center py-16 px-4 bg-slate-900 rounded-lg">
        <p className="font-medium text-white">Fitur laporan siswa absen sedang dalam pengembangan.</p>
        <p className="text-sm text-gray-400 mt-1">Data laporan siswa yang diinput oleh guru akan tersedia di sini.</p>
      </div>
    </div>
  );
};

export default StudentAbsenceReportPage;