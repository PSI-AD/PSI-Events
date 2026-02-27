import * as admin from 'firebase-admin';
import { syncUsers } from './api/syncUsers';
import { syncProjects } from './api/syncProjects';

/**
 * index.ts
 * Entry point for Firebase Cloud Functions.
 */

admin.initializeApp();

export {
  syncUsers,
  syncProjects
};
