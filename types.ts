export enum Role {
  Admin = 'ADMIN',
  Teacher = 'Guru',
  Coach = 'Pembina Ekstrakurikuler',
  AdministrativeStaff = 'Tenaga Administrasi',
}

export interface User {
  id: string; // Corresponds to Firebase Auth uid
  name: string;
  email: string;
  role: Role;
  kode?: string; // Teacher's unique code from master schedule
  // New editable profile fields
  title?: string; // e.g., S.Pd, M.Kom
  position?: string; // e.g., Guru Mapel, Kepala TU
  rank?: string; // e.g., III/d, Penata Tk. I
  subject?: string; // Specific subject taught
  photoURL?: string; // URL to profile picture in storage
}

export interface AttendanceRecord {
  id: string;
  teacherId: string;
  userName: string;
  timestamp: Date;
  checkOutTimestamp?: Date; // To record clock-out time for staff
  date: string;
  status: string; // e.g., 'Present', 'Late', 'Sakit', 'Datang', 'Pulang'
  reason?: string;
  // Fields to link attendance to a specific lesson
  scheduleId?: string;
  subject?: string;
  class?: string;
  period?: number;
}

export interface Class {
  id: string;
  name: string;
  grade: number;
}

export interface Eskul {
  id: string;
  name: string;
}

export interface LessonSchedule {
  id: string;
  day: string;
  time: string;
  teacher: string; // Teacher's name
  teacherId: string; // Teacher's UID
  subject: string;
  class: string;
  period: number;
}

export interface EskulSchedule {
  id: string;
  day: string;
  time: string;
  coach: string;
  activity: string;
}

export interface StudentAbsenceRecord {
  id: string;
  studentName: string;
  class: string;
  date: string;
  reason: 'Sakit' | 'Izin' | 'Alpa';
  reportedBy: string; // Teacher's name
  teacherId: string; // Teacher's UID
  absentPeriods?: number[]; // To record specific lesson periods
}

export interface MasterSchedule {
  id: string;
  kode: string;
  namaGuru: string;
  subject: string;
  class: string;
  day: string;
  period: number; // Jam Ke
  jumlahJam: number; // Jumlah Jam
  waktu: string; // Waktu pelajaran, e.g., "07:30 - 08:10"
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  senderName: string; // The name of the sender at the time of sending
  content: string;
  timestamp: Date;
  isRead: boolean;
}