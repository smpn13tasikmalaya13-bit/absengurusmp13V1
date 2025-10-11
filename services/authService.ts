import { User, Role } from '../types';
import { auth, db } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { MAIN_ADMIN_EMAIL } from '../constants';

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

/**
 * Retrieves the admin registration key from the Firestore 'config' collection.
 * @returns {Promise<string | null>} The registration key, or null if not set.
 */
export const getAdminRegistrationKey = async (): Promise<string | null> => {
    try {
        const configDocRef = doc(db, 'config', 'admin');
        const docSnap = await getDoc(configDocRef);
        if (docSnap.exists() && docSnap.data().registrationKey) {
            return docSnap.data().registrationKey;
        }
        return null;
    } catch (error) {
        console.error("Error fetching admin registration key:", error);
        throw new Error("Gagal mengambil kunci pendaftaran admin.");
    }
};

/**
 * Generates and saves a new random admin registration key to Firestore.
 * @returns {Promise<string>} The newly generated key.
 */
export const updateAdminRegistrationKey = async (): Promise<string> => {
    try {
        const newKey = `RAHASIA-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
        const configDocRef = doc(db, 'config', 'admin');
        await setDoc(configDocRef, { registrationKey: newKey }, { merge: true });
        return newKey;
    } catch (error) {
        console.error("Error updating admin registration key:", error);
        throw new Error("Gagal memperbarui kunci pendaftaran admin.");
    }
};


// Login user with Firebase Auth AND verify device binding
export const login = async (email: string, pass: string): Promise<FirebaseUser> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const firebaseUser = userCredential.user;

    const userProfile = await getUserProfile(firebaseUser.uid);
    if (!userProfile) {
        await signOut(auth);
        throw new Error('Profil pengguna tidak ditemukan. Hubungi admin untuk bantuan.');
    }

    // Admins are exempt from device binding
    if (userProfile.role === Role.Admin) {
        return firebaseUser;
    }

    const deviceId = getOrCreateDeviceId();

    if (userProfile.boundDeviceId) {
      // This user's account is already bound to a device.
      // Check if they are using their correct, bound device.
      if (userProfile.boundDeviceId !== deviceId) {
        await signOut(auth);
        throw new Error('Akun ini sudah terikat pada perangkat lain. Silakan hubungi Admin untuk melakukan reset perangkat.');
      }
    } else {
      // This is a first-time login for this user, or their binding was reset.
      // Before binding, check if this device is already in use by ANOTHER user.
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('boundDeviceId', '==', deviceId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // This device ID is already registered in the database.
        // We must ensure it's not registered to a *different* user.
        const isUsedByAnotherUser = querySnapshot.docs.some(doc => doc.id !== firebaseUser.uid);
        
        if (isUsedByAnotherUser) {
            await signOut(auth);
            throw new Error('Perangkat ini sudah digunakan oleh pengguna lain. Satu perangkat hanya untuk satu guru.');
        }
      }
      
      // If we reach here, the device is not bound to another user.
      // Bind this new device to the current user.
      await updateDoc(doc(db, "users", firebaseUser.uid), { boundDeviceId: deviceId });
    }
    
    return firebaseUser;

  } catch (error: any) {
    console.error("Error signing in:", error);
    // Re-throw custom errors
    if (error.message.startsWith('Akun ini sudah terikat') || error.message.startsWith('Profil pengguna tidak ditemukan') || error.message.startsWith('Perangkat ini sudah digunakan oleh pengguna lain')) {
        throw error;
    }
    switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            if (email === MAIN_ADMIN_EMAIL) {
                // On a fresh install, the default admin account won't exist.
                // Provide a more helpful error message to guide the user to register.
                throw new Error('Akun admin default tidak ditemukan. Silakan gunakan menu \'Daftar\' untuk mendaftarkan akun Admin pertama.');
            }
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
    let firebaseUser: FirebaseUser | null = null;
    try {
        // --- Admin Registration Key Validation ---
        if (role === Role.Admin) {
            const storedKey = await getAdminRegistrationKey();
            if (email === MAIN_ADMIN_EMAIL) {
                // If it's the first time the main admin is registering, allow it
                // and set their key as the first key.
                if (!storedKey) {
                    await updateAdminRegistrationKey();
                }
            } else {
                if (!storedKey) {
                    throw new Error('Kunci pendaftaran Admin belum di-set oleh Admin Utama.');
                }
                if (adminKey !== storedKey) {
                    throw new Error('Kode pendaftaran Admin tidak valid.');
                }
            }
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        firebaseUser = userCredential.user;

        const deviceId = getOrCreateDeviceId();

        // Create the base user object
        const newUser: User = {
            id: firebaseUser.uid,
            name,
            email,
            role,
        };
        
        // Conditionally add boundDeviceId only for non-admins to avoid 'undefined'
        if (role !== Role.Admin) {
            newUser.boundDeviceId = deviceId;
        }
        
        // This is the critical part: create the Firestore document.
        await setDoc(doc(db, "users", firebaseUser.uid), newUser);

        return newUser;

    } catch (error: any) {
        console.error("Error registering user:", error);

        // If Firestore profile creation fails after Auth user is created, roll back.
        if (firebaseUser) {
            console.warn(`Registration failed after user creation for ${firebaseUser.email}. Rolling back Auth user.`);
            try {
                await firebaseUser.delete();
            } catch (deleteError) {
                console.error("Failed to roll back Firebase Auth user:", deleteError);
                // The user might be stuck in a bad state, but at least we've logged it.
            }
        }

        // Re-throw specific, user-friendly errors
        if (error.message.startsWith('Kode pendaftaran Admin') || error.message.startsWith('Kunci pendaftaran Admin')) {
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
            case 'permission-denied': // Firestore specific error
                throw new Error('Pendaftaran gagal. Izin ditolak saat menyimpan profil. Hubungi admin.');
            default:
                // This will now catch Firestore errors and provide a more relevant generic message.
                throw new Error('Pendaftaran gagal. Gagal menyimpan profil pengguna.');
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
    // Note: This function only deletes the Firestore profile, not the Auth user.
    // Deleting the Auth user requires re-authentication and is a complex, sensitive operation.
    // The current flow makes the account unusable without a profile, which is sufficient.
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
        // Using `updateDoc` with `null` effectively removes the field or sets it to null
        await updateDoc(userDocRef, { boundDeviceId: null });
    } catch (error) {
        console.error("Error resetting device binding:", error);
        throw new Error("Failed to reset device binding. Please try again.");
    }
};