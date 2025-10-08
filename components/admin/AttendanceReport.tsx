
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
      setSummary('No data available for the selected date to generate a summary.');
      return;
    }
    setIsSummaryLoading(true);
    const generatedSummary = await generateAttendanceSummary(report);
    setSummary(generatedSummary);
    setIsSummaryLoading(false);
  };
  
  return (
    <div className="space-y-6">
      <Card title="Attendance Report">
        <div className="mb-4">
          <label htmlFor="date-picker" className="block text-sm font-medium text-gray-700">Select Date</label>
          <input
            type="date"
            id="date-picker"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          />
        </div>

        {isLoading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {report.length > 0 ? report.map((record) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.userName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.timestamp.toLocaleTimeString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        record.status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">No records found for this date.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      
      <Card title="AI Summary (Powered by Gemini)">
        <div className="space-y-4">
          <Button onClick={handleGenerateSummary} isLoading={isSummaryLoading} disabled={isLoading || report.length === 0}>
            Generate Summary
          </Button>
          {isSummaryLoading ? (
            <Spinner />
          ) : (
             summary && (
              <div className="p-4 bg-gray-50 rounded-md border">
                 <p className="text-sm text-gray-800 whitespace-pre-wrap">{summary}</p>
              </div>
            )
          )}
        </div>
      </Card>

    </div>
  );
};

export default AttendanceReport;
