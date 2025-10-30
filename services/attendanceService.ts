import { AttendanceRecord, LessonSchedule, User, MasterSchedule } from '../types';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, limit, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { STAFF_QR_CODE_DATA } from '../constants';

/**
 * Creates a timezone-aware YYYY-MM-DD string from a Date object.
 * This prevents bugs where UTC date differs from the local date.
 * @param date The date to convert.
 * @returns A string in YYYY-MM-DD format based on the local timezone.
 */
const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};


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
    const today = getLocalDateString(new Date());
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
        const today = getLocalDateString(new Date());

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
  qrCodeData: string, 
  scheduleInfo: Pick<MasterSchedule, 'id' | 'subject' | 'class' | 'period'>
): Promise<{ success: boolean; message: string }> => {
  const now = new Date();
  const todayDateString = getLocalDateString(now);


  // Use the top-level 'absenceRecords' collection
  const attendanceCol = collection(db, 'absenceRecords');

  // Check if user has already checked in for this specific lesson today
  if (scheduleInfo) {
    const qCheck = query(
      attendanceCol,
      where('teacherId', '==', user.id),
      where('scheduleId', '==', scheduleInfo.id),
      where('date', '==', todayDateString)
    );
    const checkSnapshot = await getDocs(qCheck);
    if (!checkSnapshot.empty) {
      return { success: false, message: `Anda sudah absen untuk pelajaran ${scheduleInfo.subject} hari ini.` };
    }
  } else {
    // This fallback is unlikely with the new flow, but kept for safety.
     const q = query(
      attendanceCol,
      where('teacherId', '==', user.id),
      where('date', '==', todayDateString),
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
      scheduleId: scheduleInfo?.id,
      subject: scheduleInfo?.subject,
      class: scheduleInfo?.class,
      period: scheduleInfo?.period,
    };
    await addDoc(attendanceCol, newRecord);
    const successMessage = `Absensi untuk ${scheduleInfo.subject} kelas ${scheduleInfo.class} berhasil.`;
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
  const todayDateString = getLocalDateString(now);
  const attendanceCol = collection(db, 'absenceRecords');

  const q = query(
    attendanceCol,
    where('teacherId', '==', user.id),
    where('date', '==', todayDateString)
  );
  
  try {
    const querySnapshot = await getDocs(q);
    const todaysRecords = querySnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() as Omit<AttendanceRecord, 'id'> }));

    const clockedInRecord = todaysRecords.find(r => r.status === 'Datang');
    const clockedOutRecord = todaysRecords.find(r => r.status === 'Pulang');
    const otherStatusRecord = todaysRecords.find(r => r.status !== 'Datang' && r.status !== 'Pulang');

    if (clockedOutRecord) {
      return { success: false, message: 'Anda sudah melakukan absen pulang hari ini.' };
    }

    if (otherStatusRecord) {
      return { success: false, message: `Anda sudah tercatat '${otherStatusRecord.status}' hari ini dan tidak bisa absen via QR.` };
    }

    if (clockedInRecord) {
      // REFACTORED: Use a direct update, which is cleaner and more idiomatic.
      // This requires adding an 'update' rule to your Firestore Security Rules.
      const recordToUpdateRef = doc(db, 'absenceRecords', clockedInRecord.id);
      await updateDoc(recordToUpdateRef, {
        status: 'Pulang',
        checkOutTimestamp: Timestamp.fromDate(now)
      });
      return { success: true, message: 'Absen pulang berhasil direkam.' };
    } 
    
    await addDoc(attendanceCol, {
      teacherId: user.id,
      userName: user.name,
      timestamp: Timestamp.fromDate(now),
      date: todayDateString,
      status: 'Datang',
      checkOutTimestamp: null,
      reason: '',
      scheduleId: null,
      subject: null,
      class: null,
      period: null,
    });
    return { success: true, message: 'Absen datang berhasil direkam.' };

  } catch (error) {
    console.error("Error recording staff attendance with QR:", error);
    const errorMessage = error instanceof Error ? error.message : 'Penyebab tidak diketahui.';
    return { success: false, message: `Gagal merekam absensi. Periksa koneksi Anda atau hubungi admin. Detail: ${errorMessage}` };
  }
};


export const getAttendanceReport = async (date: Date): Promise<AttendanceRecord[]> => {
    const dateString = getLocalDateString(date);
    const attendanceCol = collection(db, 'absenceRecords');
    const q = query(
      attendanceCol,
      where('date', '==', dateString),
      orderBy('timestamp', 'desc')
    );
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
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
    // Using date strings for range queries is more robust against timezone issues
    const startString = getLocalDateString(startDate);
    const endString = getLocalDateString(endDate);

    const constraints = [
        where('date', '>=', startString),
        where('date', '<=', endString),
    ];

    if (teacherId) {
        constraints.push(where('teacherId', '==', teacherId));
    }

    const q = query(attendanceCol, ...constraints, orderBy('date', 'desc'));

    try {
        const querySnapshot = await getDocs(q);
        const records = querySnapshot.docs.map(docSnapshot => {
            const data = docSnapshot.data();
            return {
                id: docSnapshot.id,
                ...data,
                timestamp: (data.timestamp as Timestamp).toDate(),
                checkOutTimestamp: data.checkOutTimestamp ? (data.checkOutTimestamp as Timestamp).toDate() : undefined,
            } as AttendanceRecord;
        });
        // Client-side sort by actual timestamp since Firestore can only order by one field in a range query
        records.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        return records;
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
    return querySnapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
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
  const todayDateString = getLocalDateString(now);


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
    let records = querySnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
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