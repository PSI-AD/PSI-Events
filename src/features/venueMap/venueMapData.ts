/**
 * venueMapData.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * All static data for the Interactive Event Venue Map.
 * Coordinate space: SVG viewBox 0 0 1200 780
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type MarkerType = 'room' | 'booth' | 'sponsor' | 'service' | 'food' | 'networking' | 'exit';
export type ZoneType = 'hall' | 'session' | 'exhibition' | 'service' | 'catering' | 'networking' | 'lobby' | 'corridor';

export interface VenueZone {
    id: string;
    label: string;
    type: ZoneType;
    x: number; y: number; w: number; h: number;
    rx?: number;
    sublabel?: string;
    isLive?: boolean;
}

export interface VenueMarker {
    id: string;
    label: string;
    shortLabel?: string;
    type: MarkerType;
    x: number;
    y: number;
    isLive?: boolean;
    detail: MarkerDetail;
}

export interface MarkerDetail {
    title: string;
    subtitle: string;
    description: string;
    capacity?: number;
    currentSession?: string;
    speaker?: string;
    time?: string;
    tags: string[];
    contact?: string;
    logo?: string;      // emoji fallback
}

// ── Zone layout (floor plan rectangles) ──────────────────────────────────────

export const VENUE_ZONES: VenueZone[] = [
    // ── TOP STRIP ─────────────────────────────────────────────────────────────
    {
        id: 'z_lobby',
        label: 'Lobby & Registration',
        sublabel: 'Check-in · Badges · Information',
        type: 'lobby',
        x: 10, y: 10, w: 560, h: 72,
    },
    {
        id: 'z_sky_lounge',
        label: 'Sky Lounge',
        sublabel: 'Rooftop Networking',
        type: 'networking',
        x: 580, y: 10, w: 610, h: 72,
    },

    // ── LEFT COLUMN ───────────────────────────────────────────────────────────
    {
        id: 'z_main_hall',
        label: 'Main Hall',
        sublabel: 'Keynote Theatre · 500 seats',
        type: 'hall',
        x: 10, y: 92, w: 275, h: 298,
        isLive: false,
    },

    // ── CENTER COLUMN ─────────────────────────────────────────────────────────
    {
        id: 'z_ballroom_a',
        label: 'Ballroom A',
        sublabel: '250 capacity',
        type: 'session',
        x: 295, y: 92, w: 275, h: 138,
        isLive: true,
    },
    {
        id: 'z_ballroom_b',
        label: 'Ballroom B',
        sublabel: '200 capacity',
        type: 'session',
        x: 295, y: 240, w: 275, h: 150,
        isLive: true,
    },

    // ── RIGHT COLUMN ──────────────────────────────────────────────────────────
    {
        id: 'z_exhibition',
        label: 'Exhibition Hall',
        sublabel: 'Developer Booths · Sponsor Stands',
        type: 'exhibition',
        x: 580, y: 92, w: 610, h: 298,
    },

    // ── LOWER ROW ────────────────────────────────────────────────────────────
    {
        id: 'z_workshop',
        label: 'Workshop Room',
        sublabel: '100 seats',
        type: 'session',
        x: 10, y: 400, w: 195, h: 128,
        isLive: false,
    },
    {
        id: 'z_conf1',
        label: 'Conference Room 1',
        sublabel: '150 capacity',
        type: 'session',
        x: 215, y: 400, w: 175, h: 128,
        isLive: true,
    },
    {
        id: 'z_networking_lounge',
        label: 'Networking Lounge',
        sublabel: 'Smart Networking Hub',
        type: 'networking',
        x: 400, y: 400, w: 170, h: 128,
    },
    {
        id: 'z_boardroom',
        label: 'Boardroom',
        sublabel: '60 seats',
        type: 'session',
        x: 580, y: 400, w: 195, h: 128,
        isLive: true,
    },
    {
        id: 'z_vip_suite',
        label: 'VIP Suite',
        sublabel: '80 seats · By invitation',
        type: 'session',
        x: 785, y: 400, w: 195, h: 128,
    },
    {
        id: 'z_press_room',
        label: 'Press & Media Room',
        sublabel: 'Accredited press only',
        type: 'service',
        x: 990, y: 400, w: 200, h: 128,
    },

    // ── BOTTOM STRIP ─────────────────────────────────────────────────────────
    {
        id: 'z_restaurant',
        label: 'Restaurant & Catering Floor',
        sublabel: 'Lunch · Coffee Stations · Networking Lunch 12:00–13:00',
        type: 'catering',
        x: 10, y: 542, w: 1180, h: 136,
    },

    // ── CORRIDORS ────────────────────────────────────────────────────────────
    {
        id: 'z_corridor_h',
        label: '',
        type: 'corridor',
        x: 10, y: 388, w: 1180, h: 12,
    },
];

// ── Marker data (clickable pins) ──────────────────────────────────────────────

export const VENUE_MARKERS: VenueMarker[] = [

    // ── SESSION ROOMS ─────────────────────────────────────────────────────────

    {
        id: 'm_main_hall',
        label: 'Main Hall', shortLabel: 'MH',
        type: 'room',
        x: 147, y: 205,
        isLive: false,
        detail: {
            title: 'Main Hall',
            subtitle: 'Keynote Theatre · 500 seats',
            description: 'The primary keynote venue for the Opening Ceremony and Flagship Panel. Professional AV setup with live streaming capability.',
            capacity: 500,
            currentSession: 'Opening Keynote (Completed)',
            speaker: 'H.E. Mohammed Al-Rashid',
            time: '09:00–09:45',
            tags: ['Keynote', 'Flagship', 'Live Stream'],
            logo: '🎭',
        },
    },
    {
        id: 'm_ballroom_a',
        label: 'Ballroom A', shortLabel: 'BA',
        type: 'room',
        x: 432, y: 155,
        isLive: true,
        detail: {
            title: 'Ballroom A',
            subtitle: '250 seats · NOW LIVE',
            description: 'Premium session venue for high-profile speaker panels and investment briefings.',
            capacity: 250,
            currentSession: 'Luxury Trends 2026',
            speaker: 'Sophie Laurent',
            time: '10:00–10:45',
            tags: ['Luxury', 'Panel', 'Live Now'],
            logo: '🎤',
        },
    },
    {
        id: 'm_ballroom_b',
        label: 'Ballroom B', shortLabel: 'BB',
        type: 'room',
        x: 432, y: 308,
        isLive: true,
        detail: {
            title: 'Ballroom B',
            subtitle: '200 seats · NOW LIVE',
            description: 'Large format session room for market briefings and data-driven presentations.',
            capacity: 200,
            currentSession: 'GCC Real Estate Outlook',
            speaker: 'Layla Al-Rashid',
            time: '10:00–10:45',
            tags: ['GCC', 'Market Data', 'Live Now'],
            logo: '📊',
        },
    },
    {
        id: 'm_workshop',
        label: 'Workshop Room', shortLabel: 'WS',
        type: 'room',
        x: 107, y: 462,
        isLive: false,
        detail: {
            title: 'Workshop Room',
            subtitle: '100 seats · Interactive',
            description: 'Hands-on workshop venue with round tables, whiteboards, and collaborative seating.',
            capacity: 100,
            currentSession: 'Next: Agent Commission Models (10:00)',
            speaker: 'Priya Nair',
            time: '10:00–10:45',
            tags: ['Workshop', 'Finance', 'Interactive'],
            logo: '🛠',
        },
    },
    {
        id: 'm_conf1',
        label: 'Conference Room 1', shortLabel: 'C1',
        type: 'room',
        x: 302, y: 462,
        isLive: true,
        detail: {
            title: 'Conference Room 1',
            subtitle: '150 seats · NOW LIVE',
            description: 'Mid-size session room for focused briefings and smaller audience sessions.',
            capacity: 150,
            currentSession: 'ESG in Real Estate',
            speaker: 'Ahmed Bin Khalifa',
            time: '11:00–11:45',
            tags: ['ESG', 'Panel', 'Live Now'],
            logo: '🌿',
        },
    },
    {
        id: 'm_boardroom',
        label: 'Boardroom', shortLabel: 'BR',
        type: 'room',
        x: 677, y: 462,
        isLive: true,
        detail: {
            title: 'Boardroom',
            subtitle: '60 seats · NOW LIVE',
            description: 'Executive boardroom with premium furnishings for intimate investor briefings.',
            capacity: 60,
            currentSession: 'Asian Investor Briefing',
            speaker: 'Zhang Wei',
            time: '11:00–11:45',
            tags: ['Asia', 'Institutional', 'Live Now'],
            logo: '🌏',
        },
    },
    {
        id: 'm_vip_suite',
        label: 'VIP Suite', shortLabel: 'VIP',
        type: 'room',
        x: 882, y: 462,
        detail: {
            title: 'VIP Suite',
            subtitle: '80 seats · By invitation only',
            description: 'Exclusive closed-door briefing room for UHNW guests and sovereign fund managers.',
            capacity: 80,
            currentSession: 'Next: UHNW Investment Strategies (13:00)',
            time: '13:00–13:45',
            speaker: 'Ahmed Bin Khalifa',
            tags: ['UHNW', 'Private', 'Invitation Only'],
            logo: '👑',
        },
    },

    // ── NETWORKING SPACES ─────────────────────────────────────────────────────

    {
        id: 'm_net_lounge',
        label: 'Networking Lounge', shortLabel: 'NL',
        type: 'networking',
        x: 485, y: 462,
        detail: {
            title: 'Networking Lounge',
            subtitle: 'Smart Networking Hub',
            description: 'Dedicated space for PSI Smart Networking — curated meeting tables, AI-matched introductions, and structured speed-networking sessions.',
            tags: ['Networking', 'AI Matching', 'Meet & Greet'],
            logo: '🤝',
        },
    },
    {
        id: 'm_sky_lounge',
        label: 'Sky Lounge', shortLabel: 'SL',
        type: 'networking',
        x: 885, y: 46,
        detail: {
            title: 'Sky Lounge',
            subtitle: 'Rooftop Networking & Cocktails',
            description: 'Covered rooftop terrace with panoramic views. Hosts the Pre-Event Breakfast (08:00) and Closing Drinks Reception (17:00).',
            time: '17:00–18:30',
            tags: ['Networking', 'Cocktails', 'Rooftop'],
            logo: '🌇',
        },
    },

    // ── PSI & SPONSOR BOOTHS ─────────────────────────────────────────────────

    {
        id: 'm_psi_booth',
        label: 'PSI Booth', shortLabel: 'PSI',
        type: 'booth',
        x: 685, y: 170,
        detail: {
            title: 'PSI — Property Shop Investment',
            subtitle: 'Main Organizer Booth · Stand A1',
            description: 'PSI\'s main presence at the show. Meet our senior brokers, explore the latest off-plan launches, and schedule a 1-to-1 consultation.',
            tags: ['Agent Consultation', 'Off-Plan', 'CRM Access'],
            contact: '+971 4 XXX XXXX',
            logo: '🏢',
        },
    },
    {
        id: 'm_emaar_booth',
        label: 'Emaar Properties', shortLabel: 'EMA',
        type: 'sponsor',
        x: 780, y: 150,
        detail: {
            title: 'Emaar Properties',
            subtitle: 'Gold Sponsor · Stand A2',
            description: 'Presenting Vida Residences Dubai Marina, address Downtown, and the upcoming Beach Isle — exclusive agent pricing available.',
            tags: ['Developer', 'Gold Sponsor', 'Dubai Marina'],
            contact: 'emaar-agents@emaar.ae',
            logo: '🏙',
        },
    },
    {
        id: 'm_aldar_booth',
        label: 'Aldar Properties', shortLabel: 'ALD',
        type: 'sponsor',
        x: 880, y: 170,
        detail: {
            title: 'Aldar Properties',
            subtitle: 'Platinum Sponsor · Stand A3',
            description: 'Showcasing Mamsha Gardens, Yas Beach Residences, and the new Saadiyat Lagoons collection. Agent registration desk on-site.',
            tags: ['Developer', 'Platinum Sponsor', 'Abu Dhabi'],
            contact: 'partners@aldar.com',
            logo: '🕌',
        },
    },
    {
        id: 'm_cbre_booth',
        label: 'CBRE Gulf', shortLabel: 'CBR',
        type: 'booth',
        x: 980, y: 150,
        detail: {
            title: 'CBRE Gulf',
            subtitle: 'Advisory Partner · Stand B1',
            description: 'GCC market research, investment advisory, and institutional sales team available for consultations. Latest H1 2026 market reports available.',
            tags: ['Advisory', 'Market Research', 'Institutional'],
            contact: 'gulfinvestments@cbre.com',
            logo: '📊',
        },
    },
    {
        id: 'm_jll_booth',
        label: 'JLL Middle East', shortLabel: 'JLL',
        type: 'booth',
        x: 680, y: 280,
        detail: {
            title: 'JLL Middle East',
            subtitle: 'Advisory Partner · Stand B2',
            description: 'Transaction advisory, asset management, and capital markets team. Specializing in large-ticket institutional transactions.',
            tags: ['Transactions', 'Advisory', 'Institutional'],
            contact: 'me.capital@jll.com',
            logo: '🏦',
        },
    },
    {
        id: 'm_enbd_booth',
        label: 'Emirates NBD', shortLabel: 'NBD',
        type: 'sponsor',
        x: 790, y: 270,
        detail: {
            title: 'Emirates NBD Private Banking',
            subtitle: 'Banking Partner · Stand B3',
            description: 'Pre-approval for international mortgages, NRI investment structures, and private banking services. Bring your passport for on-site assessment.',
            tags: ['Mortgage', 'Private Banking', 'NRI'],
            contact: 'privatebanking@emiratesnbd.com',
            logo: '🏦',
        },
    },
    {
        id: 'm_proptech_booth',
        label: 'PropTech Zone', shortLabel: 'PT',
        type: 'booth',
        x: 900, y: 270,
        detail: {
            title: 'PropTech Startup Zone',
            subtitle: '6 Startups · Stand Zone C',
            description: 'Six UAE-based proptech startups showcasing AI valuation tools, virtual property tours, tokenisation platforms, and smart CRM systems.',
            tags: ['PropTech', 'AI', 'Startups', 'Demo'],
            logo: '🔬',
        },
    },
    {
        id: 'm_lisbon_booth',
        label: 'Lisbon Capital Partners', shortLabel: 'LCP',
        type: 'booth',
        x: 1000, y: 270,
        detail: {
            title: 'Lisbon Capital Partners',
            subtitle: 'Investment Fund · Stand B5',
            description: 'European family office and institutional investor connecting with UAE developers. Focus on Golden Visa investment structures and portfolio diversification.',
            tags: ['Investment', 'Golden Visa', 'Europe'],
            logo: '💼',
        },
    },

    // ── SERVICE MARKERS ──────────────────────────────────────────────────────

    {
        id: 'm_registration',
        label: 'Registration', shortLabel: 'REG',
        type: 'service',
        x: 140, y: 46,
        detail: {
            title: 'Registration & Badge Collection',
            subtitle: 'Main entrance · Open 07:30–17:00',
            description: 'Collect your delegate badge, event lanyard, and welcome kit. QR code check-in via PSI app accepted. Walk-in registration available.',
            tags: ['Check-in', 'Badges', 'Welcome Kit'],
            logo: '🎟',
        },
    },
    {
        id: 'm_info_desk',
        label: 'Info Desk', shortLabel: 'ℹ',
        type: 'service',
        x: 310, y: 46,
        detail: {
            title: 'Information Desk',
            subtitle: 'Central Lobby · staffed 08:00–18:00',
            description: 'Maps, schedules, lost & found, accessibility assistance, and general venue enquiries. Multilingual staff available.',
            tags: ['Information', 'Maps', 'Assistance'],
            logo: 'ℹ️',
        },
    },
    {
        id: 'm_first_aid',
        label: 'First Aid', shortLabel: '+',
        type: 'service',
        x: 480, y: 46,
        detail: {
            title: 'First Aid Station',
            subtitle: 'Lobby corridor · staffed throughout',
            description: 'Qualified first-aiders on duty for the full duration of the event. Defibrillator and basic medical supplies available.',
            tags: ['Medical', 'First Aid', 'Emergency'],
            logo: '🏥',
        },
    },
    {
        id: 'm_press_room',
        label: 'Press Room', shortLabel: 'PR',
        type: 'service',
        x: 1090, y: 462,
        detail: {
            title: 'Press & Media Room',
            subtitle: 'Accredited press only',
            description: 'Dedicated press lounge with high-speed Wi-Fi, video editing suites, and embargo document distribution. Media credentials required.',
            tags: ['Press', 'Media', 'Accredited Only'],
            logo: '📸',
        },
    },
    {
        id: 'm_prayer',
        label: 'Prayer Room', shortLabel: '🕌',
        type: 'service',
        x: 1090, y: 46,
        detail: {
            title: 'Prayer Room',
            subtitle: 'Level 1 · Quiet Zone',
            description: 'Multi-faith quiet room available throughout the event. Prayer times posted on the door. Ablution facilities adjacent.',
            tags: ['Prayer', 'Quiet Zone', 'Multi-faith'],
            logo: '🕌',
        },
    },

    // ── FOOD & BEVERAGE ──────────────────────────────────────────────────────

    {
        id: 'm_restaurant',
        label: 'Restaurant', shortLabel: '🍽',
        type: 'food',
        x: 350, y: 608,
        detail: {
            title: 'Restaurant & Catering Floor',
            subtitle: 'Open all day · Networking Lunch 12:00–13:00',
            description: 'Full-service restaurant offering international cuisine. Complimentary lunch included with delegate pass. Halal and vegetarian options available.',
            time: '12:00–13:00',
            tags: ['Lunch', 'Networking', 'Halal', 'Vegetarian'],
            logo: '🍽',
        },
    },
    {
        id: 'm_coffee_west',
        label: 'Coffee Bar West', shortLabel: '☕',
        type: 'food',
        x: 120, y: 608,
        detail: {
            title: 'Coffee Bar — West',
            subtitle: 'Open 08:00–17:00',
            description: 'Specialty coffee, tea, and refreshments. Popular meeting spot between sessions.',
            tags: ['Coffee', 'Refreshments', 'Meeting Point'],
            logo: '☕',
        },
    },
    {
        id: 'm_coffee_east',
        label: 'Coffee Bar East', shortLabel: '☕',
        type: 'food',
        x: 1080, y: 608,
        detail: {
            title: 'Coffee Bar — East',
            subtitle: 'Open 08:00–17:00',
            description: 'Specialty coffee, cold brew, and light snacks. Adjacent to the Exhibition Hall.',
            tags: ['Coffee', 'Refreshments', 'Snacks'],
            logo: '☕',
        },
    },

    // ── EXIT MARKERS ─────────────────────────────────────────────────────────

    { id: 'm_exit_main', label: 'Main Exit', shortLabel: '↩', type: 'exit', x: 295, y: 390, detail: { title: 'Main Exit / Entrance', subtitle: '', description: 'Primary entry and exit point. Taxi rank and valet service outside.', tags: ['Exit', 'Taxi', 'Valet'], logo: '🚪' } },
    { id: 'm_exit_east', label: 'East Exit', shortLabel: '↩', type: 'exit', x: 1185, y: 390, detail: { title: 'East Emergency Exit', subtitle: '', description: 'Emergency evacuation route. Do not use unless instructed by staff.', tags: ['Exit', 'Emergency'], logo: '🚪' } },
];

// ── Zone color maps ───────────────────────────────────────────────────────────

export const ZONE_COLORS: Record<ZoneType, { fill: string; stroke: string; text: string }> = {
    hall: { fill: '#0f3a2e', stroke: '#10b981', text: '#34d399' },
    session: { fill: '#1e1b4b', stroke: '#6366f1', text: '#a5b4fc' },
    exhibition: { fill: '#1c1917', stroke: '#d97706', text: '#fbbf24' },
    service: { fill: '#172030', stroke: '#475569', text: '#94a3b8' },
    catering: { fill: '#132a2a', stroke: '#0d9488', text: '#5eead4' },
    networking: { fill: '#1e1040', stroke: '#8b5cf6', text: '#c4b5fd' },
    lobby: { fill: '#0f172a', stroke: '#334155', text: '#94a3b8' },
    corridor: { fill: '#0b1120', stroke: 'none', text: '#334155' },
};

export const MARKER_COLORS: Record<MarkerType, { bg: string; ring: string; text: string; pulse?: string }> = {
    room: { bg: '#6366f1', ring: '#818cf8', text: '#fff', pulse: '#6366f1' },
    booth: { bg: '#d97706', ring: '#f59e0b', text: '#fff' },
    sponsor: { bg: '#10b981', ring: '#34d399', text: '#fff', pulse: '#10b981' },
    service: { bg: '#475569', ring: '#64748b', text: '#fff' },
    food: { bg: '#0d9488', ring: '#14b8a6', text: '#fff' },
    networking: { bg: '#8b5cf6', ring: '#a78bfa', text: '#fff', pulse: '#8b5cf6' },
    exit: { bg: '#dc2626', ring: '#ef4444', text: '#fff' },
};

export const MARKER_TYPE_LABELS: Record<MarkerType, string> = {
    room: 'Session Room',
    booth: 'Exhibitor Booth',
    sponsor: 'Sponsor Stand',
    service: 'Service Point',
    food: 'Food & Beverage',
    networking: 'Networking Space',
    exit: 'Exit / Entrance',
};

// ── User position (simulated "You Are Here") ──────────────────────────────────
export const USER_POSITION = { x: 200, y: 46 };
