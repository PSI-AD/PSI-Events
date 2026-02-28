import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

/**
 * firebaseConfig.ts
 * Core Firebase client configuration for the PSI Event Portal.
 *
 * ── Pre-flight environment check ──────────────────────────────────────────────
 * Validates that all required VITE_ environment variables are present before
 * attempting Firebase initialization. Missing variables are the #1 cause of
 * the auth/invalid-api-key error that crashes the app to a blank screen.
 *
 * Variables must be defined in:
 *   • Local dev  → .env.local  (never commit to git)
 *   • CI/CD      → Firebase Hosting / GitHub Actions / Vercel env secrets
 */

const REQUIRED_ENV_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

// ── Pre-flight check ──────────────────────────────────────────────────────────

const missing = REQUIRED_ENV_VARS.filter(
  key => !import.meta.env[key] || (import.meta.env[key] as string).trim() === ''
);

if (missing.length > 0) {
  console.error(
    '╔══════════════════════════════════════════════════════════════╗\n' +
    '║  CRITICAL: Firebase configuration incomplete.                ║\n' +
    '╚══════════════════════════════════════════════════════════════╝\n' +
    'The following environment variables are missing or empty:\n' +
    missing.map(k => `  ✗ ${k}`).join('\n') + '\n\n' +
    'How to fix:\n' +
    '  1. Create a .env.local file in the project root.\n' +
    '  2. Add all VITE_FIREBASE_* keys from your Firebase Console.\n' +
    '  3. If deploying via CI/CD (GitHub Actions, Firebase Hosting),\n' +
    '     add these values as repository/environment secrets.\n' +
    '  4. Restart the dev server after editing .env.local.\n\n' +
    'The application will likely crash with auth/invalid-api-key.'
  );
}

if (!import.meta.env.VITE_FIREBASE_API_KEY) {
  console.error(
    'CRITICAL: Firebase API Key is missing. Check .env.local or CI/CD secrets.\n' +
    '  Expected: VITE_FIREBASE_API_KEY=AIza...'
  );
}

// ── Firebase config object ────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// ── Initialize Firebase ───────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);

// ── Initialize Services ───────────────────────────────────────────────────────

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

export default app;
