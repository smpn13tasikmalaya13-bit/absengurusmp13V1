

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';
import { AttendanceRecord } from '../../types';
import { getAttendanceReport } from '../../services/attendanceService';
import { generateAttendanceSummary } from '../../services/geminiService';
import { Button } from '../ui/Button';

const AttendanceReport: React.FC = () => {
  const [report, setReport] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    const date = new Date(selectedDate);
    // Adjust for timezone offset to prevent date mismatch
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    const data = await getAttendanceReport(date);
    setReport(data);
    setIsLoading(false);
    setSummary(''); // Clear summary on new date selection
  }, [selectedDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleGenerateSummary = async () => {
    if (report.length === 0) {
      setSummary('Tidak ada data yang tersedia untuk tanggal yang dipilih untuk membuat ringkasan.');
      return;
    }
    setIsSummaryLoading(true);
    const generatedSummary = await generateAttendanceSummary(report);
    setSummary(generatedSummary);
    setIsSummaryLoading(false);
  };
  
  return (
    <div className="space-y-6">
      <Card title="Laporan Kehadiran">
        <div className="mb-4">
          <label htmlFor="date-picker" className="block text-sm font-medium text-slate-300">Pilih Tanggal</label>
          <input
            type="date"
            id="date-picker"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {isLoading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Nama</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Waktu</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-slate-800/50 divide-y divide-slate-700">
                {report.length > 0 ? report.map((record) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{record.userName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{record.timestamp.toLocaleTimeString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        record.status === 'Present' ? 'bg-emerald-500/30 text-emerald-200' : 'bg-yellow-500/30 text-yellow-200'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-slate-400">Tidak ada catatan untuk tanggal ini.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      
      <Card title="Ringkasan AI (didukung oleh Gemini)">
        <div className="space-y-4">
          <Button onClick={handleGenerateSummary} isLoading={isSummaryLoading} disabled={isLoading || report.length === 0}>
            Buat Ringkasan
          </Button>
          {isSummaryLoading ? (
            <Spinner />
          ) : (
             summary && (
              <div className="p-4 bg-slate-700/50 rounded-md border border-slate-600">
                 <p className="text-sm text-slate-200 whitespace-pre-wrap">{summary}</p>
              </div>
            )
          )}
        </div>
      </Card>

    </div>
  );
};

export default AttendanceReport;