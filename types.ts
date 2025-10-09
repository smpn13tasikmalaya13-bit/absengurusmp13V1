export enum Role {
  Admin = 'ADMIN',
  Teacher = 'Guru',
  Coach = 'Pembina Ekstrakurikuler',
}

export interface User {
  id: string; // Corresponds to Firebase Auth uid
  name: string;
  email: string;
  role: Role;
}

export interface AttendanceRecord {
  id: string;
  teacherId: string;
  userName: string;
  timestamp: Date;
  date: string;
  status: string; // e.g., 'Present', 'Late', 'Sakit'
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