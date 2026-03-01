/**
 * Team.tsx
 * Live Firestore listener on the `crm_users` collection.
 * Removed fetch('/api/users'). Maps Firestore docs → styled table rows.
 */

import { useState, useEffect } from 'react';
import {
  Users as UsersIcon, Search, Filter,
  MoreVertical, CheckCircle2, XCircle,
  Globe, Award, TrendingUp, Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase/firebaseConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CrmUser {
  id: string;
  // The seeder uses full_name for agents and name for the admin
  full_name?: string;
  name?: string;
  email: string;
  role: string;
  branch?: string;
  languages?: string[];
  rera_number?: string;
  nationality?: string;
  is_active?: boolean;
  is_penalized?: boolean;
  performance?: {
    total_closed_aed?: number;
    ytd_deals?: number;
    roadshows_attended?: number;
    roadshow_closings?: number;
    team_size?: number;
    team_ytd_revenue_aed?: number;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function displayName(u: CrmUser): string {
  return u.full_name ?? u.name ?? u.email;
}

function initials(u: CrmUser): string {
  const n = displayName(u);
  return n.split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

function fmtAed(n?: number): string {
  if (!n) return '—';
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`;
  return `AED ${n.toLocaleString()}`;
}

const ROLE_BADGE: Record<string, string> = {
  'God-Mode Organizer': 'badge-warning',
  'Manager': 'badge-info',
  'Agent': 'badge-neutral',
};

// ── Avatar colours — deterministic by first char ──────────────────────────────

const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
];
function avatarColor(id: string): string {
  const code = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Team() {
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  // ── Live Firestore listener ─────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'crm_users'),
      snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as CrmUser));
        // Sort: God-Mode → Manager → Agent → rest
        const order = ['God-Mode Organizer', 'Manager', 'Agent'];
        docs.sort((a, b) => {
          const ai = order.indexOf(a.role);
          const bi = order.indexOf(b.role);
          if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
          return displayName(a).localeCompare(displayName(b));
        });
        setUsers(docs);
        setLoading(false);
      },
      err => {
        console.error('[Team] Firestore error:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      displayName(u).toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.role ?? '').toLowerCase().includes(q) ||
      (u.branch ?? '').toLowerCase().includes(q) ||
      (u.rera_number ?? '').toLowerCase().includes(q)
    );
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-psi-primary">Team & Attendees</h2>
          <p className="text-psi-secondary mt-1 text-sm">
            Live from <code className="text-xs bg-psi-subtle px-1.5 py-0.5 rounded font-mono">crm_users</code> ·{' '}
            <span className="text-emerald-600 font-bold">{users.length} profiles</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 border border-psi psi-card text-psi-primary px-4 py-2.5 rounded-xl font-medium hover:bg-psi-subtle active:scale-[0.98] transition-all shadow-sm select-none min-h-[44px]">
            <Globe size={16} className="text-psi-muted" />
            <span className="text-sm">Sync CRM</span>
          </button>
        </div>
      </header>

      {/* Stats strip */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="psi-card rounded-2xl p-4">
            <p className="text-xs font-bold text-psi-muted uppercase tracking-widest mb-1">Total Agents</p>
            <p className="text-2xl font-extrabold text-psi-primary">{users.filter(u => u.role === 'Agent').length}</p>
          </div>
          <div className="psi-card rounded-2xl p-4">
            <p className="text-xs font-bold text-psi-muted uppercase tracking-widest mb-1">Total Managers</p>
            <p className="text-2xl font-extrabold text-psi-primary">{users.filter(u => u.role === 'Manager').length}</p>
          </div>
          <div className="psi-card bg-psi-success rounded-2xl p-4">
            <p className="text-xs font-bold text-psi-success uppercase tracking-widest mb-1">Closed YTD</p>
            <p className="text-2xl font-extrabold text-psi-success">
              {fmtAed(users.reduce((s, u) => s + (u.performance?.total_closed_aed ?? 0), 0))}
            </p>
          </div>
        </div>
      )}

      {/* Search / filter */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-psi-muted" size={16} />
          <input
            type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, branch, role, or RERA..."
            className="psi-input w-full pl-11 pr-4 py-3 text-sm"
          />
        </div>
        <button className="p-3 psi-card rounded-2xl text-psi-muted hover:text-psi-primary transition-all">
          <Filter size={18} />
        </button>
      </div>

      {/* Table */}
      <div className="psi-card overflow-hidden">

        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-14 bg-psi-subtle animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-psi-subtle border-b border-psi">
                  <th className="px-6 py-4 text-xs font-bold text-psi-muted uppercase tracking-widest">Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-psi-muted uppercase tracking-widest">Role & Branch</th>
                  <th className="px-6 py-4 text-xs font-bold text-psi-muted uppercase tracking-widest">Languages</th>
                  <th className="px-6 py-4 text-xs font-bold text-psi-muted uppercase tracking-widest">Performance</th>
                  <th className="px-6 py-4 text-xs font-bold text-psi-muted uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-psi-muted uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-psi-subtle">
                {filtered.map((user, idx) => (
                  <>
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-psi-subtle/60 transition-colors cursor-pointer"
                      onClick={() => setExpanded(expanded === user.id ? null : user.id)}
                    >
                      {/* Name + avatar */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${avatarColor(user.id)}`}>
                            {initials(user)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-psi-primary truncate">{displayName(user)}</div>
                            <div className="text-xs text-psi-muted truncate">{user.email}</div>
                            {user.rera_number && (
                              <div className="text-[10px] text-psi-muted font-mono opacity-60">{user.rera_number}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role + branch */}
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-1 ${ROLE_BADGE[user.role] ?? 'badge-neutral'}`}>
                          {user.role}
                        </span>
                        <div className="text-xs text-psi-muted">{user.branch ?? '—'}</div>
                      </td>

                      {/* Languages */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(user.languages ?? []).map(lang => (
                            <span key={lang} className="px-2 py-0.5 badge-neutral rounded text-[10px] font-bold uppercase">
                              {lang}
                            </span>
                          ))}
                          {(!user.languages || user.languages.length === 0) && (
                            <span className="text-psi-muted text-xs italic">—</span>
                          )}
                        </div>
                      </td>

                      {/* Performance */}
                      <td className="px-6 py-4">
                        {user.performance?.total_closed_aed != null ? (
                          <div>
                            <div className="text-sm font-bold text-psi-primary">{fmtAed(user.performance.total_closed_aed)}</div>
                            <div className="text-xs text-psi-muted">
                              {user.performance.ytd_deals ?? 0} deals · {user.performance.roadshow_closings ?? 0} roadshow closings
                            </div>
                          </div>
                        ) : user.performance?.team_ytd_revenue_aed != null ? (
                          <div>
                            <div className="text-sm font-bold text-psi-primary">{fmtAed(user.performance.team_ytd_revenue_aed)}</div>
                            <div className="text-xs text-psi-muted">Team YTD · {user.performance.team_size} agents</div>
                          </div>
                        ) : (
                          <span className="text-psi-muted text-xs">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {user.is_penalized ? (
                          <div className="flex items-center gap-1.5 text-rose-600 text-sm font-medium">
                            <XCircle size={15} /> <span>Penalized</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                            <CheckCircle2 size={15} /> <span>Active</span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <button
                          onClick={e => { e.stopPropagation(); setExpanded(expanded === user.id ? null : user.id); }}
                          className="p-2 text-psi-muted hover:text-psi-primary transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </motion.tr>

                    {/* Expanded performance row */}
                    <AnimatePresence>
                      {expanded === user.id && user.performance && (
                        <motion.tr
                          key={`${user.id}-expand`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <td colSpan={6} className="bg-psi-subtle px-6 py-4 border-b border-psi">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {user.performance.total_closed_aed != null && (
                                <>
                                  <div className="psi-card rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-psi-muted uppercase tracking-widest">Total Closed</p>
                                    <p className="text-base font-extrabold text-psi-primary">{fmtAed(user.performance.total_closed_aed)}</p>
                                  </div>
                                  <div className="psi-card rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-psi-muted uppercase tracking-widest">YTD Deals</p>
                                    <p className="text-base font-extrabold text-psi-primary">{user.performance.ytd_deals}</p>
                                  </div>
                                  <div className="psi-card rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-psi-muted uppercase tracking-widest">Roadshows</p>
                                    <p className="text-base font-extrabold text-psi-primary">{user.performance.roadshows_attended}</p>
                                  </div>
                                  <div className="psi-card bg-psi-success rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-psi-success uppercase tracking-widest">Closings</p>
                                    <p className="text-base font-extrabold text-psi-success">{user.performance.roadshow_closings}</p>
                                  </div>
                                </>
                              )}
                              {user.performance.team_ytd_revenue_aed != null && (
                                <>
                                  <div className="psi-card rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-psi-muted uppercase tracking-widest">Team Revenue</p>
                                    <p className="text-base font-extrabold text-psi-primary">{fmtAed(user.performance.team_ytd_revenue_aed)}</p>
                                  </div>
                                  <div className="psi-card rounded-xl p-3">
                                    <p className="text-[10px] font-bold text-psi-muted uppercase tracking-widest">Team Size</p>
                                    <p className="text-base font-extrabold text-psi-primary">{user.performance.team_size} agents</p>
                                  </div>
                                </>
                              )}
                            </div>
                            <p className="text-[10px] text-psi-muted font-mono mt-3">doc: {user.id}</p>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <UsersIcon size={36} className="mx-auto text-psi-muted mb-3" />
                      <p className="font-bold text-psi-primary">No team members found</p>
                      <p className="text-psi-secondary text-sm mt-1">
                        {query ? 'Try a different search term.' : 'Run the seeder to populate crm_users.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
