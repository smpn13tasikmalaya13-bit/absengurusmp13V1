import { Class, Eskul, LessonSchedule, EskulSchedule, StudentAbsenceRecord, User, MasterSchedule } from '../types';
import { collection, getDocs, query, orderBy, addDoc, doc, deleteDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';


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

// FIX: Added missing teacherId to mock data to match LessonSchedule type.
export const MOCK_LESSON_SCHEDULE: Omit<LessonSchedule, 'id'>[] = [
  { day: 'Senin', time: '08:00 - 08:40', teacher: 'Suherlan', teacherId: 'mock-teacher-id-1', subject: 'PP', class: 'IX A', period: 1 },
  { day: 'Senin', time: '08:40 - 09:20', teacher: 'Suherlan', teacherId: 'mock-teacher-id-1', subject: 'PP', class: 'IX A', period: 2 },
  { day: 'Senin', time: '09:00 - 10:40', teacher: 'Alita Yatnikasari Putri', teacherId: 'mock-teacher-id-2', subject: 'IPA', class: 'VII J', period: 2 },
  { day: 'Senin', time: '09:40 - 10:20', teacher: 'Suherlan', teacherId: 'mock-teacher-id-1', subject: 'PP', class: 'IX F', period: 3 },
  { day: 'Senin', time: '10:20 - 11:00', teacher: 'Suherlan', teacherId: 'mock-teacher-id-1', subject: 'PP', class: 'IX F', period: 4 },
  { day: 'Senin', time: '10:40 - 11:20', teacher: 'Alita Yatnikasari Putri', teacherId: 'mock-teacher-id-2', subject: 'IPA', class: 'VII H', period: 4 },
  { day: 'Senin', time: '11:00 - 11:40', teacher: 'Suherlan', teacherId: 'mock-teacher-id-1', subject: 'PP', class: 'IX F', period: 5 },
  { day: 'Senin', time: '12:30 - 13:10', teacher: 'Suherlan', teacherId: 'mock-teacher-id-1', subject: 'PP', class: 'IX F', period: 6 },
];

export const MOCK_EXTRA_SCHEDULE: Omit<EskulSchedule, 'id'>[] = [
    { day: 'Selasa', time: '18:30 - 20:30', coach: 'Rizal Andrianto', activity: 'Pencak Silat' },
    { day: 'Kamis', time: '14:30 - 16:30', coach: 'Rizal Andrianto', activity: 'Pencak Silat' },
    { day: 'Kamis', time: '14:30 - 16:30', coach: 'Suherlan', activity: 'Pramuka' },
    { day: 'Jumat', time: '13:00 - 16:00', coach: 'Suherlan', activity: 'Pramuka' },
];

// ========================================================================
// FIRESTORE DATA MUTATION FUNCTIONS
// ========================================================================

/**
 * Uploads a profile photo to Firebase Storage.
 * @param file The image file to upload.
 * @param userId The ID of the user.
 * @returns The public download URL of the uploaded image.
 */
export const uploadProfilePhoto = async (file: File, userId: string): Promise<string> => {
    try {
        const filePath = `profile-pictures/${userId}/${file.name}`;
        const storageRef = ref(storage, filePath);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error("Error uploading profile photo:", error);
        throw new Error("Gagal mengunggah foto profil.");
    }
};

/**
 * Updates a user's profile data in Firestore.
 * @param userId The ID of the user to update.
 * @param data The partial user data to update.
 */
export const updateUserProfile = async (userId: string, data: Partial<User>): Promise<void> => {
    try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, data);
    } catch (error) {
        console.error("Error updating user profile:", error);
        throw new Error("Gagal memperbarui profil pengguna.");
    }
};

/**
 * Replaces the entire master schedule collection with new data from an upload.
 * This is an atomic operation to ensure data consistency.
 * @param schedules An array of master schedule objects to upload.
 */
export const uploadMasterSchedule = async (schedules: Omit<MasterSchedule, 'id'>[]): Promise<void> => {
    const batch = writeBatch(db);
    const masterSchedulesCol = collection(db, 'masterSchedules');

    try {
        // Step 1: Query for all existing documents in the collection.
        const existingDocsSnapshot = await getDocs(query(masterSchedulesCol));
        
        // Step 2: Add delete operations for all existing documents to the batch.
        existingDocsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Step 3: Add set operations for the new documents to the batch.
        schedules.forEach(scheduleData => {
            const docRef = doc(masterSchedulesCol); // Firestore generates a new unique ID
            batch.set(docRef, scheduleData);
        });

        // Step 4: Commit the batch to atomically delete old data and add new data.
        await batch.commit();
    } catch (error: any) {
        console.error("Error uploading master schedule:", error);
        if (error.code === 'permission-denied') {
            throw new Error("Izin ditolak. Pastikan Security Rules Firestore mengizinkan Admin untuk menulis dan membaca koleksi 'masterSchedules'.");
        }
        throw new Error("Gagal mengunggah jadwal induk. Operasi dibatalkan.");
    }
};


// ========================================================================
// FIRESTORE DATA FETCHING FUNCTIONS
// ========================================================================

/**
 * Fetches the entire master schedule collection from Firestore.
 * This data is used as the source of truth for schedule validation.
 * @returns A promise that resolves to an array of master schedules.
 */
export const getAllMasterSchedules = async (): Promise<MasterSchedule[]> => {
    try {
        const masterSchedulesCol = collection(db, 'masterSchedules');
        const q = query(masterSchedulesCol);
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MasterSchedule));
    } catch (error: any) {
        console.error("Error fetching master schedules:", error);
        if (error.code === 'permission-denied') {
            throw new Error("Gagal mengambil jadwal induk: Izin ditolak. Periksa aturan keamanan (security rules) Firestore Anda.");
        }
        throw new Error("Gagal mengambil data jadwal induk dari server.");
    }
};


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
    } catch (error: any) {
        console.error("Error fetching lesson schedules:", error);
        if (error.code === 'failed-precondition') {
            alert(`Query to fetch schedules failed. A composite index is required in Firestore. Please open the developer console (F12) for a direct link to create it, or manually create an index on the 'lessonSchedules' collection for fields: day (ascending), time (ascending).\n\n${error.message}`);
        }
        return [];
    }
};

// Add a new lesson schedule to Firestore
export const addLessonSchedule = async (schedule: Omit<LessonSchedule, 'id'>): Promise<LessonSchedule> => {
    try {
        const schedulesCol = collection(db, 'lessonSchedules');
        const docRef = await addDoc(schedulesCol, schedule);
        return { id: docRef.id, ...schedule } as LessonSchedule;
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

// Add a new eskul schedule to Firestore
export const addEskulSchedule = async (schedule: Omit<EskulSchedule, 'id'>): Promise<void> => {
    try {
        const schedulesCol = collection(db, 'eskulSchedules');
        await addDoc(schedulesCol, schedule);
    } catch (error) {
        console.error("Error adding eskul schedule:", error);
        throw new Error("Failed to add new eskul schedule. Please try again.");
    }
};

// Update an eskul schedule in Firestore
export const updateEskulSchedule = async (id: string, schedule: Partial<EskulSchedule>): Promise<void> => {
    if (!id) {
        throw new Error("Schedule ID is required to update.");
    }
    try {
        const scheduleDocRef = doc(db, 'eskulSchedules', id);
        await updateDoc(scheduleDocRef, schedule);
    } catch (error) {
        console.error("Error updating eskul schedule:", error);
        throw new Error("Failed to update the eskul schedule. Please try again.");
    }
};

// Delete an eskul schedule from Firestore
export const deleteEskulSchedule = async (id: string): Promise<void> => {
    if (!id) {
        throw new Error("Schedule ID is required to delete.");
    }
    try {
        const scheduleDocRef = doc(db, 'eskulSchedules', id);
        await deleteDoc(scheduleDocRef);
    } catch (error) {
        console.error("Error deleting eskul schedule:", error);
        throw new Error("Failed to delete the eskul schedule. Please try again.");
    }
};

// Fetch lesson schedules for a specific teacher
export const getSchedulesByTeacher = async (teacherId: string): Promise<LessonSchedule[]> => {
    try {
        const schedulesCol = collection(db, 'lessonSchedules');
        const q = query(
            schedulesCol, 
            where('teacherId', '==', teacherId),
            orderBy('day'), 
            orderBy('time')
        );
        const scheduleSnapshot = await getDocs(q);
        return scheduleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LessonSchedule));
    } catch (error: any) {
        console.error("Error fetching schedules by teacher:", error);
        if (error.code === 'failed-precondition') {
            alert(`Query to fetch schedules failed. A composite index is required in Firestore. Please open the developer console (F12) for a direct link to create it, or manually create an index on the 'lessonSchedules' collection for fields: teacherId (ascending), day (ascending), time (ascending).\n\n${error.message}`);
        }
        return [];
    }
};

// Report a student's absence
export const reportStudentAbsence = async (record: Omit<StudentAbsenceRecord, 'id'>): Promise<void> => {
    try {
        const studentAbsencesCol = collection(db, 'studentAbsenceRecords');
        await addDoc(studentAbsencesCol, record);
    } catch (error) {
        console.error("Error reporting student absence:", error);
        throw new Error("Failed to report student absence. Please try again.");
    }
};

// Fetch student absences reported by a specific teacher for a given date
export const getStudentAbsencesByTeacherForDate = async (teacherId: string, date: string): Promise<StudentAbsenceRecord[]> => {
    try {
        const studentAbsencesCol = collection(db, 'studentAbsenceRecords');
        const q = query(
            studentAbsencesCol,
            where('teacherId', '==', teacherId),
            where('date', '==', date)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentAbsenceRecord));
    } catch (error) {
        console.error("Error fetching student absences:", error);
        return [];
    }
};

// Fetch all student absences reported by a specific teacher
export const getStudentAbsencesByTeacher = async (teacherId: string): Promise<StudentAbsenceRecord[]> => {
    try {
        const studentAbsencesCol = collection(db, 'studentAbsenceRecords');
        const q = query(
            studentAbsencesCol,
            where('teacherId', '==', teacherId)
            // orderBy('date', 'desc') // This requires a composite index. Removing for now.
        );
        const snapshot = await getDocs(q);
        const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentAbsenceRecord));
        
        // Sort client-side to avoid needing a composite index
        records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        return records;
    } catch (error) {
        console.error("Error fetching all student absences for teacher:", error);
        return [];
    }
};


export const getFilteredStudentAbsenceReport = async ({
    startDate,
    endDate,
    teacherId,
    className,
}: {
    startDate: string;
    endDate: string;
    teacherId?: string;
    className?: string;
}): Promise<StudentAbsenceRecord[]> => {
    const studentAbsencesCol = collection(db, 'studentAbsenceRecords');
    const constraints: any[] = [
        where('date', '>=', startDate),
        where('date', '<=', endDate),
    ];

    if (teacherId) {
        constraints.push(where('teacherId', '==', teacherId));
    }
    if (className) {
        constraints.push(where('class', '==', className));
    }
    
    // Firestore might require a composite index for this query.
    // The error message in the console will guide the user to create one if needed.
    const q = query(studentAbsencesCol, ...constraints, orderBy('date', 'desc'));

    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as StudentAbsenceRecord));
    } catch (error: any) {
        console.error("Error fetching filtered student absence report:", error);
        if (error.code === 'failed-precondition') {
             alert("Query failed. You might need to create a composite index in your Firestore database. Check the developer console (F12) for a link to create it.");
        }
        return [];
    }
};

/**
 * Checks if a schedule slot is already taken.
 * @param day The day of the week (e.g., 'Senin').
 * @param period The lesson period number.
 * @param className The name of the class (e.g., 'VII A').
 * @returns The conflicting schedule if one exists, otherwise null.
 */
export const checkScheduleConflict = async (day: string, period: number, className: string): Promise<LessonSchedule | null> => {
    try {
        const schedulesCol = collection(db, 'lessonSchedules');
        const q = query(
            schedulesCol,
            where('day', '==', day),
            where('period', '==', period),
            where('class', '==', className)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            // Conflict found, return the first conflicting document's data
            const doc = querySnapshot.docs[0];
            return { id: doc.id, ...doc.data() } as LessonSchedule;
        }
        return null; // No conflict
    } catch (error: any) {
        console.error("Error checking for schedule conflict:", error);
        // Let the UI handle this as a generic failure
        throw new Error("Gagal memeriksa jadwal bentrok. Periksa koneksi Anda.");
    }
};