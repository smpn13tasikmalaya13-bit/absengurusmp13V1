import { AttendanceRecord, LessonSchedule, User } from '../types';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, limit, updateDoc, doc } from 'firebase/firestore';
import { STAFF_QR_CODE_DATA } from '../constants';

// FIX: Implement missing QR code generation and retrieval functions.
// Key for storing the daily QR code data in localStorage
const QR_CODE_STORAGE_KEY = 'dailyQrCodeData';

interface DailyQrCode {
  date: string; // YYYY-MM-DD
  data: string;
}

/**
 * Generates a new QR code data string for the current day and stores it.
 * This should be called by an admin. The data is a simple timestamped UUID.
 * @returns The generated QR code data string.
 */
export const generateQrCodeData = (): string => {
    const today = new Date().toISOString().split('T')[0];
    const newQrData = `HADIRKU-${today}-${crypto.randomUUID()}`;
    const dataToStore: DailyQrCode = { date: today, data: newQrData };
    localStorage.setItem(QR_CODE_STORAGE_KEY, JSON.stringify(dataToStore));
    return newQrData;
};

/**
 * Retrieves the QR code data for the current day from localStorage.
 * @returns The QR code data string if it exists and is for today, otherwise null.
 */
export const getCurrentQrCodeData = (): string | null => {
    const storedData = localStorage.getItem(QR_CODE_STORAGE_KEY);
    if (!storedData) {
        return null;
    }

    try {
        const qrCodeObject: DailyQrCode = JSON.parse(storedData);
        const today = new Date().toISOString().split('T')[0];

        if (qrCodeObject.date === today) {
            return qrCodeObject.data;
        } else {
            // Data is from a previous day, so it's invalid.
            localStorage.removeItem(QR_CODE_STORAGE_KEY);
            return null;
        }
    } catch (error) {
        console.error("Error parsing QR code data from localStorage", error);
        localStorage.removeItem(QR_CODE_STORAGE_KEY);
        return null;
    }
};


const CHECK_IN_DEADLINE_HOUR = 8; // 8 AM

export const recordAttendance = async (
  user: User,
  qrCodeData: string, // This is now just a trigger, not a secret to be validated here.
  scheduleInfo?: Pick<LessonSchedule, 'id' | 'subject' | 'class' | 'period'>
): Promise<{ success: boolean; message: string }> => {
  // The check for a daily, matching QR code has been removed as requested.
  // Any valid QR scan (that's not an empty string) from a teacher within the location radius is now considered a valid trigger.

  const now = new Date();
  // Use a simple YYYY-MM-DD string for date checks, which is more efficient in Firestore
  const todayDateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;


  // Use the top-level 'absenceRecords' collection
  const attendanceCol = collection(db, 'absenceRecords');

  // Check if user has already checked in for this specific lesson today
  if (scheduleInfo) {
    const qCheck = query(
      attendanceCol,
      where('teacherId', '==', user.id),
      where('scheduleId', '==', scheduleInfo.id),
      // Use the string date for a more efficient query that doesn't require a composite index
      where('date', '==', todayDateString)
    );
    const checkSnapshot = await getDocs(qCheck);
    if (!checkSnapshot.empty) {
      return { success: false, message: `Anda sudah absen untuk pelajaran ${scheduleInfo.subject} hari ini.` };
    }
  } else {
    // Fallback for general check-in if scheduleInfo is not provided
     const q = query(
      attendanceCol,
      where('teacherId', '==', user.id),
      where('date', '==', todayDateString),
       // We can only check for general check-in if there is no scheduleId
      where('scheduleId', '==', null) 
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return { success: false, message: 'You have already checked in today.' };
    }
  }


  const status = now.getHours() < CHECK_IN_DEADLINE_HOUR ? 'Present' : 'Late';

  try {
    const newRecord: Partial<AttendanceRecord> = {
      teacherId: user.id,
      userName: user.name,
      timestamp: Timestamp.fromDate(now),
      date: todayDateString,
      status,
      reason: '', // Reason is empty for QR code check-in
      scheduleId: scheduleInfo?.id || null,
      subject: scheduleInfo?.subject || null,
      class: scheduleInfo?.class || null,
      period: scheduleInfo?.period || null,
    };
    await addDoc(attendanceCol, newRecord);
    const successMessage = scheduleInfo 
      ? `Absensi untuk ${scheduleInfo.subject} kelas ${scheduleInfo.class} berhasil.`
      : `Attendance recorded successfully as ${status}.`;
    return { success: true, message: successMessage };
  } catch (error) {
    console.error("Error recording attendance: ", error);
    return { success: false, message: 'Failed to record attendance.' };
  }
};

export const recordStaffAttendanceWithQR = async (
  user: User,
  qrCodeData: string
): Promise<{ success: boolean; message: string }> => {
  if (qrCodeData !== STAFF_QR_CODE_DATA) {
    return { success: false, message: 'QR Code tidak valid untuk absensi tendik.' };
  }
  
  const now = new Date();
  const todayDateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const attendanceCol = collection(db, 'absenceRecords');

  // Query for ALL of today's attendance records for this staff member
  // Using the date string is often more efficient and less likely to require a composite index
  const q = query(
    attendanceCol,
    where('teacherId', '==', user.id),
    where('date', '==', todayDateString)
  );
  
  try {
    const querySnapshot = await getDocs(q);
    const todaysRecords = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() as Omit<AttendanceRecord, 'id'> }));

    // Check existing records to determine action
    const clockedInRecord = todaysRecords.find(r => r.status === 'Datang');
    const clockedOutRecord = todaysRecords.find(r => r.status === 'Pulang');
    const otherStatusRecord = todaysRecords.find(r => r.status !== 'Datang' && r.status !== 'Pulang');

    if (clockedOutRecord) {
      // Already clocked out, nothing to do.
      return { success: false, message: 'Anda sudah melakukan absen pulang hari ini.' };
    }

    if (otherStatusRecord) {
      // Has another status like 'Sakit' or 'Izin', cannot use QR code.
      return { success: false, message: `Anda sudah tercatat '${otherStatusRecord.status}' hari ini dan tidak bisa absen via QR.` };
    }

    if (clockedInRecord) {
      // Has a 'Datang' record but no 'Pulang' record, so CLOCK OUT.
      const recordRef = doc(db, 'absenceRecords', clockedInRecord.id);
      await updateDoc(recordRef, {
        status: 'Pulang',
        checkOutTimestamp: Timestamp.fromDate(now),
      });
      return { success: true, message: 'Absen pulang berhasil direkam.' };
    } 
    
    // No relevant records found for today, so CLOCK IN.
    await addDoc(attendanceCol, {
      teacherId: user.id,
      userName: user.name,
      timestamp: Timestamp.fromDate(now),
      date: todayDateString,
      status: 'Datang',
      checkOutTimestamp: null, // Explicitly set to null for consistency
      reason: '',
      scheduleId: null,
      subject: null,
      class: null,
      period: null,
    });
    return { success: true, message: 'Absen datang berhasil direkam.' };

  } catch (error) {
    console.error("Error recording staff attendance with QR:", error);
    // Make the error message more user-friendly
    return { success: false, message: 'Gagal merekam absensi. Periksa koneksi internet Anda atau hubungi admin.' };
  }
};


export const getAttendanceReport = async (date: Date): Promise<AttendanceRecord[]> => {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    const attendanceCol = collection(db, 'absenceRecords');
    const q = query(
      attendanceCol,
      where('timestamp', '>=', startOfDay),
      where('timestamp', '<', endOfDay),
      orderBy('timestamp', 'desc')
    );
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: (data.timestamp as Timestamp).toDate(),
        checkOutTimestamp: data.checkOutTimestamp ? (data.checkOutTimestamp as Timestamp).toDate() : undefined,
      } as AttendanceRecord;
    });
  } catch (error: any) {
    console.error("Error fetching attendance report for date:", error);
    if (error.code === 'permission-denied') {
        throw new Error("Gagal mengambil laporan: Izin ditolak.");
    }
    throw new Error("Gagal mengambil laporan absensi. Coba lagi.");
  }
};

// New function to get reports based on filters
export const getFilteredAttendanceReport = async ({
    startDate,
    endDate,
    teacherId,
}: {
    startDate: Date;
    endDate: Date;
    teacherId?: string;
}): Promise<AttendanceRecord[]> => {
    const attendanceCol = collection(db, 'absenceRecords');
    const constraints = [
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
    ];

    if (teacherId) {
        constraints.push(where('teacherId', '==', teacherId));
    }

    const q = query(attendanceCol, ...constraints, orderBy('timestamp', 'desc'));

    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                timestamp: (data.timestamp as Timestamp).toDate(),
                checkOutTimestamp: data.checkOutTimestamp ? (data.checkOutTimestamp as Timestamp).toDate() : undefined,
            } as AttendanceRecord;
        });
    } catch (error: any) {
        console.error("Error fetching filtered attendance report:", error);
        if (error.code === 'permission-denied') {
            throw new Error("Gagal mengambil laporan: Izin ditolak. Periksa aturan keamanan Firestore Anda.");
        }
        if (error.code === 'failed-precondition') {
            throw new Error("Query gagal: Indeks komposit Firestore mungkin diperlukan. Periksa konsol developer (F12) untuk detail.");
        }
        throw new Error("Gagal mengambil laporan absensi. Silakan coba lagi.");
    }
};


export const getFullReport = async (recordLimit?: number): Promise<AttendanceRecord[]> => {
    const attendanceCol = collection(db, 'absenceRecords');
    const q = recordLimit 
      ? query(attendanceCol, orderBy('timestamp', 'desc'), limit(recordLimit))
      : query(attendanceCol, orderBy('timestamp', 'desc'));
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: (data.timestamp as Timestamp).toDate(),
        checkOutTimestamp: data.checkOutTimestamp ? (data.checkOutTimestamp as Timestamp).toDate() : undefined,
      } as AttendanceRecord;
    });
  } catch (error: any) {
    console.error("Error fetching full attendance report:", error);
    if (error.code === 'permission-denied') {
        throw new Error("Gagal mengambil laporan: Izin ditolak.");
    }
    throw new Error("Gagal mengambil laporan absensi lengkap.");
  }
};

export const reportTeacherAbsence = async (
  user: User,
  status: 'Sakit' | 'Izin' | 'Tugas Luar',
  reason?: string
): Promise<{ success: boolean; message: string }> => {
  const now = new Date();
  const todayDateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;


  const attendanceCol = collection(db, 'absenceRecords');

  // Check if user has already an entry for today
  const q = query(
    attendanceCol,
    where('teacherId', '==', user.id),
    where('date', '==', todayDateString)
  );
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return { success: false, message: 'Anda sudah memiliki catatan kehadiran untuk hari ini.' };
  }

  try {
    const newRecord = {
      teacherId: user.id,
      userName: user.name,
      timestamp: Timestamp.fromDate(now),
      date: todayDateString,
      status,
      reason: reason || '',
    };
    await addDoc(attendanceCol, newRecord);
    return { success: true, message: `Ketidakhadiran Anda telah dilaporkan sebagai ${status}.` };
  } catch (error) {
    console.error("Error reporting teacher absence: ", error);
    return { success: false, message: 'Gagal melaporkan ketidakhadiran.' };
  }
};

// Fetch attendance records for a specific teacher
export const getAttendanceForTeacher = async (teacherId: string, recordLimit?: number): Promise<AttendanceRecord[]> => {
  const attendanceCol = collection(db, 'absenceRecords');
  const q = query(attendanceCol, where('teacherId', '==', teacherId));

  try {
    const querySnapshot = await getDocs(q);
    let records = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: (data.timestamp as Timestamp).toDate(),
          checkOutTimestamp: data.checkOutTimestamp ? (data.checkOutTimestamp as Timestamp).toDate() : undefined,
        } as AttendanceRecord;
    });

    // Sort records by timestamp descending (newest first) on the client-side
    records.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit on the client-side
    if (recordLimit) {
      return records.slice(0, recordLimit);
    }

    return records;
  } catch (error: any) {
        console.error("Error fetching attendance records for teacher:", error);
        if (error.code === 'permission-denied') {
            throw new Error("Gagal mengambil data absensi: Izin ditolak. Periksa aturan keamanan Firestore Anda.");
        }
        if (error.code === 'failed-precondition') {
            throw new Error("Query gagal: Indeks komposit Firestore mungkin diperlukan. Periksa konsol developer (F12) untuk detail.");
        }
        throw new Error("Gagal mengambil riwayat absensi. Silakan coba lagi.");
    }
};