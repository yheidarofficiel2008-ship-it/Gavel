/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Delegation {
  country: string;
  delegateName?: string;
  present: boolean;
  voting: boolean;
  password?: string;
}

export interface Speaker {
  id: string;
  country: string;
  durationTotal: number; // in seconds
  durationUsed: number;  // in seconds
}

export interface CaucusState {
  type: 'moderated' | 'unmoderated' | 'none';
  topic: string;
  totalTime: number; // in seconds
  speakerTime: number; // in seconds
  timeLeft: number; // in seconds
  active: boolean;
}

export interface Committee {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  delegations: Delegation[];
  activeSpeakers?: Speaker[];
  activeCaucus?: CaucusState;
  createdAt: any; // Firestore Timestamp or ISO string
  updatedAt: any; // Firestore Timestamp or ISO string
  language?: 'FR' | 'EN';
  chairEmail?: string;
  chairPassword?: string;
  grades?: {
    [country: string]: {
      g1?: string;
      g2?: string;
      g3?: string;
      g4?: string;
      text?: string;
    };
  };
  useCustomFirebase?: boolean;
  firebaseApiKey?: string;
  firebaseAuthDomain?: string;
  firebaseProjectId?: string;
  firebaseStorageBucket?: string;
  firebaseMessagingSenderId?: string;
  firebaseAppId?: string;
  firebaseDatabaseId?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}
