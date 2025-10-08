import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// =================================================================================
// Konfigurasi Firebase Anda telah diimplementasikan.
// =================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyAXuzoo7a-OJyN3VdVwDQTJ7_stOOBIiOI",
  authDomain: "absensi-guru13-v1.firebaseapp.com",
  projectId: "absensi-guru13-v1",
  storageBucket: "absensi-guru13-v1.firebasestorage.app",
  messagingSenderId: "516666933891",
  appId: "1:516666933891:web:e30f4bc18ac1dcce5451b6"
};

// =================================================================================

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };