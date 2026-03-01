/**
 * bounty/utils.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure utility functions for the Bounty System.
 * No React imports — fully testable in isolation.
 */

export function clsx(...classes: (string | false | undefined | null)[]): string {
    return classes.filter(Boolean).join(' ');
}

export function formatCountdown(expiresAt: string): {
    text: string;
    urgent: boolean;
    expired: boolean;
} {
    const remaining = new Date(expiresAt).getTime() - Date.now();
    if (remaining <= 0) return { text: 'EXPIRED', urgent: true, expired: true };
    const totalSec = Math.floor(remaining / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const urgent = remaining < 10 * 60 * 1000; // last 10 min
    return {
        text: m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`,
        urgent,
        expired: false,
    };
}

export function getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}
