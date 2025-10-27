import { Class, Eskul, LessonSchedule, EskulSchedule, StudentAbsenceRecord, User, MasterSchedule, Message, Role, Announcement } from '../types';
// FIX: Import `DocumentSnapshot` from firestore to resolve missing type error.
import { collection, getDocs, query, orderBy, addDoc, doc, deleteDoc, updateDoc, where, writeBatch, serverTimestamp, onSnapshot, Timestamp, getDoc, DocumentSnapshot } from 'firebase/firestore';
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

export const updateUserProfile = async (userId: string, data: Partial<User>): Promise<void> => {
    try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, data);
    } catch (error) {
        console.error("Error updating user profile:", error);
        throw new Error("Gagal memperbarui profil pengguna.");
    }
};

export const uploadMasterSchedule = async (schedules: Omit<MasterSchedule, 'id'>[]): Promise<void> => {
    const batch = writeBatch(db);
    const masterSchedulesCol = collection(db, 'masterSchedules');
    const classesCol = collection(db, 'classes');

    try {
        const existingSchedulesSnapshot = await getDocs(query(masterSchedulesCol));
        existingSchedulesSnapshot.forEach(scheduleDoc => {
            batch.delete(scheduleDoc.ref);
        });

        schedules.forEach(scheduleData => {
            const docRef = doc(masterSchedulesCol);
            batch.set(docRef, scheduleData);
        });

        const newClassNames = new Set(schedules.map(s => s.class));
        const existingClassesSnapshot = await getDocs(query(classesCol));
        const existingClasses = existingClassesSnapshot.docs.map(d => ({ id: d.id, ...d.data() as Omit<Class, 'id'> }));
        const existingClassNames = new Set(existingClasses.map(c => c.name));

        newClassNames.forEach(className => {
            if (!existingClassNames.has(className)) {
                const classDocRef = doc(classesCol);
                
                let grade = 0;
                if (className.startsWith('VII')) grade = 7;
                else if (className.startsWith('VIII')) grade = 8;
                else if (className.startsWith('IX')) grade = 9;

                batch.set(classDocRef, { name: className, grade });
            }
        });
        
        existingClasses.forEach(cls => {
            if (!newClassNames.has(cls.name)) {
                const oldClassDocRef = doc(db, 'classes', cls.id);
                batch.delete(oldClassDocRef);
            }
        });

        await batch.commit();

    } catch (error: any) {
        console.error("Error uploading master schedule and syncing classes:", error);
        if (error.code === 'permission-denied') {
            throw new Error("Izin ditolak. Pastikan Admin diizinkan untuk 'write' pada koleksi 'masterSchedules' dan 'classes' di Aturan Keamanan Firestore.");
        }
        throw new Error("Gagal mengunggah jadwal dan menyinkronkan kelas. Operasi dibatalkan.");
    }
};

// ========================================================================
// FIRESTORE DATA FETCHING FUNCTIONS
// ========================================================================

export const getAllMasterSchedules = async (): Promise<MasterSchedule[]> => {
    try {
        const masterSchedulesCol = collection(db, 'masterSchedules');
        const q = query(masterSchedulesCol);
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() } as MasterSchedule));
    } catch (error: any) {
        console.error("Error fetching master schedules:", error);
        if (error.code === 'permission-denied') {
            throw new Error("Gagal mengambil jadwal induk: Izin ditolak. SOLUSI: Buka Firebase Console > Firestore Database > Rules, dan pastikan pengguna yang login (guru/admin) diizinkan untuk 'read' koleksi 'masterSchedules'. Contoh: 'allow read: if request.auth != null;'.");
        }
        throw new Error("Gagal mengambil data jadwal induk dari server.");
    }
};

export const getMasterSchedulesByTeacherCode = async (kode: string): Promise<MasterSchedule[]> => {
    try {
        const schedulesCol = collection(db, 'masterSchedules');
        const q = query(schedulesCol, where('kode', '==', kode));
        const snapshot = await getDocs(q);
        const schedules = snapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() } as MasterSchedule));
        
        const dayOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        schedules.sort((a, b) => {
            const dayComparison = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
            if (dayComparison !== 0) return dayComparison;
            return a.period - b.period;
        });

        return schedules;
    } catch (error) {
        console.error("Error fetching master schedules for teacher:", error);
        throw new Error("Gagal mengambil jadwal dari server.");
    }
};

export const getAllClasses = async (): Promise<Class[]> => {
    try {
        const classesCol = collection(db, 'classes');
        const q = query(classesCol, orderBy('name'));
        const classSnapshot = await getDocs(q);
        return classSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() } as Class));
    } catch (error) {
        console.error("Error fetching classes:", error);
        return [];
    }
};

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

export const getAllEskuls = async (): Promise<Eskul[]> => {
    try {
        const eskulsCol = collection(db, 'eskuls');
        const q = query(eskulsCol, orderBy('name'));
        const eskulSnapshot = await getDocs(q);
        return eskulSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() } as Eskul));
    } catch (error) {
        console.error("Error fetching eskuls:", error);
        return [];
    }
};

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

export const getAllLessonSchedules = async (): Promise<LessonSchedule[]> => {
    try {
        const schedulesCol = collection(db, 'lessonSchedules');
        const q = query(schedulesCol, orderBy('day'), orderBy('time'));
        const scheduleSnapshot = await getDocs(q);
        return scheduleSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() } as LessonSchedule));
    } catch (error: any) {
        console.error("Error fetching lesson schedules:", error);
        if (error.code === 'failed-precondition') {
            alert(`Query to fetch schedules failed. A composite index is required in Firestore. Please open the developer console (F12) for a direct link to create it, or manually create an index on the 'lessonSchedules' collection for fields: day (ascending), time (ascending).\n\n${error.message}`);
        }
        return [];
    }
};

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

export const getAllEskulSchedules = async (): Promise<EskulSchedule[]> => {
    try {
        const schedulesCol = collection(db, 'eskulSchedules');
        const q = query(schedulesCol, orderBy('day'), orderBy('time'));
        const scheduleSnapshot = await getDocs(q);
        return scheduleSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() } as EskulSchedule));
    } catch (error) {
        console.error("Error fetching eskul schedules:", error);
        return [];
    }
};

export const addEskulSchedule = async (schedule: Omit<EskulSchedule, 'id'>): Promise<void> => {
    try {
        const schedulesCol = collection(db, 'eskulSchedules');
        await addDoc(schedulesCol, schedule);
    } catch (error) {
        console.error("Error adding eskul schedule:", error);
        throw new Error("Failed to add new eskul schedule. Please try again.");
    }
};

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
        return scheduleSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() } as LessonSchedule));
    } catch (error: any) {
        console.error("Error fetching schedules by teacher:", error);
        if (error.code === 'failed-precondition') {
            alert(`Query to fetch schedules failed. A composite index is required in Firestore. Please open the developer console (F12) for a direct link to create it, or manually create an index on the 'lessonSchedules' collection for fields: teacherId (ascending), day (ascending), time (ascending).\n\n${error.message}`);
        }
        return [];
    }
};

export const reportStudentAbsence = async (record: Omit<StudentAbsenceRecord, 'id'>): Promise<void> => {
    try {
        const studentAbsencesCol = collection(db, 'studentAbsenceRecords');
        await addDoc(studentAbsencesCol, record);
    } catch (error) {
        console.error("Error reporting student absence:", error);
        throw new Error("Failed to report student absence. Please try again.");
    }
};

export const getStudentAbsencesByTeacherForDate = async (teacherId: string, date: string): Promise<StudentAbsenceRecord[]> => {
    try {
        const studentAbsencesCol = collection(db, 'studentAbsenceRecords');
        const q = query(
            studentAbsencesCol,
            where('teacherId', '==', teacherId),
            where('date', '==', date)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() } as StudentAbsenceRecord));
    } catch (error) {
        console.error("Error fetching student absences:", error);
        return [];
    }
};

export const getStudentAbsencesByTeacher = async (teacherId: string): Promise<StudentAbsenceRecord[]> => {
    try {
        const studentAbsencesCol = collection(db, 'studentAbsenceRecords');
        const q = query(
            studentAbsencesCol,
            where('teacherId', '==', teacherId)
        );
        const snapshot = await getDocs(q);
        const records = snapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() } as StudentAbsenceRecord));
        
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
    
    const q = query(studentAbsencesCol, ...constraints, orderBy('date', 'desc'));

    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(docSnapshot => ({
            id: docSnapshot.id,
            ...docSnapshot.data(),
        } as StudentAbsenceRecord));
    } catch (error: any) {
        console.error("Error fetching filtered student absence report:", error);
        if (error.code === 'failed-precondition') {
             alert("Query failed. You might need to create a composite index in your Firestore database. Check the developer console (F12) for a link to create it.");
        }
        return [];
    }
};

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
            const docSnapshot = querySnapshot.docs[0];
            return { id: docSnapshot.id, ...docSnapshot.data() } as LessonSchedule;
        }
        return null;
    } catch (error: any) {
        console.error("Error checking for schedule conflict:", error);
        throw new Error("Gagal memeriksa jadwal bentrok. Periksa koneksi Anda.");
    }
};

// ========================================================================
// MESSAGING FUNCTIONS
// ========================================================================

export const getAdminUsers = async (): Promise<User[]> => {
    try {
        const usersCol = collection(db, 'users');
        const q = query(usersCol, where('role', '==', Role.Admin));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return [];
        return snapshot.docs.map(userDoc => userDoc.data() as User);
    } catch (error) {
        console.error("Error fetching admin users:", error);
        return [];
    }
};

export const sendMessage = async (senderId: string, senderName: string, recipientId: string, content: string): Promise<void> => {
  try {
    const messagesCol = collection(db, 'messages');
    await addDoc(messagesCol, {
      senderId,
      senderName,
      recipientId,
      content,
      timestamp: serverTimestamp(),
      isRead: false,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    throw new Error("Gagal mengirim pesan.");
  }
};

export const getMessagesForUser = (userId: string, callback: (messages: Message[]) => void): (() => void) => {
  const messagesCol = collection(db, 'messages');
  
  const qSentTo = query(messagesCol, where('recipientId', '==', userId));
  const qSentBy = query(messagesCol, where('senderId', '==', userId));

  let receivedMessages: Message[] = [];
  let sentMessages: Message[] = [];

  const combineAndCallback = () => {
    const allMessages = [...receivedMessages, ...sentMessages];
    allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const uniqueMessages = Array.from(new Map(allMessages.map(item => [item['id'], item])).values());
    callback(uniqueMessages);
  };

  const handleError = (error: Error, type: 'received' | 'sent') => {
      console.error(`Error listening to ${type} messages:`, error);
      if (error.message.includes('permission-denied')) {
          console.error("Firestore permission denied. Check your security rules for the 'messages' collection.");
      }
  };


  const unsubscribeTo = onSnapshot(qSentTo, (snapshot) => {
    receivedMessages = snapshot.docs.map(messageDoc => {
        const data = messageDoc.data();
        return {
            id: messageDoc.id,
            ...data,
            timestamp: (data.timestamp as Timestamp)?.toDate() || new Date(),
        } as Message;
    });
    combineAndCallback();
  }, (error) => handleError(error, 'received'));

  const unsubscribeBy = onSnapshot(qSentBy, (snapshot) => {
    sentMessages = snapshot.docs.map(messageDoc => {
        const data = messageDoc.data();
        return {
            id: messageDoc.id,
            ...data,
            timestamp: (data.timestamp as Timestamp)?.toDate() || new Date(),
        } as Message;
    });
    combineAndCallback();
  }, (error) => handleError(error, 'sent'));

  return () => {
    unsubscribeTo();
    unsubscribeBy();
  };
};

export interface Conversation {
    otherUserId: string;
    otherUserName: string;
    messages: Message[];
    unreadCount: number;
}

export const getAllConversations = (adminId: string, callback: (conversations: Conversation[]) => void): (() => void) => {
    const messagesCol = collection(db, 'messages');
    const q = query(messagesCol, orderBy('timestamp', 'desc'));

    return onSnapshot(q, async (snapshot) => {
        const conversationsMap = new Map<string, Conversation>();
        const userFetchPromises = new Map<string, Promise<DocumentSnapshot<User>>>();

        for (const messageDoc of snapshot.docs) {
            const message = { id: messageDoc.id, ...messageDoc.data(), timestamp: (messageDoc.data().timestamp as Timestamp)?.toDate() || new Date() } as Message;
            const otherUserId = message.senderId === adminId ? message.recipientId : message.senderId;

            if (!conversationsMap.has(otherUserId)) {
                conversationsMap.set(otherUserId, {
                    otherUserId,
                    otherUserName: 'Loading...',
                    messages: [],
                    unreadCount: 0,
                });

                // Fetch user info only once
                if (!userFetchPromises.has(otherUserId)) {
                    const userRef = doc(db, 'users', otherUserId);
                    userFetchPromises.set(otherUserId, getDoc(userRef) as Promise<DocumentSnapshot<User>>);
                }
            }

            const conversation = conversationsMap.get(otherUserId)!;
            conversation.messages.push(message);

            if (!message.isRead && message.recipientId === adminId) {
                conversation.unreadCount += 1;
            }
        }

        const userDocs = await Promise.all(userFetchPromises.values());
        const userMap = new Map(userDocs.map(d => [d.id, d.data()]));

        const conversations: Conversation[] = [];
        conversationsMap.forEach(convo => {
            convo.messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            const userData = userMap.get(convo.otherUserId);
            convo.otherUserName = userData ? userData.name : 'Pengguna Dihapus';
            conversations.push(convo);
        });

        conversations.sort((a, b) => {
            const lastMsgA = a.messages[a.messages.length - 1]?.timestamp.getTime() || 0;
            const lastMsgB = b.messages[b.messages.length - 1]?.timestamp.getTime() || 0;
            return lastMsgB - lastMsgA;
        });

        callback(conversations);

    }, (error) => {
        console.error("Error fetching all conversations:", error);
    });
};

export const markMessagesAsRead = async (messageIds: string[]): Promise<void> => {
  if (messageIds.length === 0) return;
  const batch = writeBatch(db);
  messageIds.forEach(id => {
    const docRef = doc(db, 'messages', id);
    batch.update(docRef, { isRead: true });
  });
  try {
    await batch.commit();
  } catch (error) {
    console.error("Error marking messages as read:", error);
  }
};

export const deleteMessage = async (messageId: string): Promise<void> => {
    try {
        const docRef = doc(db, 'messages', messageId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting message:", error);
        throw new Error("Gagal menghapus pesan.");
    }
};

export const deleteConversation = async (userId1: string, userId2: string): Promise<void> => {
    const batch = writeBatch(db);
    const messagesCol = collection(db, 'messages');

    const q1 = query(messagesCol, where('senderId', '==', userId1), where('recipientId', '==', userId2));
    const q2 = query(messagesCol, where('senderId', '==', userId2), where('recipientId', '==', userId1));
    
    try {
        const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);

        snapshot1.forEach(messageDoc => batch.delete(messageDoc.ref));
        snapshot2.forEach(messageDoc => batch.delete(messageDoc.ref));

        await batch.commit();
    } catch (error) {
        console.error("Error deleting conversation:", error);
        throw new Error("Gagal menghapus percakapan. Mungkin memerlukan indeks komposit di Firestore.");
    }
};


// ========================================================================
// ANNOUNCEMENTS FUNCTIONS
// ========================================================================

/**
 * Adds a new announcement to the collection.
 * @param content The announcement text.
 * @param adminName The name of the admin sending the announcement.
 */
export const addAnnouncement = async (content: string, adminName: string): Promise<void> => {
    if (!content.trim()) {
        throw new Error("Isi pengumuman tidak boleh kosong.");
    }
    try {
        const announcementsCol = collection(db, 'announcements');
        await addDoc(announcementsCol, {
            content,
            sentBy: adminName,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error adding announcement:", error);
        throw new Error("Gagal mengirim pengumuman.");
    }
};

/**
 * Sets up a real-time listener for announcements.
 * @param callback The function to call with the updated announcements array.
 * @returns An unsubscribe function to detach the listener.
 */
export const getAnnouncements = (callback: (announcements: Announcement[]) => void): (() => void) => {
    const announcementsCol = collection(db, 'announcements');
    const q = query(announcementsCol, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const announcements = snapshot.docs.map(docSnapshot => {
            const data = docSnapshot.data();
            return {
                id: docSnapshot.id,
                ...data,
                timestamp: (data.timestamp as Timestamp)?.toDate() || new Date(),
            } as Announcement;
        });
        callback(announcements);
    }, (error) => {
        console.error("Error listening to announcements:", error);
        // You can also inform the UI about the error via the callback if needed
        callback([]); // Return empty array on error
    });

    return unsubscribe;
};