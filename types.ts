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
}

export interface Class {
  id: string;
  name: string;
  grade: number;
}

export interface Extracurricular {
  id: string;
  name: string;
}

export interface LessonSchedule {
  id: string;
  day: string;
  time: string;
  teacher: string;
  subject: string;
  class: string;
  period: number;
}

export interface ExtracurricularSchedule {
  id: string;
  day: string;
  time: string;
  coach: string;
  activity: string;
}