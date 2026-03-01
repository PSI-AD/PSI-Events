/**
 * bounty/constants.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Demo/mock data and static presets for the Bounty System.
 */

import type { IncentiveType } from './types';

export const DEMO_PROJECTS = [
    'Marina Blue Tower',
    'Yas Bay Waterfront',
    'Downtown Heights',
    'Saadiyat Grove',
    'Palm Coral Residences',
];

export const DURATION_PRESETS = [
    { label: '30 min', value: 30 },
    { label: '1 hr', value: 60 },
    { label: '2 hrs', value: 120 },
    { label: '3 hrs', value: 180 },
];

export const INCENTIVE_PRESETS = [
    { label: '1,000 AED', aed: 1000, type: 'cash' as IncentiveType },
    { label: '1,500 AED', aed: 1500, type: 'cash' as IncentiveType },
    { label: '2,500 AED', aed: 2500, type: 'cash' as IncentiveType },
    { label: '+1% Comm.', aed: 0, type: 'commission_pct' as IncentiveType, pct: 1 },
    { label: '+2% Comm.', aed: 0, type: 'commission_pct' as IncentiveType, pct: 2 },
    { label: 'Gift Hamper', aed: 800, type: 'gift' as IncentiveType },
];
