import { AttendanceRecord, LessonSchedule, User } from '../types';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';


let currentQrCodeData: string | null = null;
const CHECK_IN_DEADLINE_HOUR = 8; // 8 AM

export const generateQrCodeData = (): string => {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const randomStr = Math.random().toString(36).substring(2, 10);
  currentQrCodeData = `HADIRKU-${date}-${randomStr}`;
  return currentQrCodeData;
};

export const getCurrentQrCodeData = (): string | null => {
  return currentQrCodeData;
};

export const recordAttendance = async (
  user: User,
  qrCodeData: string,
  scheduleInfo?: Pick<LessonSchedule, 'id' | 'subject' | 'class' | 'period'>
): Promise<{ success: boolean; message: string }> => {
  if (qrCodeData !== currentQrCodeData) {
    return { success: false, message: 'Invalid or expired QR Code.' };
  }

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
