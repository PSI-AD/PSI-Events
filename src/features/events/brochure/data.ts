/**
 * brochure/data.ts
 * Demo data and helper utilities for the Digital Brochure feature.
 */

import type { CRMProject } from './types';
import {
    collection, doc, addDoc, getDocs, updateDoc, serverTimestamp,
    increment, query, where, Timestamp,
} from 'firebase/firestore';
import { db } from '../../../services/firebase/firebaseConfig';
import type { BrochureToken } from './types';

// ── Demo data ─────────────────────────────────────────────────────────────────

export const DEMO_PROJECTS: CRMProject[] = [
    {
        id: 'proj_mamsha',
        name: 'Mamsha Al Saadiyat',
        developer_name: 'Aldar Properties',
        tier: 'Luxury',
        expected_avg_deal: 4_800_000,
        location: 'Saadiyat Island, Abu Dhabi',
        description: 'A beachfront masterpiece on the world-renowned Saadiyat Cultural District. Mamsha Al Saadiyat offers an unrivalled Mediterranean lifestyle with direct beach access, sophisticated dining, and proximity to the Louvre Abu Dhabi.',
        imageUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
        completionYear: '2025',
        bedrooms: '1–4 BR + Penthouse',
        priceRange: 'AED 2.8M – 22M',
        highlights: ['Beachfront', 'Louvre Abu Dhabi walkable', 'Private beach club', 'Smart home tech'],
    },
    {
        id: 'proj_marina_blue',
        name: 'Marina Blue Residences',
        developer_name: 'PSI Development',
        tier: 'Luxury',
        expected_avg_deal: 3_200_000,
        location: 'Al Reem Island, Abu Dhabi',
        description: 'Soaring glass towers defining the Al Reem Island skyline. Marina Blue Residences blend architectural excellence with panoramic sea views, world-class amenities, and a vibrant marina lifestyle.',
        imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
        completionYear: '2026',
        bedrooms: '1–3 BR',
        priceRange: 'AED 1.4M – 9M',
        highlights: ['Marina views', 'Rooftop infinity pool', 'Concierge service', 'Metro adjacent'],
    },
    {
        id: 'proj_grove',
        name: 'The Grove at Al Bateen',
        developer_name: 'Bloom Holding',
        tier: 'Medium',
        expected_avg_deal: 1_800_000,
        location: 'Al Bateen, Abu Dhabi',
        description: 'An urban sanctuary where lush landscaping meets contemporary living. The Grove redefines community living in the heart of Al Bateen, with thoughtfully designed residences and a vibrant retail promenade.',
        imageUrl: 'https://images.unsplash.com/photo-1560185008-b033106af5c3?w=800&q=80',
        completionYear: '2025',
        bedrooms: 'Studio – 3 BR',
        priceRange: 'AED 720K – 3.5M',
        highlights: ['Lush landscaping', 'Retail & F&B', 'Community pool', 'Dog park'],
    },
    {
        id: 'proj_noya',
        name: 'Noya on Yas Island',
        developer_name: 'Aldar Properties',
        tier: 'Medium',
        expected_avg_deal: 2_100_000,
        location: 'Yas Island, Abu Dhabi',
        description: 'Surrounded by the Formula 1 circuit, Ferrari World, and Yas Waterworld, Noya delivers a lifestyle unlike any other. A community designed for families seeking excitement, connectivity, and modern elegance.',
        imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80',
        completionYear: '2026',
        bedrooms: '3–5 BR Villas & Townhouses',
        priceRange: 'AED 1.6M – 6.2M',
        highlights: ['Yas Island lifestyle', 'F1 circuit nearby', 'Family community', 'Capital gains potential'],
    },
    {
        id: 'proj_sunrise',
        name: 'Sunrise Bay Towers',
        developer_name: 'Miral',
        tier: 'Average',
        expected_avg_deal: 850_000,
        location: 'Khalifa City, Abu Dhabi',
        description: 'Practical, affordable luxury for first-time investors and young professionals. Sunrise Bay Towers delivers modern design at an accessible price point, steps from key amenities and transport links.',
        imageUrl: 'https://images.unsplash.com/photo-1464082354059-27db6ce50048?w=800&q=80',
        completionYear: '2024',
        bedrooms: 'Studio – 2 BR',
        priceRange: 'AED 480K – 1.6M',
        highlights: ['Investment grade', 'High ROI', 'Ready to move', 'Flexible payment'],
    },
    {
        id: 'proj_maryah',
        name: 'Maryah Plaza',
        developer_name: 'Gulf Capital',
        tier: 'Luxury',
        expected_avg_deal: 5_600_000,
        location: 'Al Maryah Island, Abu Dhabi',
        description: 'The pinnacle of Abu Dhabi\'s DIFC-style financial district. Maryah Plaza is for investors who demand the finest — direct connectivity to Galleria Mall, 5* hotels, and the global business community.',
        imageUrl: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80',
        completionYear: '2027',
        bedrooms: '2–5 BR Residences',
        priceRange: 'AED 3.2M – 28M',
        highlights: ['Financial district', 'Galleria Mall access', 'Hotel-branded', 'Trophy asset'],
    },
];

export const DEMO_AGENT = {
    id: 'agent_demo_001',
    name: 'Khalid Al-Mansouri',
    email: 'khalid.mansouri@psiprop.ae',
    phone: '+971 50 123 4567',
    branch: 'Abu Dhabi Main Branch',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=khalid&backgroundColor=b6e3f4',
};

// ── Utilities ─────────────────────────────────────────────────────────────────

export function generateToken(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function fmtAED(n: number): string {
    return new Intl.NumberFormat('en-AE', {
        style: 'currency', currency: 'AED',
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(n);
}

// ── Firestore helpers ─────────────────────────────────────────────────────────

export async function fetchCRMProjects(): Promise<CRMProject[]> {
    try {
        const snap = await getDocs(collection(db, 'crm_projects'));
        if (snap.empty) return DEMO_PROJECTS;
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as CRMProject));
    } catch {
        return DEMO_PROJECTS;
    }
}

export async function createBrochureToken(payload: Omit<BrochureToken, 'id' | 'createdAt' | 'status' | 'viewCount' | 'lastViewedAt'>): Promise<string> {
    const tokenStr = payload.token;
    await addDoc(collection(db, 'brochure_tokens'), {
        ...payload,
        status: 'sent',
        viewCount: 0,
        lastViewedAt: null,
        createdAt: serverTimestamp(),
    });
    return tokenStr;
}

export async function fetchBrochureByToken(token: string): Promise<BrochureToken | null> {
    try {
        const q = query(collection(db, 'brochure_tokens'), where('token', '==', token));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        const d = snap.docs[0];
        const data = d.data();
        return {
            id: d.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp
                ? data.createdAt.toDate().toISOString()
                : (data.createdAt ?? new Date().toISOString()),
            lastViewedAt: data.lastViewedAt instanceof Timestamp
                ? data.lastViewedAt.toDate().toISOString()
                : data.lastViewedAt ?? null,
        } as BrochureToken;
    } catch {
        return null;
    }
}

export async function recordView(brochureDocId: string, isFirst: boolean): Promise<void> {
    try {
        await addDoc(collection(db, 'brochure_tokens', brochureDocId, 'view_events'), {
            viewedAt: serverTimestamp(),
            userAgent: navigator.userAgent,
            referrer: document.referrer || 'direct',
            isFirstView: isFirst,
        });
        await updateDoc(doc(db, 'brochure_tokens', brochureDocId), {
            viewCount: increment(1),
            lastViewedAt: serverTimestamp(),
            status: 'viewed',
        });
    } catch { /* non-fatal */ }
}

export async function requestCallback(brochureDocId: string, brochure: BrochureToken): Promise<void> {
    await addDoc(collection(db, 'users', brochure.agentId, 'notifications'), {
        type: 'callback_request',
        token: brochure.token,
        clientName: brochure.clientName,
        projectNames: brochure.projectSnapshots.map(p => p.name),
        message: `${brochure.clientName} has requested a callback about: ${brochure.projectSnapshots.map(p => p.name).join(', ')}.`,
        read: false,
        createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'brochure_tokens', brochureDocId), {
        status: 'callback_requested',
    });
}
