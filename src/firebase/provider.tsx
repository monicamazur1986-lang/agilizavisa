'use client';

/**
 * @fileOverview PROVEDOR DE CONTEXTO FIREBASE - COM JSX.
 */

import React, { createContext, useContext } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';

interface FirebaseContextProps {
  app: FirebaseApp | null;
  db: Firestore | null;
  auth: Auth | null;
}

const FirebaseContext = createContext<FirebaseContextProps>({
  app: null,
  db: null,
  auth: null
});

export const useFirebase = () => useContext(FirebaseContext);
export const useFirestore = () => useContext(FirebaseContext).db;
export const useAuth = () => useContext(FirebaseContext).auth;
export const useFirebaseApp = () => useContext(FirebaseContext).app;

export const FirebaseProvider: React.FC<{
  children: React.ReactNode;
  app: FirebaseApp | null;
  db: Firestore | null;
  auth: Auth | null;
}> = ({ children, app, db, auth }) => {
  return (
    <FirebaseContext.Provider value={{ app, db, auth }}>
      {children}
    </FirebaseContext.Provider>
  );
};