/**
 * traveldesk/data.ts
 * Demo seed data, mock API, and utility functions for TravelDesk.
 */

import type { FlightOption, FlightRoute, TravelBudget, EventTravelConfig } from './types';

// ── Mock API ──────────────────────────────────────────────────────────────────

const AIRLINES = [
    { name: 'Emirates', code: 'EK', logo: '✈️', base: 2800 },
    { name: 'Etihad Airways', code: 'EY', logo: '🛫', base: 2400 },
    { name: 'British Airways', code: 'BA', logo: '✈️', base: 3200 },
    { name: 'Flydubai', code: 'FZ', logo: '🛫', base: 1600 },
    { name: 'Air Arabia', code: 'G9', logo: '✈️', base: 1400 },
    { name: 'Qatar Airways', code: 'QR', logo: '✈️', base: 2900 },
];

export async function mockSearchFlights(
    route: FlightRoute,
    _budget: TravelBudget,
): Promise<FlightOption[]> {
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 600));

    const departures = ['06:15', '08:45', '10:30', '13:00', '15:45', '22:30'];
    const durations = [420, 390, 505, 370, 455, 415];

    return AIRLINES.map((al, i) => {
        const priceVariance = (Math.random() - 0.3) * 800;
        const price = Math.round((al.base + priceVariance) / 50) * 50;
        const dept = departures[i];
        const dur = durations[i];
        const [dh, dm] = dept.split(':').map(Number);
        const arrMins = dh * 60 + dm + dur;
        const arr = `${String(Math.floor(arrMins / 60) % 24).padStart(2, '0')}:${String(arrMins % 60).padStart(2, '0')}`;

        return {
            id: `${al.code}${500 + i}_${route.date}`,
            airline: al.name,
            airlineCode: al.code,
            flightNumber: `${al.code}${500 + i}`,
            logo: al.logo,
            departure: dept,
            arrival: arr,
            durationMins: dur,
            stops: (i === 2 ? 1 : i === 4 ? 1 : 0) as 0 | 1 | 2,
            stopCity: i === 2 ? 'Istanbul' : i === 4 ? 'Muscat' : undefined,
            price,
            cabinClass: i <= 1 ? 'Business' : 'Economy',
            baggageKg: i <= 1 ? 30 : 23,
            refundable: i % 3 === 0,
            rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
            seatsLeft: Math.ceil(Math.random() * 9),
        } satisfies FlightOption;
    }).sort((a, b) => a.price - b.price);
}

// ── Demo seed data ────────────────────────────────────────────────────────────

export const DEMO_CONFIG: EventTravelConfig = {
    eventId: 'evt_london_luxury_expo_oct2026',
    eventName: 'London Luxury Property Show',
    route: {
        from: 'DXB',
        fromCity: 'Dubai',
        to: 'LHR',
        toCity: 'London',
        date: '2026-10-14',
        returnDate: '2026-10-17',
    },
    budget: { maxPerAgent: 2600, currency: 'AED' },
    agents: [
        {
            id: 'usr_sara_almarzouqi',
            name: 'Sara Al Marzouqi',
            email: 'sara@psi.ae',
            branch: 'Dubai Marina',
            tier: 'Gold',
            status: 'confirmed',
            bookedFlight: {
                id: 'EY501_2026-10-14',
                airline: 'Etihad Airways',
                airlineCode: 'EY',
                logo: '🛫',
                flightNumber: 'EY501',
                departure: '08:45',
                arrival: '13:15',
                durationMins: 390,
                stops: 0,
                price: 2450,
                cabinClass: 'Economy',
                baggageKg: 23,
                refundable: true,
                rating: 4.5,
                seatsLeft: 3,
            },
            bookedAt: '2026-03-01T07:22:00Z',
            expenseRef: 'EXP_20260301_001',
        },
        { id: 'usr_khalid_mansouri', name: 'Khalid Mansouri', email: 'khalid@psi.ae', branch: 'Abu Dhabi Main', tier: 'Silver', status: 'approved' },
        { id: 'usr_rami_haddad', name: 'Rami Haddad', email: 'rami@psi.ae', branch: 'Sharjah', tier: 'Bronze', status: 'approved' },
    ],
};

// ── Utilities ─────────────────────────────────────────────────────────────────

export function clsx(...c: (string | boolean | undefined | null)[]) {
    return c.filter(Boolean).join(' ');
}

export function fmtAed(n: number) {
    return `${n.toLocaleString('en-AE')} AED`;
}

export function fmtDuration(mins: number) {
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function tierColour(tier: string) {
    if (tier === 'Gold') return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20';
    if (tier === 'Silver') return 'text-slate-500 bg-slate-100 dark:bg-slate-700/40';
    return 'text-amber-800 bg-amber-50  dark:bg-amber-900/10';
}

export type StatusBadge = { label: string; cls: string };

export function statusBadge(status: import('./types').AgentBookingStatus): StatusBadge {
    switch (status) {
        case 'confirmed': return { label: 'Booked ✓', cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700' };
        case 'searching': return { label: 'Searching…', cls: 'bg-blue-100    dark:bg-blue-900/30    text-blue-700    dark:text-blue-300    border-blue-200    dark:border-blue-700' };
        case 'approved': return { label: 'Awaiting', cls: 'bg-amber-100   dark:bg-amber-900/30   text-amber-700   dark:text-amber-300   border-amber-200   dark:border-amber-700' };
        case 'rejected': return { label: 'Rejected', cls: 'bg-rose-100    dark:bg-rose-900/30    text-rose-700    dark:text-rose-300    border-rose-200    dark:border-rose-700' };
    }
}
