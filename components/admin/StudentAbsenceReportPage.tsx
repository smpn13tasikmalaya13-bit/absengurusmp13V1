import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

const StudentAbsenceReportPage: React.FC = () => {
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
                    <option>Semua Guru</option>
                </select>
            </div>
            <div>
                <label className="text-sm text-gray-400">Kelas</label>
                <select className="w-full mt-1 p-2 bg-slate-600 border border-slate-500 rounded-md">
                    <option>Semua Kelas</option>
                </select>
            </div>
            <div>
                <label className="text-sm text-gray-400">Tanggal Mulai</label>
                <input type="text" placeholder="hh/bb/tttt" className="w-full mt-1 p-2 bg-slate-600 border border-slate-500 rounded-md placeholder-gray-400"/>
            </div>
             <div>
                <label className="text-sm text-gray-400">Tanggal Selesai</label>
                <input type="text" placeholder="hh/bb/tttt" className="w-full mt-1 p-2 bg-slate-600 border border-slate-500 rounded-md placeholder-gray-400"/>
            </div>
          </div>
          <div className="flex justify-end space-x-4">
              <Button variant="secondary" className="w-auto !bg-gray-600 hover:!bg-gray-700 !text-white px-6">Ekspor PDF</Button>
              <Button variant="secondary" className="w-auto !bg-gray-600 hover:!bg-gray-700 !text-white px-6">Ekspor Excel</Button>
          </div>
        </div>
      </Card>
      
      <div className="text-center py-16 px-4 bg-slate-900 rounded-lg">
        <p className="font-medium text-white">Pilih rentang tanggal untuk menampilkan laporan.</p>
      </div>
    </div>
  );
};

export default StudentAbsenceReportPage;
