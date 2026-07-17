
'use client';

/**
 * @fileOverview HUB FIREBASE PURIFICADO - APENAS LOGICA TS PARA EVITAR ERROS DE BUILD.
 */

export * from './core';
export { 
  FirebaseProvider, 
  useFirebase, 
  useFirestore, 
  useAuth, 
  useFirebaseApp 
} from './provider';
export { useUser } from './auth/use-user';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
