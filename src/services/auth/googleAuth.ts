/**
 * googleAuth.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Encapsulates Firebase Google Authentication for the PSI Event Portal.
 *
 * Security model:
 *   1. Open a Google Sign-In popup (works cross-origin with Firebase Hosting).
 *   2. Immediately check the returned email against the whitelist.
 *   3. If email is NOT authorised → call auth.signOut() synchronously and
 *      throw an AccessDeniedError so the UI can display a red alert.
 *   4. If email IS authorised → check Firestore for an existing profile.
 *   5. If no profile exists → create one with a deterministic, human-readable
 *      document ID (no random Firebase UUIDs).
 *   6. Return the profile to the caller for state management / context.
 *
 * The dashboard at / is intentionally NOT guarded — this file only runs
 * when the user explicitly visits /login and clicks "Sign in with Google".
 */

import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

// ── Constants ─────────────────────────────────────────────────────────────────

/** The only email address permitted to authenticate. */
const AUTHORISED_EMAIL = 'propertyshopinvest@gmail.com';

/** Human-readable Firestore document ID for the authorised user's profile. */
const PROFILE_DOC_ID = 'usr_said_abu_laila_admin';

/** Firestore collection that holds user profiles. */
const USERS_COLLECTION = 'crm_users';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: string;
    branch: string;
    createdAt: unknown; // Firestore Timestamp — opaque at the service layer
    lastLogin: unknown;
}

/** Thrown when the Google account email is not in the whitelist. */
export class AccessDeniedError extends Error {
    constructor(email: string) {
        super(`Access Denied: Unauthorized Email — ${email}`);
        this.name = 'AccessDeniedError';
    }
}

// ── Google provider (singleton) ───────────────────────────────────────────────

const googleProvider = new GoogleAuthProvider();
// Request the user's profile and email scopes
googleProvider.addScope('profile');
googleProvider.addScope('email');
// Always force the account-picker screen so the user can switch Google accounts
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ── Core function ─────────────────────────────────────────────────────────────

/**
 * signInWithGoogle
 * ────────────────
 * Triggers the Google OAuth popup and enforces the email whitelist.
 *
 * @returns The authenticated user's Firestore profile.
 * @throws  AccessDeniedError  if the email is not authorised.
 * @throws  Error              for any other Firebase / network failure.
 */
export async function signInWithGoogle(): Promise<UserProfile> {
    // Step 1 — Open Google sign-in popup
    const result = await signInWithPopup(auth, googleProvider);
    const { user } = result;

    // Step 2 — Whitelist enforcement (case-insensitive trim for safety)
    const incomingEmail = (user.email ?? '').trim().toLowerCase();
    const authorisedEmail = AUTHORISED_EMAIL.trim().toLowerCase();

    if (incomingEmail !== authorisedEmail) {
        // Sign out immediately before throwing — do not leave an authenticated
        // session for an unauthorised user even for a millisecond.
        await signOut(auth);
        throw new AccessDeniedError(user.email ?? 'unknown');
    }

    // Step 3 — Check for existing Firestore profile
    const profileRef = doc(db, USERS_COLLECTION, PROFILE_DOC_ID);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
        // Step 4 — First-ever login: create the canonical profile document.
        //
        // IMPORTANT: We deliberately use PROFILE_DOC_ID (a clean, readable string)
        // instead of user.uid (a random Firebase UUID like "abcXYZ123...").
        // This makes Firestore queries, console debugging, and audit trails
        // human-readable — a critical requirement for a small, named team.
        const newProfile: Omit<UserProfile, 'id'> = {
            name: 'Said Abu Laila',
            email: AUTHORISED_EMAIL,
            role: 'God-Mode Organizer',
            branch: 'Abu Dhabi HQ',
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
        };

        await setDoc(profileRef, newProfile);

        console.info('[PSI Auth] New admin profile created:', PROFILE_DOC_ID);

        return { id: PROFILE_DOC_ID, ...newProfile };
    }

    // Step 5 — Existing profile: refresh lastLogin timestamp
    await setDoc(profileRef, { lastLogin: serverTimestamp() }, { merge: true });

    console.info('[PSI Auth] Existing profile found, lastLogin updated:', PROFILE_DOC_ID);

    return {
        id: PROFILE_DOC_ID,
        ...(profileSnap.data() as Omit<UserProfile, 'id'>),
        lastLogin: serverTimestamp(), // return fresh value
    };
}

/**
 * signOutUser
 * ───────────
 * Convenience wrapper for Firebase signOut.
 * Call this from a "Sign Out" button anywhere in the app.
 */
export async function signOutUser(): Promise<void> {
    await signOut(auth);
    console.info('[PSI Auth] User signed out.');
}
