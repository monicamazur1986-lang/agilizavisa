
'use client';

/**
 * @fileOverview MOTOR DE INICIALIZAÇÃO FIREBASE - SEM JSX.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, setLogLevel } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import firebaseAppletConfig from '../../firebase-applet-config.json';

export function initializeFirebase(): { app: FirebaseApp; db: Firestore; auth: Auth } | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const config = firebaseAppletConfig;
    if (!config || !config.apiKey) {
      console.error("Firebase config is missing or invalid:", config);
      return null;
    }

    const app = !getApps().length
      ? initializeApp({
          apiKey: config.apiKey,
          authDomain: config.authDomain,
          projectId: config.projectId,
          storageBucket: config.storageBucket,
          messagingSenderId: config.messagingSenderId,
          appId: config.appId,
        })
      : getApp();
    const db = getFirestore(app, config.firestoreDatabaseId);
    try {
      setLogLevel('error');
    } catch (err) {
      // Ignore if fail
    }
    const auth = getAuth(app);
    
    return { app, db, auth };
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    return null;
  }
}
