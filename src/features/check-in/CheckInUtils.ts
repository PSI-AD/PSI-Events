/**
 * CheckInUtils.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Utilities for the Physical Venue Check-In module.
 *
 * JWT Strategy:
 *   Signing uses the browser's native Web Crypto API (HMAC-SHA256).
 *   The shared secret comes from VITE_CHECK_IN_SECRET. In production this
 *   signing step MUST move to a Cloud Function so the secret is never
 *   shipped to the client. Here it is clearly flagged as a prototype flow.
 *
 * Firestore:
 *   crm_events/{eventId}/approvedAgents/{agentId}
 *     status: 'approved' | 'physically_present'
 *     checkedInAt: Timestamp
 *     checkedInBy: string  (organizer uid)
 */

import {
    collection,
    doc,
    getDocs,
    query,
    updateDoc,
    where,
    serverTimestamp,
    onSnapshot,
    Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CheckInJWTPayload {
    sub: string;     // agentId
    eid: string;     // eventId
    name: string;    // agentName
    tier: string;    // risk tier
    iat: number;     // issued at (unix seconds)
    exp: number;     // expires at (unix seconds — 24h window)
}

export type AgentStatus = 'pending' | 'approved' | 'physically_present' | 'rejected';

export interface CheckInAgent {
    agentId: string;
    agentName: string;
    email: string;
    phone: string;
    branch: string;
    tier: 'gold' | 'silver' | 'bronze';
    managerApproved: boolean;
    flightUploaded: boolean;
    visaUploaded: boolean;
    status: AgentStatus;
    checkedInAt?: Date;
    checkedInBy?: string;
}

export interface CheckInEvent {
    eventId: string;
    eventName: string;
    venue: string;
    eventDate: string;
    status: string;
}

// ── Secret (prototype — move to backend in production) ───────────────────────

const CHECK_IN_SECRET =
    import.meta.env.VITE_CHECK_IN_SECRET ?? 'psi-check-in-dev-secret-2026';

// ── JWT helpers (pure Web Crypto — zero dependencies) ────────────────────────

function base64url(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function base64urlEncode(str: string): string {
    return btoa(unescape(encodeURIComponent(str)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

async function hmac256Key(secret: string): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
}

/**
 * Create a signed HS256 JWT containing the agent check-in payload.
 * Valid for 24 hours from issuance.
 */
export async function generateCheckInJWT(
    agentId: string,
    eventId: string,
    agentName: string,
    tier: string
): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload: CheckInJWTPayload = {
        sub: agentId,
        eid: eventId,
        name: agentName,
        tier,
        iat: now,
        exp: now + 86400, // valid 24 hours
    };

    const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64urlEncode(JSON.stringify(payload));
    const data = `${header}.${body}`;

    const key = await hmac256Key(CHECK_IN_SECRET);
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));

    return `${data}.${base64url(sig)}`;
}

/**
 * Decode a JWT payload WITHOUT verifying the signature (for display only).
 */
export function decodeJWTPayload(token: string): CheckInJWTPayload | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(json) as CheckInJWTPayload;
    } catch {
        return null;
    }
}

/**
 * Verify a JWT signature and expiry. Returns payload if valid, null if not.
 */
export async function verifyCheckInJWT(
    token: string
): Promise<CheckInJWTPayload | null> {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [headerB64, payloadB64, signatureB64] = parts;
        const data = `${headerB64}.${payloadB64}`;

        // Recreate the signature for comparison
        const key = await hmac256Key(CHECK_IN_SECRET);
        const expectedSig = await crypto.subtle.sign(
            'HMAC',
            key,
            new TextEncoder().encode(data)
        );
        const expectedB64 = base64url(expectedSig);

        if (expectedB64 !== signatureB64) return null; // tampered

        const payload = decodeJWTPayload(token);
        if (!payload) return null;

        // Check expiry
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) return null; // expired

        return payload;
    } catch {
        return null;
    }
}

// ── Firestore operations ──────────────────────────────────────────────────────

/**
 * Fetch all agents for an event (approved + pending check-in).
 */
export async function fetchEventAgents(eventId: string): Promise<CheckInAgent[]> {
    const snap = await getDocs(
        collection(db, 'crm_events', eventId, 'approvedAgents')
    );
    return snap.docs.map((d) => {
        const data = d.data();
        return {
            agentId: d.id,
            agentName: data.agentName ?? data.name ?? 'Unknown',
            email: data.email ?? '',
            phone: data.phone ?? '',
            branch: data.branch ?? '',
            tier: data.tier ?? 'silver',
            managerApproved: data.managerApproved ?? false,
            flightUploaded: data.flightUploaded ?? false,
            visaUploaded: data.visaUploaded ?? false,
            status: data.status ?? 'pending',
            checkedInAt: data.checkedInAt?.toDate?.() ?? undefined,
            checkedInBy: data.checkedInBy ?? undefined,
        } as CheckInAgent;
    });
}

/**
 * Subscribe to live agent updates for an event (realtime).
 */
export function subscribeToEventAgents(
    eventId: string,
    onUpdate: (agents: CheckInAgent[]) => void
): Unsubscribe {
    return onSnapshot(
        collection(db, 'crm_events', eventId, 'approvedAgents'),
        (snap) => {
            const agents = snap.docs.map((d) => {
                const data = d.data();
                return {
                    agentId: d.id,
                    agentName: data.agentName ?? data.name ?? 'Unknown',
                    email: data.email ?? '',
                    phone: data.phone ?? '',
                    branch: data.branch ?? '',
                    tier: data.tier ?? 'silver',
                    managerApproved: data.managerApproved ?? false,
                    flightUploaded: data.flightUploaded ?? false,
                    visaUploaded: data.visaUploaded ?? false,
                    status: data.status ?? 'pending',
                    checkedInAt: data.checkedInAt?.toDate?.() ?? undefined,
                    checkedInBy: data.checkedInBy ?? undefined,
                } as CheckInAgent;
            });
            onUpdate(agents);
        }
    );
}

/**
 * Mark an agent as physically_present. This is the atomic status upgrade
 * that unlocks lead distribution for this agent.
 */
export async function markAgentPresent(
    eventId: string,
    agentId: string,
    organizerUid: string
): Promise<void> {
    const agentRef = doc(db, 'crm_events', eventId, 'approvedAgents', agentId);
    await updateDoc(agentRef, {
        status: 'physically_present',
        checkedInAt: serverTimestamp(),
        checkedInBy: organizerUid,
    });
}

/**
 * Fetch upcoming events for the event selector.
 */
export async function fetchUpcomingEvents(): Promise<CheckInEvent[]> {
    const snap = await getDocs(
        query(
            collection(db, 'crm_events'),
            where('status', 'in', ['upcoming', 'active', 'confirmed'])
        )
    );
    return snap.docs.map((d) => ({
        eventId: d.id,
        eventName: d.data().eventName ?? 'Unnamed Event',
        venue: d.data().venue ?? '',
        eventDate: d.data().eventDate ?? '',
        status: d.data().status ?? 'upcoming',
    }));
}

// ── Demo seed (shown when Firestore has no events) ────────────────────────────

export const DEMO_EVENT: CheckInEvent = {
    eventId: 'demo_event_q1_2026',
    eventName: 'Abu Dhabi Luxury Roadshow — Q1 2026',
    venue: 'Four Seasons Hotel, Al Maryah Island',
    eventDate: '2026-03-15',
    status: 'upcoming',
};

export const DEMO_AGENTS: CheckInAgent[] = [
    {
        agentId: 'agt_001', agentName: 'Khalid Al-Mansouri', email: 'khalid@psi.ae',
        phone: '+971501111111', branch: 'Abu Dhabi Main', tier: 'gold',
        managerApproved: true, flightUploaded: true, visaUploaded: true,
        status: 'approved',
    },
    {
        agentId: 'agt_002', agentName: 'Sara Almarzouqi', email: 'sara@psi.ae',
        phone: '+971502222222', branch: 'Dubai Marina', tier: 'gold',
        managerApproved: true, flightUploaded: true, visaUploaded: true,
        status: 'approved',
    },
    {
        agentId: 'agt_003', agentName: 'Omar Bin Rashid', email: 'omar@psi.ae',
        phone: '+971503333333', branch: 'Abu Dhabi Main', tier: 'silver',
        managerApproved: true, flightUploaded: false, visaUploaded: true,
        status: 'approved',
    },
    {
        agentId: 'agt_004', agentName: 'Nour Al-Hamdan', email: 'nour@psi.ae',
        phone: '+971504444444', branch: 'Sharjah', tier: 'silver',
        managerApproved: true, flightUploaded: true, visaUploaded: true,
        status: 'physically_present',
        checkedInAt: new Date('2026-02-28T07:30:00'),
    },
    {
        agentId: 'agt_005', agentName: 'Fatima Al-Zaabi', email: 'fatima@psi.ae',
        phone: '+971505555555', branch: 'Abu Dhabi Main', tier: 'bronze',
        managerApproved: true, flightUploaded: true, visaUploaded: true,
        status: 'approved',
    },
];

// ── Tier display config ───────────────────────────────────────────────────────

export const TIER_STYLES = {
    gold: { badge: 'bg-amber-500 text-slate-900 dark:text-white', ring: 'ring-amber-500/50', text: 'text-amber-400' },
    silver: { badge: 'bg-slate-400 text-slate-900', ring: 'ring-slate-400/50', text: 'text-slate-700 dark:text-slate-300' },
    bronze: { badge: 'bg-orange-700 text-slate-900 dark:text-white', ring: 'ring-orange-700/50', text: 'text-orange-400' },
};
