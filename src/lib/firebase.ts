// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
// import { getFirestore } from 'firebase/firestore'; // Uncomment if you need Firestore
// import { getStorage } from 'firebase/storage'; // Uncomment if you need Storage

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
// const db = getFirestore(app); // Uncomment if you need Firestore
// const storage = getStorage(app); // Uncomment if you need Storage

export { app, auth /*, db, storage */ };
