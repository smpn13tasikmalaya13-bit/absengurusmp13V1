import { User, Role } from '../types';
import { auth, db } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { ADMIN_REGISTRATION_KEY } from '../constants';

// ================== Device ID Helpers ==================

/**
 * Gets the device ID from localStorage or creates a new one.
 * This provides a persistent, unique identifier for the browser instance.
 * @returns {string} The unique device ID.
 */
const getOrCreateDeviceId = (): string => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
};


// ================== Auth Service ==================

// Login user with Firebase Auth AND verify device binding
export const login = async (email: string, pass: string): Promise<FirebaseUser> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const firebaseUser = userCredential.user;

    // --- Device Binding Verification ---
    const userProfile = await getUserProfile(firebaseUser.uid);
    if (!userProfile) {
        // This case is unlikely if login succeeds, but good for safety.
        await signOut(auth);
        throw new Error('Profil pengguna tidak ditemukan.');
    }

    // Admins are exempt from device binding
    if (userProfile.role === Role.Admin) {
        return firebaseUser;
    }

    const deviceId = getOrCreateDeviceId();

    if (userProfile.boundDeviceId) {
      // Device is already bound, check if it matches
      if (userProfile.boundDeviceId !== deviceId) {
        await signOut(auth); // Immediately log out user
        throw new Error('Akun ini sudah terikat pada perangkat lain. Silakan hubungi Admin untuk melakukan reset perangkat.');
      }
    } else {
      // First login or post-reset: Bind this new device
      await updateDoc(doc(db, "users", firebaseUser.uid), { boundDeviceId: deviceId });
    }
    
    return firebaseUser;

  } catch (error: any) {
    console.error("Error signing in:", error);
    if (error.message.startsWith('Akun ini sudah terikat')) {
        throw error;
    }
    switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            throw new Error('Email atau password salah.');
        case 'auth/invalid-email':
            throw new Error('Format email tidak valid.');
        case 'auth/user-disabled':
            throw new Error('Akun ini telah dinonaktifkan.');
        default:
            throw new Error('Terjadi kesalahan tak terduga saat login.');
    }
  }
};

// Logout user
export const logout = async (): Promise<void> => {
  await signOut(auth);
};

// Register user with Firebase Auth and create a user profile in Firestore
export const register = async (name: string, email: string, pass: string, role: Role, adminKey?: string): Promise<User | null> => {
    try {
        // --- Admin Registration Key Validation ---
        if (role === Role.Admin) {
            if (adminKey !== ADMIN_REGISTRATION_KEY) {
                throw new Error('Kode pendaftaran Admin tidak valid.');
            }
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const firebaseUser = userCredential.user;

        const deviceId = getOrCreateDeviceId();

        const newUser: User = {
            id: firebaseUser.uid,
            name,
            email,
            role,
            // Bind device immediately on registration for non-admins
            boundDeviceId: role !== Role.Admin ? deviceId : undefined,
        };
        
        await setDoc(doc(db, "users", firebaseUser.uid), newUser);

        return newUser;

    } catch (error: any) {
        console.error("Error registering user:", error);
         if (error.message.startsWith('Kode pendaftaran Admin')) {
            throw error;
        }
        switch (error.code) {
            case 'auth/email-already-in-use':
                throw new Error('Email ini sudah terdaftar. Silakan gunakan email lain.');
            case 'auth/weak-password':
                throw new Error('Password terlalu lemah. Gunakan minimal 6 karakter.');
            case 'auth/invalid-email':
                throw new Error('Format email tidak valid.');
            case 'auth/operation-not-allowed':
                 throw new Error('Pendaftaran dengan email/password belum diaktifkan oleh admin.');
            case 'permission-denied':
                throw new Error('Pendaftaran gagal karena masalah izin database. Hubungi admin.');
            default:
                throw new Error('Terjadi kesalahan tak terduga saat pendaftaran.');
        }
    }
};

// Get a user's profile from Firestore
export const getUserProfile = async (uid: string): Promise<User | null> => {
    try {
        const userDocRef = doc(db, 'users', uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            return userDocSnap.data() as User;
        } else {
            console.log("No such user profile!");
            return null;
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
};

// Get all users (for admin panel)
export const getAllUsers = async (): Promise<User[]> => {
    try {
        const usersCol = collection(db, 'users');
        const userSnapshot = await getDocs(usersCol);
        const userList = userSnapshot.docs.map(doc => doc.data() as User);
        return userList;
    } catch (error) {
        console.error("Error fetching all users:", error);
        return [];
    }
}

// Delete a user's profile from Firestore
export const deleteUser = async (uid: string): Promise<void> => {
    if (!uid) {
        throw new Error("User ID is required to delete.");
    }
    try {
        const userDocRef = doc(db, 'users', uid);
        await deleteDoc(userDocRef);
    } catch (error) {
        console.error("Error deleting user profile:", error);
        throw new Error("Failed to delete the user profile. Please try again.");
    }
};

/**
 * Resets the device binding for a user by setting their boundDeviceId to null.
 * @param {string} uid The user's ID (UID).
 */
export const resetDeviceBinding = async (uid: string): Promise<void> => {
    if (!uid) {
        throw new Error("User ID is required for device reset.");
    }
    try {
        const userDocRef = doc(db, 'users', uid);
        await updateDoc(userDocRef, { boundDeviceId: null });
    } catch (error) {
        console.error("Error resetting device binding:", error);
        throw new Error("Failed to reset device binding. Please try again.");
    }
};