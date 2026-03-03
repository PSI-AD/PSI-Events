/**
 * src/services/firebase/psiMapsConfig.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Secondary Firebase App — PSI Maps (psimaps-pro)
 *
 * Connects to our sister project's Firestore to read live property data
 * without any intermediary API or CORS proxy.
 *
 * Singleton pattern:
 *   We check getApps() for an existing "PSI_MAPS" named instance before
 *   calling initializeApp(). This is critical because:
 *     • The primary [DEFAULT] app is already initialized by firebaseConfig.ts
 *     • Hot-module reload (Vite HMR) will re-execute this module — without
 *       the guard you'd get: "Firebase App named 'PSI_MAPS' already exists"
 *
 * Usage:
 *   import { mapsDb } from './psiMapsConfig';
 *   const snap = await getDocs(collection(mapsDb, 'properties'));
 *
 * Environment variables (add to .env.local, never commit):
 *   VITE_MAPS_API_KEY
 *   VITE_MAPS_AUTH_DOMAIN
 *   VITE_MAPS_PROJECT_ID
 *   VITE_MAPS_STORAGE_BUCKET
 *   VITE_MAPS_MESSAGING_SENDER_ID
 *   VITE_MAPS_APP_ID
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ── PSI Maps Firebase config ───────────────────────────────────────────────
// Values are read from VITE_MAPS_* env vars so the same codebase can target
// different Maps environments (staging vs production) without code changes.
// The hardcoded fallbacks below match the psimaps-pro production project and
// are safe to ship since this is a client-side SDK (read-only, public config).

const mapsConfig = {
    apiKey: import.meta.env.VITE_MAPS_API_KEY ?? 'AIzaSyCt5DngU6nykCcp7Lk1m2xUgpzOFLB7KKY',
    authDomain: import.meta.env.VITE_MAPS_AUTH_DOMAIN ?? 'psimaps-pro.firebaseapp.com',
    projectId: import.meta.env.VITE_MAPS_PROJECT_ID ?? 'psimaps-pro',
    storageBucket: import.meta.env.VITE_MAPS_STORAGE_BUCKET ?? 'psimaps-pro.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_MAPS_MESSAGING_SENDER_ID ?? '618627128805',
    appId: import.meta.env.VITE_MAPS_APP_ID ?? '1:618627128805:web:b9a7a3e475f54f590b230c',
};

// ── Singleton initialisation ───────────────────────────────────────────────
// getApps() returns all currently-initialized Firebase apps.
// We look for one named 'PSI_MAPS' specifically — NOT checking length === 0,
// because the primary [DEFAULT] app is already running.

const PSI_MAPS_APP_NAME = 'PSI_MAPS';

const mapsApp = getApps().find(a => a.name === PSI_MAPS_APP_NAME)
    ?? initializeApp(mapsConfig, PSI_MAPS_APP_NAME);

// ── Firestore instance pointing at psimaps-pro ────────────────────────────
export const mapsDb = getFirestore(mapsApp);

// ── Config re-export (useful for diagnostics / admin panels) ──────────────
export const MAPS_PROJECT_ID = mapsConfig.projectId;
export { mapsApp };
