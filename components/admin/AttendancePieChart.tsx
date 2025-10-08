
import React from 'react';

interface AttendancePieChartProps {
  present: number;
  absent: number;
}

const AttendancePieChart: React.FC<AttendancePieChartProps> = ({ present, absent }) => {
  const total = present + absent;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-56 text-gray-400">
        No attendance data for today.
      </div>
    );
  }

  const absentDeg = (absent / total) * 360;
  const conicGradient = `conic-gradient(#ef4444 ${absentDeg}deg, #10b981 ${absentDeg}deg 360deg)`;

  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-4">
      <div className="relative w-48 h-48">
        <div
          className="w-full h-full rounded-full"
          style={{ background: conicGradient }}
        ></div>
        <div className="absolute top-1/2 left-0 w-full h-px bg-white/30 -translate-y-1/2" aria-hidden="true"></div>
        <div className="absolute top-1/2 -translate-y-1/2 left-[-30px] text-white font-medium text-lg bg-slate-700 px-1 rounded">
          {absent}
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 right-[-30px] text-white font-medium text-lg bg-slate-700 px-1 rounded">
          {present}
        </div>
      </div>
      <div className="flex space-x-6 text-sm">
        <div className="flex items-center">
          <span className="w-3 h-3 bg-red-500 rounded-sm mr-2" aria-hidden="true"></span>
          <span>Absen</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 bg-emerald-500 rounded-sm mr-2" aria-hidden="true"></span>
          <span>Hadir</span>
        </div>
      </div>
    </div>
  );
};

export default AttendancePieChart;