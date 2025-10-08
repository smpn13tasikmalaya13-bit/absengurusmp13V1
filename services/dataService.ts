import { Class, Eskul, LessonSchedule, EskulSchedule, StudentAbsenceRecord } from '../types';
import { collection, getDocs, query, orderBy, addDoc, doc, deleteDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';


// ========================================================================
// MOCK DATA - ONLY USED FOR THE DATABASE SEEDER
// ========================================================================

export const MOCK_CLASSES: Omit<Class, 'id'>[] = [
  { name: 'VII H', grade: 7 },
  { name: 'VIII C', grade: 8 },
  { name: 'VII E', grade: 7 },
  { name: 'VII A', grade: 7 },
  { name: 'VII J', grade: 7 },
  { name: 'VIII A', grade: 8 },
  { name: 'VII K', grade: 7 },
  { name: 'IX F', grade: 9 },
  { name: 'VIII J', grade: 8 },
  { name: 'IX A', grade: 9 },
  { name: 'VII F', grade: 7 },
  { name: 'VII D', grade: 7 },
];

export const MOCK_ESKULS: Omit<Eskul, 'id'>[] = [
  { name: 'Basket' },
  { name: 'Bola Volly' },
  { name: 'Bulu Tangkis' },
  { name: 'Kesenian' },
  { name: 'PKS' },
  { name: 'PMR' },
  { name: 'Paskibra' },
  { name: 'Pencak Silat' },
  { name: 'Pramuka' },
  { name: 'Sepak bola dan Futsal' },
  { name: 'Taekwondo' },
  { name: 'Tahfidz' },
];

export const MOCK_LESSON_SCHEDULE: Omit<LessonSchedule, 'id'>[] = [
  { day: 'Senin', time: '08:00 - 08:40', teacher: 'Suherlan', subject: 'PP', class: 'IX I', period: 1 },
  { day: 'Senin', time: '08:40 - 09:20', teacher: 'Suherlan', subject: 'PP', class: 'IX I', period: 2 },
  { day: 'Senin', time: '09:00 - 10:40', teacher: 'Alita Yatnikasari Putri', subject: 'IPA', class: 'VII J', period: 2 },
  { day: 'Senin', time: '09:40 - 10:20', teacher: 'Suherlan', subject: 'PP', class: 'IX K', period: 3 },
  { day: 'Senin', time: '10:20 - 11:00', teacher: 'Suherlan', subject: 'PP', class: 'IX K', period: 4 },
  { day: 'Senin', time: '10:40 - 11:20', teacher: 'Alita Yatnikasari Putri', subject: 'IPA', class: 'VII H', period: 4 },
  { day: 'Senin', time: '11:00 - 11:40', teacher: 'Suherlan', subject: 'PP', class: 'IX G', period: 5 },
  { day: 'Senin', time: '12:30 - 13:10', teacher: 'Suherlan', subject: 'PP', class: 'IX G', period: 6 },
];

export const MOCK_EXTRA_SCHEDULE: Omit<EskulSchedule, 'id'>[] = [
    { day: 'Selasa', time: '18:30 - 20:30', coach: 'Rizal Andrianto', activity: 'Pencak Silat' },
    { day: 'Kamis', time: '14:30 - 16:30', coach: 'Rizal Andrianto', activity: 'Pencak Silat' },
    { day: 'Kamis', time: '14:30 - 16:30', coach: 'Suherlan', activity: 'Pramuka' },
    { day: 'Jumat', time: '13:00 - 16:00', coach: 'Suherlan', activity: 'Pramuka' },
];

// ========================================================================
// FIRESTORE DATA FETCHING FUNCTIONS
// ========================================================================

// Fetch all classes from Firestore
export const getAllClasses = async (): Promise<Class[]> => {
    try {
        const classesCol = collection(db, 'classes');
        const q = query(classesCol, orderBy('name'));
        const classSnapshot = await getDocs(q);
        return classSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class));
    } catch (error) {
        console.error("Error fetching classes:", error);
        return [];
    }
};

// Add a new class to Firestore
export const addClass = async (name: string, grade: number): Promise<void> => {
    if (!name || !grade) {
        throw new Error("Class name and grade are required.");
    }
    try {
        const classesCol = collection(db, 'classes');
        await addDoc(classesCol, { name, grade });
    } catch (error) {
        console.error("Error adding class:", error);
        throw new Error("Failed to add new class. Please try again.");
    }
};

// Delete a class from Firestore
export const deleteClass = async (id: string): Promise<void> => {
    if (!id) {
        throw new Error("Class ID is required to delete.");
    }
    try {
        const classDocRef = doc(db, 'classes', id);
        await deleteDoc(classDocRef);
    } catch (error) {
        console.error("Error deleting class:", error);
        throw new Error("Failed to delete the class. Please try again.");
    }
};

// Fetch all eskuls from Firestore
export const getAllEskuls = async (): Promise<Eskul[]> => {
    try {
        const eskulsCol = collection(db, 'eskuls');
        const q = query(eskulsCol, orderBy('name'));
        const eskulSnapshot = await getDocs(q);
        return eskulSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Eskul));
    } catch (error) {
        console.error("Error fetching eskuls:", error);
        return [];
    }
};

// Add a new eskul to Firestore
export const addEskul = async (name: string): Promise<void> => {
    if (!name) {
        throw new Error("Eskul name is required.");
    }
    try {
        const eskulsCol = collection(db, 'eskuls');
        await addDoc(eskulsCol, { name });
    } catch (error) {
        console.error("Error adding eskul:", error);
        throw new Error("Failed to add new eskul. Please try again.");
    }
};

// Delete an eskul from Firestore
export const deleteEskul = async (id: string): Promise<void> => {
    if (!id) {
        throw new Error("Eskul ID is required to delete.");
    }
    try {
        const eskulDocRef = doc(db, 'eskuls', id);
        await deleteDoc(eskulDocRef);
    } catch (error) {
        console.error("Error deleting eskul:", error);
        throw new Error("Failed to delete the eskul. Please try again.");
    }
};

// Fetch all lesson schedules from Firestore
export const getAllLessonSchedules = async (): Promise<LessonSchedule[]> => {
    try {
        const schedulesCol = collection(db, 'lessonSchedules');
        const q = query(schedulesCol, orderBy('day'), orderBy('time'));
        const scheduleSnapshot = await getDocs(q);
        return scheduleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LessonSchedule));
    } catch (error) {
        console.error("Error fetching lesson schedules:", error);
        return [];
    }
};

// Add a new lesson schedule to Firestore
export const addLessonSchedule = async (schedule: Omit<LessonSchedule, 'id'>): Promise<void> => {
    try {
        const schedulesCol = collection(db, 'lessonSchedules');
        await addDoc(schedulesCol, schedule);
    } catch (error) {
        console.error("Error adding lesson schedule:", error);
        throw new Error("Failed to add new lesson schedule. Please try again.");
    }
};

// Update a lesson schedule in Firestore
export const updateLessonSchedule = async (id: string, schedule: Partial<LessonSchedule>): Promise<void> => {
    if (!id) {
        throw new Error("Schedule ID is required to update.");
    }
    try {
        const scheduleDocRef = doc(db, 'lessonSchedules', id);
        await updateDoc(scheduleDocRef, schedule);
    } catch (error) {
        console.error("Error updating lesson schedule:", error);
        throw new Error("Failed to update the lesson schedule. Please try again.");
    }
};

// Delete a lesson schedule from Firestore
export const deleteLessonSchedule = async (id: string): Promise<void> => {
    if (!id) {
        throw new Error("Schedule ID is required to delete.");
    }
    try {
        const scheduleDocRef = doc(db, 'lessonSchedules', id);
        await deleteDoc(scheduleDocRef);
    } catch (error) {
        console.error("Error deleting lesson schedule:", error);
        throw new Error("Failed to delete the lesson schedule. Please try again.");
    }
};

// Fetch all eskul schedules from Firestore
export const getAllEskulSchedules = async (): Promise<EskulSchedule[]> => {
    try {
        const schedulesCol = collection(db, 'eskulSchedules');
        const q = query(schedulesCol, orderBy('day'), orderBy('time'));
        const scheduleSnapshot = await getDocs(q);
        return scheduleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EskulSchedule));
    } catch (error) {
        console.error("Error fetching eskul schedules:", error);
        return [];
    }
};

// Fetch lesson schedules for a specific teacher
export const getSchedulesByTeacher = async (teacherName: string): Promise<LessonSchedule[]> => {
    try {
        const schedulesCol = collection(db, 'lessonSchedules');
        const q = query(
            schedulesCol, 
            where('teacher', '==', teacherName),
            orderBy('day'), 
            orderBy('time')
        );
        const scheduleSnapshot = await getDocs(q);
        return scheduleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LessonSchedule));
    } catch (error) {
        console.error("Error fetching schedules by teacher:", error);
        return [];
    }
};

// Report a student's absence
export const reportStudentAbsence = async (record: Omit<StudentAbsenceRecord, 'id'>): Promise<void> => {
    try {
        const studentAbsencesCol = collection(db, 'studentAbsences');
        await addDoc(studentAbsencesCol, record);
    } catch (error) {
        console.error("Error reporting student absence:", error);
        throw new Error("Failed to report student absence. Please try again.");
    }
};

// Fetch student absences reported by a specific teacher for a given date
export const getStudentAbsencesByTeacherForDate = async (teacherName: string, date: string): Promise<StudentAbsenceRecord[]> => {
    try {
        const studentAbsencesCol = collection(db, 'studentAbsences');
        const q = query(
            studentAbsencesCol,
            where('reportedBy', '==', teacherName),
            where('date', '==', date)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentAbsenceRecord));
    } catch (error) {
        console.error("Error fetching student absences:", error);
        return [];
    }
};