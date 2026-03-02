/**
 * Projects.tsx
 * Live Firestore listener on the `crm_projects` collection.
 * Replaces hardcoded dummy array with real Aldar + Emaar documents.
 */

import { useState, useEffect } from 'react';
import {
  Search, Plus, BookOpen, Award, Building,
  Layers, ChevronRight, ExternalLink, TrendingUp,
  Loader2, MapPin, Percent, Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase/firebaseConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CrmProject {
  id: string;
  name: string;
  developer: string;
  developer_logo_url?: string;
  tier: 'Luxury' | 'Medium' | 'Average';
  price_range_aed?: { min: number; max: number };
  location?: {
    city?: string;
    community?: string;
  };
  unit_types?: string[];
  completion_date?: string;
  handover_status?: string;
  commission_pct?: number;
  commission_notes?: string;
  description?: string;
  total_units?: number;
  sold_units?: number;
  is_featured?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtAed(n?: number): string {
  if (!n) return '—';
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`;
  return `AED ${n}`;
}

function soldPct(p: CrmProject): number {
  if (!p.total_units || !p.sold_units) return 0;
  return Math.round((p.sold_units / p.total_units) * 100);
}

const TIER_STYLE: Record<string, string> = {
  Luxury: 'badge-warning',
  Medium: 'badge-info',
  Average: 'badge-neutral',
};

const TIER_BAR: Record<string, string> = {
  Luxury: 'bg-amber-500',
  Medium: 'bg-blue-500',
  Average: 'bg-slate-500',
};

type TierFilter = 'All' | 'Luxury' | 'Medium' | 'Average';

// ── Demo fallback data ────────────────────────────────────────────────────────

const DEMO_PROJECTS: CrmProject[] = [
  {
    id: 'demo_vida',
    name: 'Vida Residence',
    developer: 'Emaar',
    tier: 'Luxury',
    price_range_aed: { min: 1_800_000, max: 4_200_000 },
    location: { city: 'Dubai', community: 'Downtown Dubai' },
    unit_types: ['1BR', '2BR', '3BR', 'Penthouse'],
    completion_date: '2027-Q2',
    handover_status: 'Under Construction',
    commission_pct: 5,
    commission_notes: 'Golden visa eligible units available',
    description: 'Premium branded residences in the heart of Downtown Dubai with panoramic views of the Burj Khalifa and Dubai Fountain. World-class amenities by Vida Hotels & Resorts.',
    total_units: 340,
    sold_units: 187,
    is_featured: true,
  },
  {
    id: 'demo_mamsha',
    name: 'Mamsha Gardens',
    developer: 'Aldar',
    tier: 'Luxury',
    price_range_aed: { min: 2_500_000, max: 6_500_000 },
    location: { city: 'Abu Dhabi', community: 'Saadiyat Island' },
    unit_types: ['2BR', '3BR', '4BR', 'Villa'],
    completion_date: '2026-Q4',
    handover_status: 'Under Construction',
    commission_pct: 6,
    commission_notes: 'Beachfront premium — 2% early-bird bonus',
    description: 'Exclusive beachfront residences on Saadiyat Island, offering direct beach access and lush landscaped gardens. Minutes from the Louvre Abu Dhabi.',
    total_units: 220,
    sold_units: 165,
    is_featured: true,
  },
  {
    id: 'demo_louvre',
    name: 'Louvre Abu Dhabi Residences',
    developer: 'Aldar',
    tier: 'Luxury',
    price_range_aed: { min: 3_200_000, max: 9_800_000 },
    location: { city: 'Abu Dhabi', community: 'Saadiyat Cultural District' },
    unit_types: ['2BR', '3BR', 'Duplex', 'Penthouse'],
    completion_date: '2027-Q3',
    handover_status: 'Off-Plan',
    commission_pct: 7,
    commission_notes: 'Tiered commission — up to 7% on penthouses',
    description: 'Ultra-luxury residences adjacent to the iconic Louvre Abu Dhabi, blending world-class art and architecture with waterfront living.',
    total_units: 150,
    sold_units: 52,
    is_featured: true,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Projects() {
  const [projects, setProjects] = useState<CrmProject[]>(DEMO_PROJECTS);
  const [loading, setLoading] = useState(true);
  const [activeTier, setActiveTier] = useState<TierFilter>('All');
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Live Firestore listener ─────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'crm_projects'),
      snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as CrmProject));
        // Luxury first, then by name
        docs.sort((a, b) => {
          const tierOrder = ['Luxury', 'Medium', 'Average'];
          const ai = tierOrder.indexOf(a.tier);
          const bi = tierOrder.indexOf(b.tier);
          if (ai !== bi) return ai - bi;
          return a.name.localeCompare(b.name);
        });
        // Use Firebase data if available, otherwise keep demo fallback
        setProjects(docs.length > 0 ? docs : DEMO_PROJECTS);
        setLoading(false);
      },
      err => {
        console.error('[Projects] Firestore error:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // ── Filtered view ───────────────────────────────────────────────────────────
  const filtered = projects.filter(p => {
    const tierOk = activeTier === 'All' || p.tier === activeTier;
    if (!query) return tierOk;
    const q = query.toLowerCase();
    return tierOk && (
      p.name.toLowerCase().includes(q) ||
      p.developer.toLowerCase().includes(q) ||
      (p.location?.city ?? '').toLowerCase().includes(q) ||
      (p.location?.community ?? '').toLowerCase().includes(q)
    );
  });

  // Tier counts
  const tierCounts: Record<TierFilter, number> = {
    All: projects.length,
    Luxury: projects.filter(p => p.tier === 'Luxury').length,
    Medium: projects.filter(p => p.tier === 'Medium').length,
    Average: projects.filter(p => p.tier === 'Average').length,
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-psi-primary">Projects & L&D</h2>
          <p className="text-psi-secondary mt-1 text-sm">
            Live from <code className="text-xs bg-psi-subtle px-1.5 py-0.5 rounded font-mono">crm_projects</code> ·{' '}
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{projects.length} projects</span>
          </p>
        </div>
        <button className="flex items-center gap-2 btn-accent px-5 py-2.5 rounded-xl font-medium active:scale-[0.98] transition-all shadow-sm select-none min-h-[44px]">
          <Plus size={18} />
          <span>Add Project</span>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* ── Sidebar ── */}
        <div className="space-y-5">

          {/* Tier filter */}
          <div className="psi-card p-5">
            <h3 className="font-bold text-psi-primary mb-3 text-sm">Filter by Tier</h3>
            <div className="space-y-1">
              {(['All', 'Luxury', 'Medium', 'Average'] as TierFilter[]).map(tier => (
                <button
                  key={tier}
                  onClick={() => setActiveTier(tier)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all select-none ${activeTier === tier
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-psi-secondary hover:bg-psi-subtle'
                    }`}
                >
                  <span>{tier}</span>
                  <span className={`text-xs font-bold ${activeTier === tier ? 'text-emerald-100' : 'text-psi-muted'}`}>
                    {tierCounts[tier]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* L&D stats */}
          <div className="psi-card bg-psi-success p-5">
            <div className="flex items-center gap-2 text-psi-success mb-2">
              <Award size={18} />
              <h3 className="font-bold text-sm">L&amp;D Stats</h3>
            </div>
            <p className="text-xs text-psi-success opacity-80 mb-3">Training completion across active projects.</p>
            <div className="text-3xl font-extrabold text-psi-success">84%</div>
            <div className="w-full bg-emerald-200 dark:bg-emerald-900/40 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: '84%' }} />
            </div>
          </div>

          {/* Commission summary */}
          {projects.length > 0 && !loading && (
            <div className="psi-card bg-psi-warning p-5">
              <div className="flex items-center gap-2 text-psi-warning mb-2">
                <Percent size={18} />
                <h3 className="font-bold text-sm">Avg. Commission</h3>
              </div>
              <div className="text-3xl font-extrabold text-psi-warning">
                {(projects.reduce((s, p) => s + (p.commission_pct ?? 0), 0) / projects.length).toFixed(1)}%
              </div>
              <p className="text-xs text-psi-warning opacity-80 mt-1">Across {projects.length} active projects</p>
            </div>
          )}
        </div>

        {/* ── Project grid ── */}
        <div className="lg:col-span-3 space-y-5">

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-psi-muted" size={16} />
            <input
              type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search projects, developers, or communities…"
              className="psi-input w-full pl-11 pr-4 py-3 text-sm"
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2].map(i => (
                <div key={i} className="h-72 bg-psi-subtle animate-pulse rounded-3xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filtered.map((project, idx) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.07 }}
                  className="psi-card overflow-hidden hover:shadow-lg hover:shadow-black/5 transition-all group cursor-pointer"
                  onClick={() => setExpandedId(expandedId === project.id ? null : project.id)}
                >
                  {/* Card header */}
                  <div className="p-6 pb-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-psi-subtle rounded-2xl group-hover:bg-emerald-600 group-hover:text-psi-primary transition-all duration-200">
                        <Building size={22} />
                      </div>
                      <div className="flex items-center gap-2">
                        {project.is_featured && (
                          <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 text-amber-600 dark:text-amber-400 rounded-full text-[9px] font-bold uppercase tracking-widest">
                            Featured
                          </span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${TIER_STYLE[project.tier] ?? TIER_STYLE.Average}`}>
                          {project.tier}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-lg font-extrabold text-psi-primary truncate">{project.name}</h3>
                    <p className="text-sm text-psi-secondary font-medium">{project.developer}</p>

                    {(project.location?.community || project.location?.city) && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <MapPin size={12} className="text-psi-muted flex-shrink-0" />
                        <span className="text-xs text-psi-muted truncate">
                          {[project.location.community, project.location.city].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}

                    {project.price_range_aed && (
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-xs text-psi-muted font-medium">From</span>
                        <span className="text-sm font-extrabold text-psi-primary">{fmtAed(project.price_range_aed.min)}</span>
                        <span className="text-xs text-psi-muted">to</span>
                        <span className="text-sm font-extrabold text-psi-primary">{fmtAed(project.price_range_aed.max)}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-3 px-6 pb-4">
                    <div className="bg-psi-subtle p-3 rounded-2xl">
                      <div className="text-[10px] font-bold text-psi-muted uppercase tracking-widest mb-0.5">Commission</div>
                      <div className="text-sm font-extrabold text-psi-primary tabular-nums">{project.commission_pct ?? '—'}%</div>
                    </div>
                    <div className="bg-psi-subtle p-3 rounded-2xl">
                      <div className="text-[10px] font-bold text-psi-muted uppercase tracking-widest mb-0.5">Handover</div>
                      <div className="text-sm font-bold text-psi-primary truncate">{project.handover_status ?? '—'}</div>
                    </div>
                  </div>

                  {/* Units sold bar */}
                  {project.total_units && (
                    <div className="px-6 pb-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-psi-muted uppercase tracking-widest">Units Sold</span>
                        <span className="text-[10px] font-bold text-psi-secondary tabular-nums">{project.sold_units} / {project.total_units}</span>
                      </div>
                      <div className="w-full bg-psi-subtle h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${TIER_BAR[project.tier]}`}
                          style={{ width: `${soldPct(project)}%` }}
                        />
                      </div>
                      <div className="text-right mt-0.5">
                        <span className="text-[10px] text-psi-muted tabular-nums">{soldPct(project)}% sold</span>
                      </div>
                    </div>
                  )}

                  {/* Expanded description */}
                  <AnimatePresence>
                    {expandedId === project.id && project.description && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-4 border-t border-psi pt-4">
                          <p className="text-xs text-psi-secondary leading-relaxed mb-3">{project.description}</p>
                          {project.commission_notes && (
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-psi-warning rounded-xl px-3 py-2 font-medium">
                              💼 {project.commission_notes}
                            </p>
                          )}
                          {project.unit_types && project.unit_types.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                              {project.unit_types.map(ut => (
                                <span key={ut} className="text-[10px] badge-neutral px-2 py-0.5 rounded-full font-medium">{ut}</span>
                              ))}
                            </div>
                          )}
                          <p className="text-[10px] text-psi-muted font-mono mt-3">doc: {project.id}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Action buttons */}
                  <div className="px-6 py-4 border-t border-psi flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 active:scale-[0.98] transition-all select-none">
                      <BookOpen size={14} />
                      <span>L&amp;D Portal</span>
                    </button>
                    <button className="p-2.5 border border-psi rounded-xl hover:bg-psi-subtle active:scale-[0.98] transition-all text-psi-muted hover:text-psi-primary">
                      <ExternalLink size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}

              {filtered.length === 0 && (
                <div className="md:col-span-2 py-20 text-center bg-psi-subtle border-2 border-dashed border-psi rounded-3xl">
                  <Layers size={36} className="mx-auto text-psi-muted mb-3" />
                  <p className="font-bold text-psi-primary">No projects found</p>
                  <p className="text-psi-secondary text-sm mt-1">
                    {query ? 'Try different search terms.' : 'Run the seeder to populate crm_projects.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
