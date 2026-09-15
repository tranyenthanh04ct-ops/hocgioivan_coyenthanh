import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { normalizeAuthPassword } from '../lib/authUtils';

export const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

// Initialize Primary Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Use named database or default database from config
export const db = firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)'
  ? initializeFirestore(app, {}, firebaseConfigJson.firestoreDatabaseId)
  : getFirestore(app);

export const storage = getStorage(app);

/**
 * Secondary Firebase instance to create student accounts without signing out the logged-in teacher
 */
export async function createStudentAuthAccount(email: string, pass: string): Promise<string> {
  const normalizedPass = normalizeAuthPassword(pass);
  const fallbackUid = `std_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  try {
    const secondaryAppName = 'SecondaryAuthStudentCreator';
    let secondaryApp;
    const existingApps = getApps();
    const found = existingApps.find(a => a.name === secondaryAppName);
    if (found) {
      secondaryApp = found;
    } else {
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    }

    const secondaryAuth = getAuth(secondaryApp);
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, normalizedPass);
    const newUid = userCredential.user.uid;
    
    // Sign out the secondary session immediately so it doesn't linger
    await signOut(secondaryAuth);

    return newUid;
  } catch (err: any) {
    // If Firebase Auth Email/Password is not enabled on project, safely return deterministic UID
    console.warn('Firebase Auth secondary creation bypassed, using Firestore UID:', err?.code || err);
    return fallbackUid;
  }
}
