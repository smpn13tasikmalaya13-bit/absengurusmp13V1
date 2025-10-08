import { Class, Extracurricular, LessonSchedule, ExtracurricularSchedule } from '../types';

export const MOCK_CLASSES: Class[] = [
  { id: 'c1', name: 'VII H', grade: 7 },
  { id: 'c2', name: 'VIII C', grade: 8 },
  { id: 'c3', name: 'VII E', grade: 7 },
  { id: 'c4', name: 'VII A', grade: 7 },
  { id: 'c5', name: 'VII J', grade: 7 },
  { id: 'c6', name: 'VIII A', grade: 8 },
  { id: 'c7', name: 'VII K', grade: 7 },
  { id: 'c8', name: 'IX F', grade: 9 },
  { id: 'c9', name: 'VIII J', grade: 8 },
  { id: 'c10', name: 'IX A', grade: 9 },
  { id: 'c11', name: 'VII F', grade: 7 },
  { id: 'c12', name: 'VII D', grade: 7 },
];

export const MOCK_EXTRACURRICULARS: Extracurricular[] = [
  { id: 'e1', name: 'Basket' },
  { id: 'e2', name: 'Bola Volly' },
  { id: 'e3', name: 'Bulu Tangkis' },
  { id: 'e4', name: 'Kesenian' },
  { id: 'e5', name: 'PKS' },
  { id: 'e6', name: 'PMR' },
  { id: 'e7', name: 'Paskibra' },
  { id: 'e8', name: 'Pencak Silat' },
  { id: 'e9', name: 'Pramuka' },
  { id: 'e10', name: 'Sepak bola dan Futsal' },
  { id: 'e11', name: 'Taekwondo' },
  { id: 'e12', name: 'Tahfidz' },
];

export const MOCK_LESSON_SCHEDULE: LessonSchedule[] = [
  { id: 'ls1', day: 'Senin', time: '08:00 - 08:40', teacher: 'Suherlan', subject: 'PP', class: 'IX I', period: 1 },
  { id: 'ls2', day: 'Senin', time: '08:40 - 09:20', teacher: 'Suherlan', subject: 'PP', class: 'IX I', period: 2 },
  { id: 'ls3', day: 'Senin', time: '09:00 - 10:40', teacher: 'Alita Yatnikasari Putri', subject: 'IPA', class: 'VII J', period: 2 },
  { id: 'ls4', day: 'Senin', time: '09:40 - 10:20', teacher: 'Suherlan', subject: 'PP', class: 'IX K', period: 3 },
  { id: 'ls5', day: 'Senin', time: '10:20 - 11:00', teacher: 'Suherlan', subject: 'PP', class: 'IX K', period: 4 },
  { id: 'ls6', day: 'Senin', time: '10:40 - 11:20', teacher: 'Alita Yatnikasari Putri', subject: 'IPA', class: 'VII H', period: 4 },
  { id: 'ls7', day: 'Senin', time: '11:00 - 11:40', teacher: 'Suherlan', subject: 'PP', class: 'IX G', period: 5 },
  { id: 'ls8', day: 'Senin', time: '12:30 - 13:10', teacher: 'Suherlan', subject: 'PP', class: 'IX G', period: 6 },
];

export const MOCK_EXTRA_SCHEDULE: ExtracurricularSchedule[] = [
    { id: 'es1', day: 'Selasa', time: '18:30 - 20:30', coach: 'Rizal Andrianto', activity: 'Pencak Silat' },
    { id: 'es2', day: 'Kamis', time: '14:30 - 16:30', coach: 'Rizal Andrianto', activity: 'Pencak Silat' },
    { id: 'es3', day: 'Kamis', time: '14:30 - 16:30', coach: 'Suherlan', activity: 'Pramuka' },
    { id: 'es4', day: 'Jumat', time: '13:00 - 16:00', coach: 'Suherlan', activity: 'Pramuka' },
];
