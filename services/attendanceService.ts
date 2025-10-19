import { AttendanceRecord, LessonSchedule, User } from '../types';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, limit, updateDoc, doc } from 'firebase/firestore';

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
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  // Use the top-level 'absenceRecords' collection
  const attendanceCol = collection(db, 'absenceRecords');

  // Check if user has already checked in for this specific lesson today
  if (scheduleInfo) {
    const qCheck = query(
      attendanceCol,
      where('teacherId', '==', user.id),
      where('scheduleId', '==', scheduleInfo.id),
      where('timestamp', '>=', startOfDay),
      where('timestamp', '<', endOfDay)
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
      where('timestamp', '>=', startOfDay),
      where('timestamp', '<', endOfDay),
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
      date: now.toISOString().split('T')[0],
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
  if (!qrCodeData) {
    return { success: false, message: 'Data QR Code tidak valid.' };
  }
  
  const now = new Date();
  const todayDateString = now.toISOString().split('T')[0];
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
  try {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    
    // Query the top-level 'absenceRecords' collection directly
    const attendanceCol = collection(db, 'absenceRecords');
    const q = query(
      attendanceCol,
      where('timestamp', '>=', startOfDay),
      where('timestamp', '<', endOfDay),
      orderBy('timestamp', 'desc')
    );

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
  } catch (error) {
    console.error("Error fetching attendance report for date:", error);
    return [];
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
    } catch (error) {
        console.error("Error fetching filtered attendance report:", error);
        return [];
    }
};


export const getFullReport = async (recordLimit?: number): Promise<AttendanceRecord[]> => {
  try {
    const attendanceCol = collection(db, 'absenceRecords');
    const q = recordLimit 
      ? query(attendanceCol, orderBy('timestamp', 'desc'), limit(recordLimit))
      : query(attendanceCol, orderBy('timestamp', 'desc'));

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
  } catch (error) {
    console.error("Error fetching full attendance report:", error);
    return [];
  }
};

export const reportTeacherAbsence = async (
  user: User,
  status: 'Sakit' | 'Izin' | 'Tugas Luar',
  reason?: string
): Promise<{ success: boolean; message: string }> => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const attendanceCol = collection(db, 'absenceRecords');

  // Check if user has already an entry for today
  const q = query(
    attendanceCol,
    where('teacherId', '==', user.id),
    where('timestamp', '>=', startOfDay),
    where('timestamp', '<', endOfDay)
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
      date: now.toISOString().split('T')[0],
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
    // Base constraints
    const constraints = [
        where('teacherId', '==', teacherId),
        orderBy('timestamp', 'desc')
    ];

    // Add limit if provided
    if (recordLimit) {
        constraints.push(limit(recordLimit));
    }
    
    // Construct the query
    const q = query(attendanceCol, ...constraints);

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
    } catch (error) {
        console.error("Error fetching attendance records for teacher:", error);
        if ((error as any).code === 'failed-precondition') {
            alert("Query to fetch attendance history failed. A composite index might be required in Firestore. Please check the developer console (F12) for a link to create it.");
        }
        return [];
    }
};