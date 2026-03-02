/**
 * marketplaceData.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * All static data for the Sponsor & Exhibitor Marketplace.
 * Production swap: replace arrays with Firestore collections.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type ExhibitorTier = 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'Exhibitor';
export type ExhibitorCategory = 'Developer' | 'Advisory' | 'Banking' | 'PropTech' | 'Investment' | 'Media' | 'Legal';

export interface Product {
    id: string;
    name: string;
    type: string;
    description: string;
    highlights: string[];
    priceNote?: string;
    demoAvailable: boolean;
    imageEmoji: string;
}

export interface Document {
    id: string;
    name: string;
    type: 'Brochure' | 'Factsheet' | 'Report' | 'Prospectus' | 'Presentation';
    sizeLabel: string;
    downloads: number;
    emoji: string;
}

export interface SessionLink {
    sessionName: string;
    room: string;
    time: string;
}

export interface ExhibitorAnalytics {
    profileViews: number;
    contactRequests: number;
    demoBookings: number;
    documentDownloads: number;
    meetingsScheduled: number;
}

export interface Exhibitor {
    id: string;
    name: string;
    tagline: string;
    description: string;
    logo: string;           // emoji fallback
    tier: ExhibitorTier;
    category: ExhibitorCategory;
    standNumber: string;
    website: string;
    email: string;
    phone: string;
    country: string;
    isFeatured: boolean;
    isVisible: boolean;
    isLive: boolean;        // currently at stand
    tags: string[];
    products: Product[];
    documents: Document[];
    sessions: SessionLink[];
    analytics: ExhibitorAnalytics;
    keyContact: { name: string; title: string; avatar: string };
    color: string;          // CSS gradient
    boothSlot?: string;     // time for demo/meeting slots
    availableSlots: string[];
}

// ── Tier styling ──────────────────────────────────────────────────────────────

export const TIER_STYLES: Record<ExhibitorTier, {
    bg: string; text: string; border: string; badge: string; glow: string;
}> = {
    Platinum: {
        bg: 'bg-violet-900/30', text: 'text-violet-300', border: 'border-violet-600/50',
        badge: 'bg-violet-700 text-white', glow: 'shadow-violet-900/30',
    },
    Gold: {
        bg: 'bg-amber-900/20', text: 'text-amber-300', border: 'border-amber-600/40',
        badge: 'bg-amber-600 text-white', glow: 'shadow-amber-900/30',
    },
    Silver: {
        bg: 'bg-slate-800/60', text: 'text-slate-300', border: 'border-slate-600/50',
        badge: 'bg-slate-500 text-white', glow: 'shadow-slate-900/40',
    },
    Bronze: {
        bg: 'bg-orange-900/20', text: 'text-orange-300', border: 'border-orange-700/30',
        badge: 'bg-orange-700 text-white', glow: 'shadow-orange-900/30',
    },
    Exhibitor: {
        bg: 'bg-slate-900/40', text: 'text-slate-400', border: 'border-slate-700/40',
        badge: 'bg-slate-700 text-slate-300', glow: '',
    },
};

// ── Category styling ──────────────────────────────────────────────────────────

export const CAT_COLORS: Record<ExhibitorCategory, string> = {
    Developer: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    Advisory: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    Banking: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    PropTech: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    Investment: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    Media: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
    Legal: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
};

// ── Exhibitor catalogue ───────────────────────────────────────────────────────

export const EXHIBITORS: Exhibitor[] = [
    {
        id: 'e_psi',
        name: 'PSI — Property Shop Investment',
        tagline: 'UAE\'s Premier Real Estate Agency',
        description: 'Property Shop Investment (PSI) is the leading real estate agency in UAE, with over 1,200 brokers across 8 offices. We specialise in off-plan luxury developments, UHNW portfolio management, and global roadshow events connecting international investors with the UAE\'s finest properties.',
        logo: '🏢', tier: 'Platinum', category: 'Advisory',
        standNumber: 'A1', website: 'www.propertyshopdubai.com',
        email: 'invest@psi.ae', phone: '+971 4 800 4000',
        country: 'UAE', isFeatured: true, isVisible: true, isLive: true,
        tags: ['Off-Plan', 'Luxury', 'UHNW', 'Investment'],
        color: 'from-violet-900 to-slate-900',
        products: [
            { id: 'pp1', name: 'PSI Broker Consultation', type: 'Service', description: 'One-on-one session with a senior broker to align your portfolio ambitions with the best UAE opportunities.', highlights: ['Portfolio analysis', 'Shortlisted properties', 'ROI projections', 'Golden Visa assessment'], demoAvailable: true, imageEmoji: '👔' },
            { id: 'pp2', name: 'PSI Off-Plan Catalogue 2026', type: 'Portfolio', description: 'Curated selection of the top 30 off-plan launches tracked by PSI for 2026, with independent yield analysis.', highlights: ['30 vetted projects', 'Yield data', 'Payment plan comparison', 'Developer ratings'], demoAvailable: false, imageEmoji: '📋' },
            { id: 'pp3', name: 'PSI Investor CRM Access', type: 'Technology', description: 'Exclusive portal access for high-ticket investors — track your portfolio, manage documents, and get live market signals.', highlights: ['Live market data', 'Portfolio dashboard', 'Document vault', 'Broker chat'], demoAvailable: true, imageEmoji: '💻' },
        ],
        documents: [
            { id: 'pd1', name: 'PSI Company Profile 2026', type: 'Brochure', sizeLabel: '4.2 MB', downloads: 892, emoji: '📄' },
            { id: 'pd2', name: 'Off-Plan Market Report H1 2026', type: 'Report', sizeLabel: '8.7 MB', downloads: 1241, emoji: '📊' },
            { id: 'pd3', name: 'UAE Investor Visa Guide', type: 'Factsheet', sizeLabel: '1.1 MB', downloads: 543, emoji: '🪪' },
        ],
        sessions: [
            { sessionName: 'Luxury Trends 2026', room: 'Ballroom A', time: '10:00' },
        ],
        analytics: { profileViews: 1842, contactRequests: 147, demoBookings: 63, documentDownloads: 2676, meetingsScheduled: 89 },
        keyContact: { name: 'Sarah Al-Hamdan', title: 'Head of International Sales', avatar: '👩‍💼' },
        availableSlots: ['10:30', '11:00', '11:30', '13:00', '14:00', '14:30', '15:00', '15:30'],
    },
    {
        id: 'e_emaar',
        name: 'Emaar Properties',
        tagline: 'Shaping Skylines, Creating Communities',
        description: 'Emaar Properties is one of the world\'s most valuable and admired real estate development companies. With a proven track record in premium real estate, shopping malls & retail and hospitality & leisure. Emaar shapes new lifestyles with a focus on design excellence, build quality and timely delivery.',
        logo: '🏙', tier: 'Platinum', category: 'Developer',
        standNumber: 'A2', website: 'www.emaar.com',
        email: 'emaar-agents@emaar.ae', phone: '+971 4 888 8888',
        country: 'UAE', isFeatured: true, isVisible: true, isLive: true,
        tags: ['Dubai Marina', 'Downtown', 'Beachfront', 'Premium'],
        color: 'from-amber-900 to-slate-900',
        products: [
            { id: 'em1', name: 'Vida Residences Dubai Marina', type: 'Off-Plan Development', description: 'Boutique branded residences in the heart of Dubai Marina. Studio to 3BR with full marina view and hotel-service amenities.', highlights: ['Marina views', 'Hotel services', 'Q3 2027 completion', 'Starting AED 1.8M'], priceNote: 'From AED 1,800,000', demoAvailable: true, imageEmoji: '🌊' },
            { id: 'em2', name: 'Address Downtown Residences', type: 'Off-Plan Development', description: 'Super-luxury furnished apartments steps from Burj Khalifa. Fully managed hotel serviced units with guaranteed occupancy.', highlights: ['Burj Khalifa view', 'Furnished', 'Managed returns', 'Starting AED 3.2M'], priceNote: 'From AED 3,200,000', demoAvailable: true, imageEmoji: '🏙' },
            { id: 'em3', name: 'Beach Isle — Dubai Creek', type: 'Off-Plan Development', description: 'Exclusive island living with private beach access. The newest Emaar waterfront launch for 2026.', highlights: ['Private beach', 'Island living', '2028 completion', 'Agent incentives'], priceNote: 'From AED 2,400,000', demoAvailable: false, imageEmoji: '🏖' },
            { id: 'em4', name: 'Emaar Agent Partner Programme', type: 'Partnership', description: 'Join 4,000+ registered Emaar agents. Access off-plan pre-launches, direct developer pricing, and competitive commission structures.', highlights: ['Pre-launch access', '4% commission', 'Training', 'Co-marketing'], demoAvailable: true, imageEmoji: '🤝' },
        ],
        documents: [
            { id: 'ed1', name: 'Emaar Projects Catalogue 2026', type: 'Brochure', sizeLabel: '12.4 MB', downloads: 2103, emoji: '📚' },
            { id: 'ed2', name: 'Vida Residences Factsheet', type: 'Factsheet', sizeLabel: '3.1 MB', downloads: 867, emoji: '📄' },
            { id: 'ed3', name: 'Emaar Investment Prospectus', type: 'Prospectus', sizeLabel: '7.8 MB', downloads: 1432, emoji: '📊' },
        ],
        sessions: [{ sessionName: 'Luxury Trends 2026', room: 'Ballroom A', time: '10:00' }],
        analytics: { profileViews: 2341, contactRequests: 218, demoBookings: 91, documentDownloads: 4402, meetingsScheduled: 124 },
        keyContact: { name: 'James Richardson', title: 'Director of Agent Relations', avatar: '👨‍💼' },
        availableSlots: ['10:00', '11:00', '12:00', '13:30', '14:00', '15:00', '16:00'],
    },
    {
        id: 'e_aldar',
        name: 'Aldar Properties',
        tagline: 'Abu Dhabi\'s Landmark Developer',
        description: 'Aldar Properties is the leading real estate developer, manager and investor in Abu Dhabi, UAE. Aldar develops and manages a diverse portfolio of retail, residential, commercial, and hospitality assets across UAE and internationally. The company is committed to sustainable development of communities and places.',
        logo: '🕌', tier: 'Platinum', category: 'Developer',
        standNumber: 'A3', website: 'www.aldar.com',
        email: 'partners@aldar.com', phone: '+971 2 810 5555',
        country: 'UAE', isFeatured: true, isVisible: true, isLive: false,
        tags: ['Saadiyat', 'Yas Island', 'Abu Dhabi', 'Sustainable'],
        color: 'from-emerald-900 to-slate-900',
        products: [
            { id: 'al1', name: 'Mamsha Gardens — Saadiyat', type: 'Off-Plan Development', description: 'Curated beachfront living on Saadiyat Island, Abu Dhabi. Close to the Louvre Abu Dhabi and Guggenheim.', highlights: ['Beachfront', 'Cultural district', 'Smart home tech', 'From AED 1.5M'], priceNote: 'From AED 1,500,000', demoAvailable: true, imageEmoji: '🌴' },
            { id: 'al2', name: 'Yas Beach Residences', type: 'Off-Plan Development', description: 'Resort-style living on Yas Island with access to Ferrari World, Warner Bros, and the F1 Circuit.', highlights: ['Yas Island', 'Resort amenities', 'F1 Circuit views', 'from AED 1.1M'], priceNote: 'From AED 1,100,000', demoAvailable: true, imageEmoji: '🏎' },
            { id: 'al3', name: 'Saadiyat Lagoons', type: 'Off-Plan Development', description: 'New eco-luxury villas set within a mangrove ecosystem. UAE\'s most sustainable residential community.', highlights: ['Mangrove views', 'Eco-certified', 'Villas from AED 5M', 'LEED Platinum target'], priceNote: 'From AED 5,000,000', demoAvailable: false, imageEmoji: '🌿' },
        ],
        documents: [
            { id: 'ald1', name: 'Aldar Portfolio Overview 2026', type: 'Brochure', sizeLabel: '9.6 MB', downloads: 1580, emoji: '📓' },
            { id: 'ald2', name: 'Saadiyat Lagoons Prospectus', type: 'Prospectus', sizeLabel: '5.2 MB', downloads: 934, emoji: '🌿' },
        ],
        sessions: [{ sessionName: 'ESG in Real Estate', room: 'Conference Room 1', time: '11:00' }],
        analytics: { profileViews: 1720, contactRequests: 163, demoBookings: 74, documentDownloads: 2514, meetingsScheduled: 97 },
        keyContact: { name: 'Fatima Al-Mansoori', title: 'Senior Investment Advisor', avatar: '👩‍💼' },
        availableSlots: ['09:30', '10:30', '11:30', '13:00', '14:30', '15:30'],
    },
    {
        id: 'e_enbd',
        name: 'Emirates NBD Private Banking',
        tagline: 'Financing Your Real Estate Vision',
        description: 'Emirates NBD Private Banking offers bespoke mortgage and investment structures for UHNW and institutional clients. Our specialist real estate desk provides pre-approval in 24 hours, competitive LTV ratios, and NRI-compliant structures for international investors.',
        logo: '🏦', tier: 'Gold', category: 'Banking',
        standNumber: 'B3', website: 'www.emiratesnbd.com',
        email: 'privatebanking@emiratesnbd.com', phone: '+971 4 316 0316',
        country: 'UAE', isFeatured: false, isVisible: true, isLive: true,
        tags: ['Mortgage', 'NRI', 'Private Banking', 'Pre-Approval'],
        color: 'from-sky-900 to-slate-900',
        products: [
            { id: 'nb1', name: 'Non-Resident Mortgage', type: 'Financial Product', description: 'Up to 75% LTV financing for non-resident property buyers. Approval in 24hrs with digital documentation.', highlights: ['75% LTV', 'Multi-currency', '24h approval', 'Fixed/Variable rates'], priceNote: 'From 4.49% p.a.', demoAvailable: true, imageEmoji: '🏠' },
            { id: 'nb2', name: 'NRI Investment Structure', type: 'Financial Product', description: 'FEMA-compliant investment routing for Indian residents. Repatriation-ready structure with tax optimisation.', highlights: ['FEMA compliant', 'Repatriation ready', 'NRI-dedicated desk', 'Legal support'], demoAvailable: true, imageEmoji: '🇮🇳' },
            { id: 'nb3', name: 'Portfolio Leverage Programme', type: 'Financial Product', description: 'Deploy liquidity against existing real estate assets. Restructure for maximum yield optimisation.', highlights: ['Up to 60% LTV', 'Multiple assets', 'Flexible drawdown', 'Private wealth team'], demoAvailable: false, imageEmoji: '📈' },
        ],
        documents: [
            { id: 'nbd1', name: 'Mortgage Product Guide', type: 'Factsheet', sizeLabel: '2.3 MB', downloads: 743, emoji: '🏡' },
            { id: 'nbd2', name: 'NRI Investment Guide', type: 'Brochure', sizeLabel: '3.8 MB', downloads: 612, emoji: '🌐' },
        ],
        sessions: [],
        analytics: { profileViews: 1120, contactRequests: 98, demoBookings: 52, documentDownloads: 1355, meetingsScheduled: 67 },
        keyContact: { name: 'Rajan Kapoor', title: 'Head of NRI Real Estate Desk', avatar: '👨‍💼' },
        availableSlots: ['09:00', '09:30', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'],
    },
    {
        id: 'e_cbre',
        name: 'CBRE Gulf',
        tagline: 'Market Intelligence. Investment Advisory.',
        description: 'CBRE Group is the world\'s largest commercial real estate services and investment firm. Our Gulf team provides market research, valuations, investment advisory, and institutional transaction services across the UAE, KSA, Qatar, and Bahrain.',
        logo: '📊', tier: 'Gold', category: 'Advisory',
        standNumber: 'B1', website: 'www.cbre.ae',
        email: 'gulfinvestments@cbre.com', phone: '+971 4 371 4600',
        country: 'UAE', isFeatured: false, isVisible: true, isLive: true,
        tags: ['Advisory', 'Research', 'Valuation', 'Institutional'],
        color: 'from-blue-900 to-slate-900',
        products: [
            { id: 'cb1', name: 'GCC Market Intelligence Report', type: 'Research', description: 'Bi-annual comprehensive analysis of GCC residential and commercial markets with 5-year forecasts.', highlights: ['5-year forecast', 'Yield matrices', 'Cross-border flows', '200+ pages'], demoAvailable: false, imageEmoji: '📑' },
            { id: 'cb2', name: 'Investment Advisory Services', type: 'Service', description: 'Bespoke advisory for institutional investors entering the GCC market. DCF modelling, stress-testing and regulatory mapping.', highlights: ['DCF modelling', 'Stress testing', 'Regulatory guide', 'On-desk support'], demoAvailable: true, imageEmoji: '🔍' },
        ],
        documents: [
            { id: 'cbre1', name: 'GCC Market Outlook H1 2026', type: 'Report', sizeLabel: '14.2 MB', downloads: 1874, emoji: '📊' },
            { id: 'cbre2', name: 'Dubai Office Market Snapshot', type: 'Factsheet', sizeLabel: '2.1 MB', downloads: 542, emoji: '🏢' },
        ],
        sessions: [{ sessionName: 'GCC Real Estate Outlook', room: 'Ballroom B', time: '10:00' }],
        analytics: { profileViews: 987, contactRequests: 84, demoBookings: 38, documentDownloads: 2416, meetingsScheduled: 53 },
        keyContact: { name: 'Matthew Clarke', title: 'Head of Research, Gulf', avatar: '👨‍💼' },
        availableSlots: ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00'],
    },
    {
        id: 'e_jll',
        name: 'JLL Middle East',
        tagline: 'Transactions. Advisory. Asset Management.',
        description: 'JLL is a Fortune 200 company specialising in real estate and investment management. Our Middle East team handles large-ticket transactions, core-plus acquisition strategies, and active asset management for institutional clients across the GCC.',
        logo: '🏦', tier: 'Gold', category: 'Advisory',
        standNumber: 'B2', website: 'www.jll.ae',
        email: 'me.capital@jll.com', phone: '+971 4 426 6999',
        country: 'UAE', isFeatured: false, isVisible: true, isLive: false,
        tags: ['Transactions', 'Asset Management', 'Capital Markets'],
        color: 'from-rose-900 to-slate-900',
        products: [
            { id: 'jl1', name: 'Capital Markets Desk', type: 'Service', description: 'End-to-end transaction advisory for large-ticket commercial and residential portfolio deals in the GCC.', highlights: ['$1B+ track record', 'Cross-border', 'Full legal support', 'Investor matching'], demoAvailable: true, imageEmoji: '💰' },
            { id: 'jl2', name: 'Active Asset Management', type: 'Service', description: 'Performance management for institutional real estate portfolios. Targeting 200bps+ above benchmark.', highlights: ['200bps above benchmark', 'Quarterly reporting', 'ESG integration', 'Tenant management'], demoAvailable: false, imageEmoji: '📈' },
        ],
        documents: [
            { id: 'jll1', name: 'JLL ME Transaction Report 2025', type: 'Report', sizeLabel: '6.3 MB', downloads: 891, emoji: '📋' },
        ],
        sessions: [],
        analytics: { profileViews: 876, contactRequests: 71, demoBookings: 29, documentDownloads: 891, meetingsScheduled: 45 },
        keyContact: { name: 'Claire Beaumont', title: 'Capital Markets Director', avatar: '👩‍💼' },
        availableSlots: ['09:30', '10:30', '11:30', '13:30', '14:30', '15:30'],
    },
    {
        id: 'e_proptech',
        name: 'PropTech Innovation Zone',
        tagline: 'AI-Powered Real Estate Technology',
        description: 'A curated showcase of six UAE-based proptech startups disrupting the real estate sector. Featuring AI valuation, virtual tours, tokenisation, smart CRM, and rental yield optimisation platforms.',
        logo: '🔬', tier: 'Silver', category: 'PropTech',
        standNumber: 'C1', website: 'www.proptech.ae',
        email: 'hello@proptech.ae', phone: '+971 50 123 4567',
        country: 'UAE', isFeatured: false, isVisible: true, isLive: true,
        tags: ['AI', 'Tokenisation', 'CRM', 'Virtual Tours', 'Startups'],
        color: 'from-violet-900 to-slate-900',
        products: [
            { id: 'pt1', name: 'AI Property Valuation Engine', type: 'Technology', description: 'Real-time automated valuation model (AVM) trained on 10 years of DLD transaction data. ±3% accuracy.', highlights: ['±3% accuracy', 'Live DLD data', 'API access', 'White-label'], demoAvailable: true, imageEmoji: '🤖' },
            { id: 'pt2', name: 'Virtual Property Tour Studio', type: 'Technology', description: '360° immersive property tours with AI avatar guide and live agent call overlay.', highlights: ['360° rooms', 'AI guide', 'Live agent overlay', 'Mobile-first'], demoAvailable: true, imageEmoji: '🥽' },
            { id: 'pt3', name: 'RWA Tokenisation Platform', type: 'Technology', description: 'Fractional ownership of UAE real estate through Ethereum-based tokens. SEC and SCA compliant.', highlights: ['Fractional from AED 1K', 'SCA compliant', 'Monthly dividends', 'Secondary market'], demoAvailable: true, imageEmoji: '⛓' },
        ],
        documents: [
            { id: 'ptz1', name: 'PropTech Startup Deck 2026', type: 'Presentation', sizeLabel: '5.5 MB', downloads: 423, emoji: '🖥' },
        ],
        sessions: [],
        analytics: { profileViews: 634, contactRequests: 58, demoBookings: 47, documentDownloads: 423, meetingsScheduled: 31 },
        keyContact: { name: 'Omar Yusuf', title: 'Ecosystem Lead', avatar: '👨‍💻' },
        availableSlots: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'],
    },
    {
        id: 'e_lisbon',
        name: 'Lisbon Capital Partners',
        tagline: 'European Family Office Investing in the Gulf',
        description: 'Lisbon Capital Partners is a European family office with €2.4B AUM. We actively seek co-investment opportunities with UAE developers and institutional partners targeting 12-18% IRR in residential and mixed-use assets across the GCC.',
        logo: '💼', tier: 'Silver', category: 'Investment',
        standNumber: 'B5', website: 'www.lisboncapital.eu',
        email: 'invest@lisboncapital.eu', phone: '+351 21 123 4567',
        country: 'Portugal', isFeatured: false, isVisible: true, isLive: false,
        tags: ['Family Office', 'Co-Investment', 'Golden Visa', 'Europe'],
        color: 'from-amber-900 to-slate-900',
        products: [
            { id: 'lc1', name: 'Co-Investment Mandate', type: 'Investment Product', description: 'We provide equity co-investment alongside UAE developers on projects from AED 50M upwards. Targeting 12-18% IRR.', highlights: ['AED 50M+ tickets', '12-18% IRR target', '5-7 year horizon', 'Board seats'], demoAvailable: true, imageEmoji: '🤝' },
            { id: 'lc2', name: 'UAE Golden Visa Fund', type: 'Investment Product', description: 'Structured fund enabling European investors to qualify for the UAE 10-year Gold Visa through property acquisition.', highlights: ['AED 2M threshold', 'Full legal support', 'Golden Visa guaranteed', 'Exit in 10 years'], demoAvailable: false, imageEmoji: '🛂' },
        ],
        documents: [
            { id: 'lc1d', name: 'Lisbon Capital LP Deck', type: 'Presentation', sizeLabel: '4.1 MB', downloads: 287, emoji: '📁' },
        ],
        sessions: [],
        analytics: { profileViews: 412, contactRequests: 43, demoBookings: 18, documentDownloads: 287, meetingsScheduled: 28 },
        keyContact: { name: 'António Ferreira', title: 'Managing Partner', avatar: '👨‍💼' },
        availableSlots: ['09:00', '10:00', '11:00', '14:00', '15:00'],
    },
    {
        id: 'e_gret',
        name: 'Gulf Real Estate Times',
        tagline: 'The Authority in GCC Property Media',
        description: 'Gulf Real Estate Times is the GCC\'s leading B2B real estate publication with 340,000+ monthly readers across print and digital. We offer brand advertising, sponsored research, event coverage, and executive interview content packages for developers and advisors.',
        logo: '📰', tier: 'Bronze', category: 'Media',
        standNumber: 'D1', website: 'www.gulfretimes.com',
        email: 'advertising@gulfretimes.com', phone: '+971 4 555 1234',
        country: 'UAE', isFeatured: false, isVisible: true, isLive: false,
        tags: ['Media', 'Publishing', 'PR', 'Advertising'],
        color: 'from-pink-900 to-slate-900',
        products: [
            { id: 'gr1', name: 'Full-Page Developer Feature', type: 'Media', description: 'Premium full-page editorial feature in Gulf Real Estate Times quarterly magazine. Reach 140,000 print subscribers.', highlights: ['140K print reach', 'Editorial team', 'Photography included', '4-week production'], demoAvailable: false, imageEmoji: '🗞' },
            { id: 'gr2', name: 'Digital Sponsored Research', type: 'Media', description: 'Branded market research report distributed to our 200,000 digital subscribers and syndicated to Reuters Middle East.', highlights: ['200K digital reach', 'Reuters syndication', 'PDF + interactive', 'Leads from downloads'], demoAvailable: true, imageEmoji: '💻' },
        ],
        documents: [
            { id: 'gr1d', name: 'GRET Media Kit 2026', type: 'Brochure', sizeLabel: '3.2 MB', downloads: 198, emoji: '📄' },
        ],
        sessions: [],
        analytics: { profileViews: 298, contactRequests: 22, demoBookings: 9, documentDownloads: 198, meetingsScheduled: 12 },
        keyContact: { name: 'Hana Al-Zaabi', title: 'Advertising Director', avatar: '👩‍💼' },
        availableSlots: ['10:00', '11:00', '14:00', '15:00'],
    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export const TIERS: ExhibitorTier[] = ['Platinum', 'Gold', 'Silver', 'Bronze', 'Exhibitor'];
export const CATEGORIES: ExhibitorCategory[] = ['Developer', 'Advisory', 'Banking', 'PropTech', 'Investment', 'Media', 'Legal'];

export function getTotalAnalytics() {
    return EXHIBITORS.reduce((acc, e) => ({
        views: acc.views + e.analytics.profileViews,
        contacts: acc.contacts + e.analytics.contactRequests,
        demos: acc.demos + e.analytics.demoBookings,
        downloads: acc.downloads + e.analytics.documentDownloads,
        meetings: acc.meetings + e.analytics.meetingsScheduled,
    }), { views: 0, contacts: 0, demos: 0, downloads: 0, meetings: 0 });
}
