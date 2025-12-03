import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { AttendanceRecord, MasterSchedule, Role, User } from '../../types';
import { getFullReport, getFilteredAttendanceReport } from '../../services/attendanceService';
import { getQRScanSettings, setQRScanSettings, QRScanSettings } from '../../services/dataService';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../ui/Modal';
import { getAllUsers } from '../../services/authService';
import { getAllMasterSchedules } from '../../services/dataService';
import AttendancePieChart from './AttendancePieChart';
import { Spinner } from '../ui/Spinner';

const EmptyStateDashboard: React.FC = () => (
  <Card title="Selamat Datang di HadirKu">
    <div className="text-center py-8">
      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2-2H5a2 2 0 01-2-2z" />
      </svg>
      <h3 className="mt-2 text-lg font-medium text-white">Database Kosong</h3>
      <p className="mt-1 text-sm text-gray-400">
        Sepertinya ini adalah pertama kalinya Anda menjalankan aplikasi. Silakan mulai dengan menambahkan data melalui menu manajemen.
      </p>
    </div>
  </Card>
);

const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const DashboardContent: React.FC = () => {
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    teachers: 0,
    staff: 0,
    coaches: 0,
  });
  // State for breakdowns
  const [presentBreakdown, setPresentBreakdown] = useState({ teachers: 0, staff: 0, coaches: 0 });
  const [absentBreakdown, setAbsentBreakdown] = useState({ teachers: 0, staff: 0, coaches: 0 });

  const [recentRecords, setRecentRecords] = useState<(AttendanceRecord & { role?: Role })[]>([]);
  const [absentPersonnel, setAbsentPersonnel] = useState<User[]>([]);
  const [repeatOffenders, setRepeatOffenders] = useState<Array<{ user: User; missingCount: number }>>([]);
  const [isOffendersLoading, setIsOffendersLoading] = useState(true);
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [selectedUserForLetter, setSelectedUserForLetter] = useState<User | null>(null);
  const [letterText, setLetterText] = useState('');
  const addToast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [qrSettings, setQrSettings] = useState<QRScanSettings | null>(null);
  const [isSavingQrSettings, setIsSavingQrSettings] = useState(false);
  const [isSystemEmpty, setIsSystemEmpty] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [allUsers, masterSchedules, allAttendanceRecords] = await Promise.all([
            getAllUsers(),
            getAllMasterSchedules(),
            getFullReport(),
        ]);

        if (allUsers.length <= 1 && masterSchedules.length === 0) {
            setIsSystemEmpty(true);
        } else {
            setIsSystemEmpty(false);

            const personnelUsers = allUsers.filter(u =>
                u.role === Role.Teacher ||
                u.role === Role.Coach ||
                u.role === Role.AdministrativeStaff
            );
            const totalPersonnel = personnelUsers.length;
            const teacherCount = personnelUsers.filter(u => u.role === Role.Teacher).length;
            const staffCount = personnelUsers.filter(u => u.role === Role.AdministrativeStaff).length;
            const coachCount = personnelUsers.filter(u => u.role === Role.Coach).length;

            const todayStr = getLocalDateString(new Date());
            const personnelIds = new Set(personnelUsers.map(u => u.id));

            const presentPersonnelIds = new Set(
                allAttendanceRecords
                    .filter(r => r.date === todayStr && personnelIds.has(r.teacherId))
                    .map(r => r.teacherId)
            );
            const presentCount = presentPersonnelIds.size;
            
            setStats({
                total: totalPersonnel,
                present: presentCount,
                absent: totalPersonnel - presentCount,
                teachers: teacherCount,
                staff: staffCount,
                coaches: coachCount,
            });

            const absentUsers = personnelUsers.filter(u => !presentPersonnelIds.has(u.id));
            setAbsentPersonnel(absentUsers);
            
            // Calculate breakdowns
            const presentUsers = allUsers.filter(u => presentPersonnelIds.has(u.id));
            const pBreakdown = { teachers: 0, staff: 0, coaches: 0 };
            presentUsers.forEach(user => {
                if (user.role === Role.Teacher) pBreakdown.teachers++;
                if (user.role === Role.AdministrativeStaff) pBreakdown.staff++;
                if (user.role === Role.Coach) pBreakdown.coaches++;
            });
            setPresentBreakdown(pBreakdown);

            const aBreakdown = { teachers: 0, staff: 0, coaches: 0 };
            absentUsers.forEach(user => {
                if (user.role === Role.Teacher) aBreakdown.teachers++;
                if (user.role === Role.AdministrativeStaff) aBreakdown.staff++;
                if (user.role === Role.Coach) aBreakdown.coaches++;
            });
            setAbsentBreakdown(aBreakdown);

            const userMap = new Map(allUsers.map(user => [user.id, user.role]));
            const recentWithRoles = allAttendanceRecords.slice(0, 5).map(record => ({
              ...record,
              role: userMap.get(record.teacherId)
            }));
            setRecentRecords(recentWithRoles);

            // Compute repeat offenders: count 'Alpa' (per lesson) across the current week (Mon-Fri).
            try {
              setIsOffendersLoading(true);

              // determine start of current month until today (cumulative for the month)
              const today = new Date();
              const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
              firstOfMonth.setHours(0,0,0,0);
              const endOfToday = new Date(today);
              endOfToday.setHours(23,59,59,999);


              const attendanceInRange = await getFilteredAttendanceReport({ startDate: firstOfMonth, endDate: endOfToday });

              // Reconstruct per-schedule attendance like the teacher report so Alpa counts
              // reflect scheduled lessons that had neither a scanRecord nor a daily absence.
              const scanMap = new Map<string, any>(); // key: `${scheduleId}-${date}`
              const dailyAbsenceMap = new Map<string, any>(); // key: `${teacherId}-${date}`

              attendanceInRange.forEach(record => {
                if (record.scheduleId) {
                  const key = `${record.scheduleId}-${record.date}`;
                  scanMap.set(key, record);
                } else if (['Sakit', 'Izin', 'Tugas Luar'].includes(String(record.status))) {
                  const key = `${record.teacherId}-${record.date}`;
                  dailyAbsenceMap.set(key, record);
                }
              });

              const offendersInfo = [] as Array<{ user: any; missingCount: number }>;

              // For each teacher, iterate the calendar from firstOfMonth -> endOfToday
              for (const u of personnelUsers.filter(x => x.role === Role.Teacher)) {
                let totalJP = 0;
                let alpaCount = 0;

                // if teacher has no kode, skip schedules
                if (!u.kode) {
                  // still attempt to count any explicit 'Alpa' records as fallback
                  const explicitAlpa = attendanceInRange.filter(r => r.teacherId === u.id && (String(r.status || '').toLowerCase() === 'alpa' || String(r.reason || '').toLowerCase() === 'alpa')).length;
                  alpaCount += explicitAlpa;
                } else {
                  const loopDate = new Date(firstOfMonth);
                  while (loopDate <= endOfToday) {
                    const dateString = getLocalDateString(loopDate);
                    const dayName = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][loopDate.getDay()];

                    // schedules for that day
                    const dailySchedules = masterSchedules.filter((s: any) => s.day === dayName && s.kode === u.kode);
                    for (const sched of dailySchedules) {
                      totalJP += 1;
                      const scanKey = `${sched.id}-${dateString}`;
                      const absenceKey = `${u.id}-${dateString}`;
                      const hasScan = !!scanMap.get(scanKey);
                      const hasDailyAbsence = !!dailyAbsenceMap.get(absenceKey);
                      if (!hasScan && !hasDailyAbsence) {
                        alpaCount += 1;
                      }
                    }

                    loopDate.setDate(loopDate.getDate() + 1);
                  }
                }

                // Fallback: also include any explicit 'Alpa' records not tied to schedule
                const explicitAlpaFallback = attendanceInRange.filter(r => r.teacherId === u.id && !(r.scheduleId) && (String(r.status || '').toLowerCase() === 'alpa' || String(r.reason || '').toLowerCase() === 'alpa')).length;
                alpaCount += explicitAlpaFallback;

                if (alpaCount > 10) {
                  offendersInfo.push({ user: u, missingCount: alpaCount });
                }
              }

              setRepeatOffenders(offendersInfo);
            } catch (err) {
              console.error('Error computing repeat offenders', err);
            } finally {
              setIsOffendersLoading(false);
            }
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // load QR settings
    const loadSettings = async () => {
      try {
        const s = await getQRScanSettings();
        setQrSettings(s);
      } catch (err) {
        console.error('Failed to load QR settings', err);
      }
    };
    loadSettings();
  }, []);
  
  const formatDate = (date: Date) => {
    const datePart = date.toLocaleDateString('id-ID', {day: '2-digit', month: '2-digit', year: 'numeric'});
    const timePart = date.toLocaleTimeString('id-ID', { hour12: false }).replace(/\./g, ':');
    return `${datePart}, ${timePart}`;
  };
  
  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-full">
            <Spinner />
        </div>
    );
  }
  
  const getRoleBadgeClass = (role?: Role) => {
    if (!role) return 'bg-gray-500/30 text-gray-300';
    switch (role) {
      case Role.Admin:
        return 'bg-purple-500/30 text-purple-300';
      case Role.Teacher:
        return 'bg-blue-500/30 text-blue-300';
      case Role.Coach:
        return 'bg-green-500/30 text-green-300';
      case Role.AdministrativeStaff:
        return 'bg-slate-500/30 text-slate-300';
      default:
        return 'bg-gray-500/30 text-gray-300';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      </div>

      {isSystemEmpty ? (
        <EmptyStateDashboard />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {qrSettings && (
              <div className="lg:col-span-3">
                <Card title="Pengaturan Scan QR (Admin)">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-white">Aktifkan Scan QR</h4>
                        <p className="text-sm text-slate-400">Matikan untuk menghentikan semua scan QR sementara.</p>
                      </div>
                      <div>
                        <label className="inline-flex items-center">
                          <input type="checkbox" checked={qrSettings.globalEnabled} onChange={(e) => setQrSettings(prev => prev ? ({ ...prev, globalEnabled: e.target.checked }) : prev)} className="mr-2" />
                          <span className="text-sm">{qrSettings.globalEnabled ? 'Aktif' : 'Nonaktif'}</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-3 bg-slate-800/40 rounded">
                        <p className="text-sm text-slate-300">Guru</p>
                        <label className="inline-flex items-center mt-2">
                          <input type="checkbox" checked={qrSettings.roles.Teacher} onChange={(e) => setQrSettings(prev => prev ? ({ ...prev, roles: { ...prev.roles, Teacher: e.target.checked } }) : prev)} className="mr-2" />
                          <span className="text-sm">{qrSettings.roles.Teacher ? 'Aktif' : 'Nonaktif'}</span>
                        </label>
                      </div>
                      <div className="p-3 bg-slate-800/40 rounded">
                        <p className="text-sm text-slate-300">Pembina</p>
                        <label className="inline-flex items-center mt-2">
                          <input type="checkbox" checked={qrSettings.roles.Coach} onChange={(e) => setQrSettings(prev => prev ? ({ ...prev, roles: { ...prev.roles, Coach: e.target.checked } }) : prev)} className="mr-2" />
                          <span className="text-sm">{qrSettings.roles.Coach ? 'Aktif' : 'Nonaktif'}</span>
                        </label>
                      </div>
                      <div className="p-3 bg-slate-800/40 rounded">
                        <p className="text-sm text-slate-300">Tendik</p>
                        <label className="inline-flex items-center mt-2">
                          <input type="checkbox" checked={qrSettings.roles.AdministrativeStaff} onChange={(e) => setQrSettings(prev => prev ? ({ ...prev, roles: { ...prev.roles, AdministrativeStaff: e.target.checked } }) : prev)} className="mr-2" />
                          <span className="text-sm">{qrSettings.roles.AdministrativeStaff ? 'Aktif' : 'Nonaktif'}</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button className="px-4 py-2 bg-indigo-600 text-white rounded" disabled={isSavingQrSettings} onClick={async () => {
                        setIsSavingQrSettings(true);
                        try {
                          if (qrSettings) await setQRScanSettings(qrSettings);
                        } catch (err) {
                          console.error('Failed to save QR settings', err);
                        } finally {
                          setIsSavingQrSettings(false);
                        }
                      }}>{isSavingQrSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}</button>
                    </div>
                  </div>
                </Card>
              </div>
            )}
            <Card>
              <h4 className="text-sm font-medium text-gray-400 text-center">Total Personil Terdaftar</h4>
              <p className="text-5xl font-bold text-white text-center py-4">{stats.total}</p>
              <div className="mt-2 pt-2 border-t border-slate-700 grid grid-cols-3 gap-1 text-center">
                  <div>
                      <p className="font-bold text-lg text-slate-200">{stats.teachers}</p>
                      <p className="text-xs text-slate-400">Guru</p>
                  </div>
                  <div>
                      <p className="font-bold text-lg text-slate-200">{stats.staff}</p>
                      <p className="text-xs text-slate-400">Tendik</p>
                  </div>
                  <div>
                      <p className="font-bold text-lg text-slate-200">{stats.coaches}</p>
                      <p className="text-xs text-slate-400">Pembina</p>
                  </div>
              </div>
            </Card>
            <Card>
              <h4 className="text-sm font-medium text-gray-400 text-center">Personil Hadir Hari Ini</h4>
              <p className="text-5xl font-bold text-emerald-400 text-center py-4">{stats.present}</p>
              <div className="mt-2 pt-2 border-t border-slate-700 grid grid-cols-3 gap-1 text-center">
                  <div>
                      <p className="font-bold text-lg text-slate-200">{presentBreakdown.teachers}</p>
                      <p className="text-xs text-slate-400">Guru</p>
                  </div>
                  <div>
                      <p className="font-bold text-lg text-slate-200">{presentBreakdown.staff}</p>
                      <p className="text-xs text-slate-400">Tendik</p>
                  </div>
                  <div>
                      <p className="font-bold text-lg text-slate-200">{presentBreakdown.coaches}</p>
                      <p className="text-xs text-slate-400">Pembina</p>
                  </div>
              </div>
            </Card>
            <Card>
              <h4 className="text-sm font-medium text-gray-400 text-center">Personil Absen Hari Ini</h4>
              <p className="text-5xl font-bold text-red-400 text-center py-4">{stats.absent}</p>
              <div className="mt-2 pt-2 border-t border-slate-700 grid grid-cols-3 gap-1 text-center">
                  <div>
                      <p className="font-bold text-lg text-slate-200">{absentBreakdown.teachers}</p>
                      <p className="text-xs text-slate-400">Guru</p>
                  </div>
                  <div>
                      <p className="font-bold text-lg text-slate-200">{absentBreakdown.staff}</p>
                      <p className="text-xs text-slate-400">Tendik</p>
                  </div>
                  <div>
                      <p className="font-bold text-lg text-slate-200">{absentBreakdown.coaches}</p>
                      <p className="text-xs text-slate-400">Pembina</p>
                  </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
                <Card title="Ringkasan Absensi Hari Ini">
                    <AttendancePieChart present={stats.present} absent={stats.absent} />
                </Card>

                <Card title="Rekap Pelanggaran Absensi">
                    <div className="overflow-y-auto max-h-56">
                      {isOffendersLoading ? (
                        <p className="text-slate-400">Memeriksa data...</p>
                      ) : repeatOffenders.length === 0 ? (
                        <p className="text-slate-400">Tidak ada guru dengan alpa &gt; 10 JP sejak awal bulan.</p>
                      ) : (
                        <ul className="space-y-3">
                          {repeatOffenders.map(item => (
                            <li key={item.user.id} className="flex items-start justify-between bg-slate-800/50 border border-slate-700 p-3 rounded-lg">
                              <div>
                                <p className="text-sm font-semibold text-white">{item.user.name}</p>
                                <p className="text-xs text-slate-400">{item.user.email || '—'}</p>
                                <p className="text-xs text-amber-300 mt-1">Jumlah ketidakhadiran: {item.missingCount} JP</p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <button
                                  className="px-3 py-1 text-sm bg-amber-500 text-slate-900 rounded-lg"
                                  onClick={() => {
                                    // open modal with letter text
                                    const u = item.user;
                                    const text = `Yth. ${u.name},%0A%0AAnda tercatat tidak melakukan absensi sebanyak ${item.missingCount} Jam Pelajaran (JP) sejak awal bulan ini. Mohon hadir dan konfirmasi kehadiran Anda segera. Jika diperlukan, silakan hadir ke kantor untuk klarifikasi.%0A%0AHormat kami,%0AAdmin`;
                                    setSelectedUserForLetter(u);
                                    setLetterText(decodeURIComponent(text.replace(/%0A/g, '\n')));
                                    setIsLetterModalOpen(true);
                                  }}
                                >
                                  Buat Surat / Kirim WA
                                </button>
                                <button
                                  className="px-3 py-1 text-sm bg-slate-700 text-slate-200 rounded-lg border border-slate-600"
                                  onClick={() => {
                                    const u = item.user as any;
                                    const phone = u.phone || u.phoneNumber || u.tel;
                                    const plain = `Yth. ${u.name},\nAnda tercatat tidak melakukan absensi sebanyak ${item.missingCount} Jam Pelajaran (JP) sejak awal bulan ini. Mohon hadir dan konfirmasi kehadiran Anda segera.`;
                                    if (phone) {
                                      let normalized = String(phone).replace(/[^0-9+]/g, '');
                                      if (normalized.startsWith('0')) normalized = '62' + normalized.slice(1);
                                      if (normalized.startsWith('+')) normalized = normalized.slice(1);
                                      const waUrl = `https://wa.me/${normalized}?text=${encodeURIComponent(plain)}`;
                                      window.open(waUrl, '_blank');
                                    } else {
                                      navigator.clipboard.writeText(plain).then(() => {
                                        addToast('Teks pesan disalin. Buka WhatsApp Web dan tempel ke kontak guru.', 'info');
                                        window.open('https://web.whatsapp.com/', '_blank');
                                      }).catch(() => {
                                        addToast('Gagal menyalin teks. Silakan salin secara manual.', 'error');
                                        window.open('https://web.whatsapp.com/', '_blank');
                                      });
                                    }
                                  }}
                                >
                                  Kirim WA
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                </Card>
            </div>
            <div className="lg:col-span-3 flex flex-col gap-6">
                <Card title="Aktivitas Absensi Terbaru">
                  <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-600 text-sm font-semibold text-gray-200">
                                    <th className="p-3">Pengguna</th>
                                    <th className="p-3">Peran</th>
                                    <th className="p-3">Waktu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentRecords.length > 0 ? recentRecords.map(record => (
                                    <tr key={record.id} className="border-b border-slate-700 last:border-0 text-sm">
                                        <td className="p-3 whitespace-nowrap">{record.userName}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeClass(record.role)}`}>
                                                {record.role || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-gray-400">{formatDate(record.timestamp)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                      <td colSpan={3} className="p-3 text-center text-gray-400">Belum ada aktivitas.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                  </div>
                </Card>
                <Card title="Personil Belum Absen Hari Ini">
                    <div className="overflow-y-auto max-h-80">
                        {absentPersonnel.length > 0 ? (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-600 text-sm font-semibold text-gray-200">
                                        <th className="p-3">Nama</th>
                                        <th className="p-3">Peran</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {absentPersonnel.map(user => (
                                        <tr key={user.id} className="border-b border-slate-700 last:border-0 text-sm">
                                            <td className="p-3 whitespace-nowrap">{user.name}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="p-3 text-center text-gray-400">Semua personil sudah melakukan absensi hari ini.</p>
                        )}
                    </div>
                </Card>
                  
            </div>
          </div>
        </>
      )}

      <footer className="text-center text-gray-500 text-sm pt-4">
        © Rullp 2025 HadirKu. All rights reserved.
      </footer>
        <Modal isOpen={isLetterModalOpen} onClose={() => setIsLetterModalOpen(false)} title={selectedUserForLetter ? `Surat untuk ${selectedUserForLetter.name}` : 'Surat'}>
        <div className="space-y-4">
          <label className="text-sm text-slate-300">Teks Surat / Pesan (boleh diubah)</label>
          <textarea value={letterText} onChange={(e) => setLetterText(e.target.value)} rows={10} className="w-full p-3 bg-slate-900 border border-slate-700 rounded-md text-slate-200" />
          <div className="flex justify-between items-center">
            <div>
              <button className="px-3 py-2 bg-slate-700 text-slate-200 rounded-lg mr-2" onClick={() => { navigator.clipboard.writeText(letterText).then(() => addToast('Teks surat disalin ke clipboard.', 'success')).catch(() => addToast('Gagal menyalin teks.', 'error')); }}>Salin</button>
              <button className="px-3 py-2 bg-indigo-600 text-white rounded-lg" onClick={() => { setLetterText(''); }}>Reset</button>
            </div>
            <div>
              <button className="px-3 py-2 bg-emerald-600 text-white rounded-lg" onClick={() => {
                // try to open WA if phone exists, otherwise open whatsapp web
                if (!selectedUserForLetter) return;
                const u = selectedUserForLetter as any;
                const phone = u.phone || u.phoneNumber || u.tel;
                const text = letterText;
                if (phone) {
                  let normalized = String(phone).replace(/[^0-9+]/g, '');
                  if (normalized.startsWith('0')) normalized = '62' + normalized.slice(1);
                  if (normalized.startsWith('+')) normalized = normalized.slice(1);
                  const waUrl = `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
                  window.open(waUrl, '_blank');
                } else {
                  navigator.clipboard.writeText(text).then(() => {
                    addToast('Teks surat disalin. Buka WhatsApp Web dan tempel pesan ke kontak guru.', 'info');
                    window.open('https://web.whatsapp.com/', '_blank');
                  }).catch(() => {
                    addToast('Gagal menyalin teks. Silakan salin secara manual.', 'error');
                    window.open('https://web.whatsapp.com/', '_blank');
                  });
                }
              }}>Kirim via WA</button>
            </div>
          </div>
        </div>
        </Modal>
    </div>
  );
};

export default DashboardContent;