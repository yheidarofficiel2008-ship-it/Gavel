/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, Firestore } from 'firebase/firestore';
import { OperationType, FirestoreErrorInfo } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth();

const dbCache: Record<string, Firestore> = {};

/**
 * Returns either the default Firestore database instance or a dynamically initialized one
 * based on the committee's custom Firebase options.
 */
export function getDbForCommittee(committee: {
  id: string;
  useCustomFirebase?: boolean;
  firebaseApiKey?: string;
  firebaseAuthDomain?: string;
  firebaseProjectId?: string;
  firebaseStorageBucket?: string;
  firebaseMessagingSenderId?: string;
  firebaseAppId?: string;
  firebaseDatabaseId?: string;
} | null | undefined): Firestore {
  if (!committee || !committee.useCustomFirebase || !committee.firebaseProjectId || !committee.firebaseApiKey) {
    return db;
  }

  const cacheKey = committee.id;
  if (dbCache[cacheKey]) {
    return dbCache[cacheKey];
  }

  const appName = `committee-${committee.id}`;
  let customApp;
  const existingApps = getApps();
  const found = existingApps.find(a => a.name === appName);

  if (found) {
    customApp = found;
  } else {
    const config = {
      apiKey: committee.firebaseApiKey,
      authDomain: committee.firebaseAuthDomain || `${committee.firebaseProjectId}.firebaseapp.com`,
      projectId: committee.firebaseProjectId,
      storageBucket: committee.firebaseStorageBucket || `${committee.firebaseProjectId}.appspot.com`,
      messagingSenderId: committee.firebaseMessagingSenderId || '',
      appId: committee.firebaseAppId || '',
    };
    customApp = initializeApp(config, appName);
  }

  const customDb = getFirestore(customApp, committee.firebaseDatabaseId || '(default)');
  dbCache[cacheKey] = customDb;
  return customDb;
}

/**
 * Validates connection to the Firestore instance immediately on boot
 */
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or network status.");
    }
  }
}
testConnection();

/**
 * Handles Firestore errors by formatting them into diagnostic JSON objects
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error Occurred: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
