
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, serverTimestamp, increment, type Timestamp, type FieldValue } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBj6Z1SRCU5U_t45ya0aMHZsaUA0IdXz5s",
  authDomain: "swipes-2cdaa.firebaseapp.com",
  projectId: "swipes-2cdaa",
  storageBucket: "swipes-2cdaa.firebasestorage.app",
  messagingSenderId: "1004267611079",
  appId: "1:1004267611079:web:427887b3396fe75d606fe2",
  measurementId: "G-07EYXT19T6"
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);
const db = getFirestore(app); // Initialize Firestore

export { app, auth, db, serverTimestamp, increment };
export type { Timestamp, FieldValue };
