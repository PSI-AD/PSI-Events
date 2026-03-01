/**
 * bounty/types.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * All TypeScript types and interfaces for the Live Floor Bounty System.
 */

export type BountyStatus = 'active' | 'claimed' | 'verified' | 'expired';
export type IncentiveType = 'cash' | 'commission_pct' | 'gift';

export interface BountyDocument {
    id: string;
    eventId: string;

    // What is being bounty-hunted
    targetProject: string;        // e.g. "Marina Blue Tower"
    incentiveLabel: string;       // e.g. "1,500 AED Cash" or "+2% Commission"
    incentiveAed: number;         // numeric value — always in AED for settlement
    incentiveType: IncentiveType;
    commissionPctBonus?: number;  // only if type === 'commission_pct'

    // Timing
    durationMinutes: number;
    expiresAt: string;            // ISO — computed at creation
    issuedAt: string;             // ISO

    // Who
    issuedBy: string;             // Organizer display name

    // Status
    status: BountyStatus;

    // Claim fields (set when agent taps Claim)
    claimedBy?: string;           // agentId
    claimedByName?: string;
    claimedAt?: string;

    // Verification fields (Organizer hits Verify after CRM check)
    verifiedBy?: string;
    verifiedAt?: string;
    bonusAed?: number;            // AED amount injected into Settlement
}

/** Shape used to create a new bounty */
export type NewBounty = Omit<
    BountyDocument,
    'id' | 'status' | 'claimedBy' | 'claimedByName' | 'claimedAt' |
    'verifiedBy' | 'verifiedAt' | 'bonusAed'
>;
