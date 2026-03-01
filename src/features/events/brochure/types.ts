/**
 * brochure/types.ts
 * All TypeScript interfaces and constants for the Digital Brochure feature.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CRMProject {
    id: string;
    name: string;
    developer_name?: string;
    tier: 'Luxury' | 'Medium' | 'Average';
    expected_avg_deal: number;
    location?: string;
    description?: string;
    imageUrl?: string;
    completionYear?: string;
    bedrooms?: string;
    priceRange?: string;
    highlights?: string[];
    training_material_url?: string;
}

export interface BrochureToken {
    id: string;
    token: string;
    agentId: string;
    agentName: string;
    agentEmail: string;
    agentPhone?: string;
    agentAvatar?: string;
    clientName: string;
    clientEmail: string;
    personalNote?: string;
    selectedProjectIds: string[];
    projectSnapshots: CRMProject[];
    createdAt: string;
    status: 'sent' | 'viewed' | 'callback_requested';
    viewCount: number;
    lastViewedAt: string | null;
}

export interface ViewEvent {
    id: string;
    viewedAt: string;
    userAgent: string;
    referrer: string;
    isFirstView: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const TIER_COLORS: Record<CRMProject['tier'], string> = {
    Luxury: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-300 dark:border-amber-700/40',
    Medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-300 dark:border-blue-700/40',
    Average: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/40',
};
