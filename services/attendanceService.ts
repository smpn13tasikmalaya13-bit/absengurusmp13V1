import { AttendanceRecord, User } from '../types';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy, limit, collectionGroup } from 'firebase/firestore';


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
  qrCodeData: string
): Promise<{ success: boolean; message: string }> => {
  if (qrCodeData !== currentQrCodeData) {
    return { success: false, message: 'Invalid or expired QR Code.' };
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  // Path to the user's specific attendance subcollection: absenceRecords/{userId}/absenceRecords
  const userAttendanceCol = collection(db, 'absenceRecords', user.id, 'absenceRecords');

  // Check if user has already checked in today within their subcollection
  const q = query(
    userAttendanceCol,
    where('timestamp', '>=', startOfDay),
    where('timestamp', '<', endOfDay)
  );
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return { success: false, message: 'You have already checked in today.' };
  }

  const status = now.getHours() < CHECK_IN_DEADLINE_HOUR ? 'Present' : 'Late';

  try {
    const newRecord = {
      teacherId: user.id,
      userName: user.name,
      timestamp: Timestamp.fromDate(now),
      date: now.toISOString().split('T')[0],
      status,
      reason: '', // Reason is empty for QR code check-in
    };
    await addDoc(userAttendanceCol, newRecord);
    return { success: true, message: `Attendance recorded successfully as ${status}.` };
  } catch (error) {
    console.error("Error recording attendance: ", error);
    return { success: false, message: 'Failed to record attendance.' };
  }
};

export const getAttendanceReport = async (date: Date): Promise<AttendanceRecord[]> => {
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  
  // Use a collection group query to get records from all "absenceRecords" subcollections.
  // This requires a Firestore index. Firebase will provide a link to create it on first run.
  const attendanceCollectionGroup = collectionGroup(db, 'absenceRecords');
  const q = query(
    attendanceCollectionGroup,
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
};

export const getFullReport = async (recordLimit?: number): Promise<AttendanceRecord[]> => {
    // Use a collection group query to get records from all "absenceRecords" subcollections.
    const attendanceCollectionGroup = collectionGroup(db, 'absenceRecords');
    const q = recordLimit 
      ? query(attendanceCollectionGroup, orderBy('timestamp', 'desc'), limit(recordLimit))
      : query(attendanceCollectionGroup, orderBy('timestamp', 'desc'));

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: (data.timestamp as Timestamp).toDate(),
      } as AttendanceRecord;
    });
};