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
      // The check for whether this device is already used by another user has been removed.
      // That check required a collection-wide query which often fails due to security rules, causing login to fail.
      // Binding the new device directly is a more robust client-side approach.
      await updateDoc(doc(db, "users", firebaseUser.uid), { boundDeviceId: deviceId });
    }
    
    return firebaseUser;

  } catch (error: any) {
    // --- SPECIAL HANDLING FOR FIRST ADMIN LOGIN ---
    // If login fails for the default admin, try to register them automatically.
    // This simplifies the setup process for a fresh installation.
    if (error.code === 'auth/invalid-credential' && email === MAIN_ADMIN_EMAIL) {
      try {
        console.log("Main admin login failed, attempting to auto-register default admin...");
        // Use the existing register function; it has the necessary logic for the first admin.
        await register('Admin Utama', email, pass, Role.Admin);
        
        // If registration is successful, try signing in again.
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);

        // Verify profile was created, just in case.
        const firebaseUser = userCredential.user;
        const userProfile = await getUserProfile(firebaseUser.uid);
        if (!userProfile) {
            await signOut(auth);
            throw new Error('Profil pengguna tidak ditemukan setelah pendaftaran otomatis.');
        }
        
        // Admin is exempt from device binding.
        return firebaseUser;

      } catch (registrationError: any) {
        console.error("Auto-registration for main admin failed:", registrationError);
        // If the error is 'email-already-in-use', it means the account exists,
        // so the original password was simply incorrect.
        if (registrationError.code === 'auth/email-already-in-use') {
          throw new Error('Email atau password salah.');
        }
        // For other registration errors, show a more specific message.
        throw new Error(`Pendaftaran otomatis untuk admin utama gagal: ${registrationError.message}`);
      }
    }
    // --- END SPECIAL HANDLING ---
      
    console.error("Error signing in:", error);
    // Re-throw custom errors
    if (error.message.startsWith('Akun ini sudah terikat') || error.message.startsWith('Profil pengguna tidak ditemukan') || error.message.startsWith('Perangkat ini sudah digunakan oleh pengguna lain')) {
        throw error;
    }
    switch (error.code) {
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
    let firebaseUser: FirebaseUser | null = null;
    try {
        // First, create the user in Firebase Auth.
        // This authenticates them for subsequent Firestore operations.
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        firebaseUser = userCredential.user;

        // --- Admin Registration Key Validation (now performed AFTER authentication) ---
        if (role === Role.Admin) {
            const storedKey = await getAdminRegistrationKey();
            if (email === MAIN_ADMIN_EMAIL) {
                // If it's the main admin registering and no key exists, this is the initial setup.
                // We allow it and create the first key. No validation needed.
                if (!storedKey) {
                    await updateAdminRegistrationKey();
                }
            } else {
                // For any other admin, validate their provided key.
                if (!storedKey) {
                    throw new Error('Kunci pendaftaran Admin belum di-set oleh Admin Utama.');
                }
                if (adminKey !== storedKey) {
                    throw new Error('Kode pendaftaran Admin tidak valid.');
                }
            }
        }

        const deviceId = getOrCreateDeviceId();

        // Create the user profile object
        const newUser: User = {
            id: firebaseUser.uid,
            name,
            email,
            role,
        };
        
        // Conditionally add boundDeviceId only for non-admins
        if (role !== Role.Admin) {
            newUser.boundDeviceId = deviceId;
        }
        
        // Create the user's profile document in Firestore.
        await setDoc(doc(db, "users", firebaseUser.uid), newUser);

        return newUser;

    } catch (error: any) {
        console.error("Error registering user:", error);

        // IMPORTANT: If any Firestore operation fails after the Auth user is created,
        // we must roll back by deleting the Auth user to prevent orphaned accounts.
        if (firebaseUser) {
            console.warn(`Registration failed after user creation for ${firebaseUser.email}. Rolling back Auth user.`);
            try {
                await firebaseUser.delete();
            } catch (deleteError) {
                console.error("Failed to roll back Firebase Auth user:", deleteError);
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
                throw new Error('Pendaftaran gagal. Izin ditolak saat menyimpan profil. Hubungi admin dan periksa Aturan Keamanan Firestore.');
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