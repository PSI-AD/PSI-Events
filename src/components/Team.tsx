/**
 * Team.tsx
 * Live Firestore listener on the `crm_users` collection.
 * Removed fetch('/api/users'). Maps Firestore docs → styled table rows.
 */

import React, { useState, useEffect } from 'react';
import {
  Users as UsersIcon, Filter,
  CheckCircle2, XCircle,
  Globe, MoreVertical,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase/firebaseConfig';
import {
  PageShell, PageHeader, SectionCard,
  DataTable, DataRow, DataCell,
  Avatar, SearchBar, StatusBadge, Btn, IconBtn,
} from './shared/ui';

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

const ROLE_BADGE_VARIANT: Record<string, 'warning' | 'info' | 'neutral'> = {
  'God-Mode Organizer': 'warning',
  'Manager': 'info',
  'Agent': 'neutral',
};

// ── Demo fallback data ────────────────────────────────────────────────────────

const DEMO_TEAM: CrmUser[] = [
  {
    id: 'demo_amr',
    full_name: 'Amr ElFangary',
    email: 'amr@psi-events.ae',
    role: 'Manager',
    branch: 'Dubai Marina',
    languages: ['English', 'Arabic'],
    rera_number: 'BRN-34521',
    nationality: 'Egyptian',
    is_active: true,
    is_penalized: false,
    performance: {
      team_size: 8,
      team_ytd_revenue_aed: 14_500_000,
      total_closed_aed: 6_200_000,
      ytd_deals: 12,
      roadshows_attended: 5,
      roadshow_closings: 3,
    },
  },
  {
    id: 'demo_sara',
    full_name: 'Sara Almarzouqi',
    email: 'sara@psi-events.ae',
    role: 'Agent',
    branch: 'Abu Dhabi HQ',
    languages: ['English', 'Arabic', 'French'],
    rera_number: 'BRN-41290',
    nationality: 'Emirati',
    is_active: true,
    is_penalized: false,
    performance: {
      total_closed_aed: 3_500_000,
      ytd_deals: 8,
      roadshows_attended: 4,
      roadshow_closings: 2,
    },
  },
  {
    id: 'demo_khalid',
    full_name: 'Khalid Al-Mansouri',
    email: 'khalid@psi-events.ae',
    role: 'Agent',
    branch: 'Dubai Marina',
    languages: ['English', 'Arabic'],
    rera_number: 'BRN-52087',
    nationality: 'Emirati',
    is_active: true,
    is_penalized: false,
    performance: {
      total_closed_aed: 2_100_000,
      ytd_deals: 5,
      roadshows_attended: 3,
      roadshow_closings: 1,
    },
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Team() {
  const [users, setUsers] = useState<CrmUser[]>(DEMO_TEAM);
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
        // Use Firebase data if available, otherwise keep demo fallback
        setUsers(docs.length > 0 ? docs : DEMO_TEAM);
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
    <PageShell>
      {/* Header */}
      <PageHeader
        title="Team & Attendees"
        subtitle={
          <>
            Live from <code className="text-xs bg-psi-subtle px-1.5 py-0.5 rounded font-mono">crm_users</code>{' '}
            · <span className="text-emerald-600 font-bold">{users.length} profiles</span>
          </>
        }
        actions={
          <Btn variant="secondary" icon={<Globe size={15} className="text-psi-muted" />}>
            Sync CRM
          </Btn>
        }
      />

      {/* Stats strip */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="psi-card p-4">
            <p className="text-xs font-bold text-psi-muted uppercase tracking-widest mb-1">Total Agents</p>
            <p className="text-2xl font-extrabold text-psi-primary">{users.filter(u => u.role === 'Agent').length}</p>
          </div>
          <div className="psi-card p-4">
            <p className="text-xs font-bold text-psi-muted uppercase tracking-widest mb-1">Total Managers</p>
            <p className="text-2xl font-extrabold text-psi-primary">{users.filter(u => u.role === 'Manager').length}</p>
          </div>
          <div className="psi-card bg-psi-success p-4">
            <p className="text-xs font-bold text-psi-success uppercase tracking-widest mb-1">Closed YTD</p>
            <p className="text-2xl font-extrabold text-psi-success">
              {fmtAed(users.reduce((s, u) => s + (u.performance?.total_closed_aed ?? 0), 0))}
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Search by name, branch, role, or RERA…"
        className="mb-6"
      />

      {/* Table */}
      <SectionCard noPadding>

        <DataTable
          columns={['Name', 'Role & Branch', 'Languages', 'Performance', 'Status', 'Actions']}
          loading={loading}
          empty={filtered.length === 0}
          emptyMessage="No team members found"
          minWidth="700px"
        >
          {filtered.map((user) => (
            <React.Fragment key={user.id}>
              <DataRow
                onClick={() => setExpanded(expanded === user.id ? null : user.id)}
              >
                {/* Name + avatar */}
                <DataCell>
                  <div className="flex items-center gap-3">
                    <Avatar
                      initials={initials(user)}
                      seed={user.id}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-psi-primary truncate">{displayName(user)}</div>
                      <div className="text-xs text-psi-muted truncate">{user.email}</div>
                      {user.rera_number && (
                        <div className="text-[10px] text-psi-muted font-mono opacity-60">{user.rera_number}</div>
                      )}
                    </div>
                  </div>
                </DataCell>

                {/* Role + branch */}
                <DataCell>
                  <StatusBadge variant={ROLE_BADGE_VARIANT[user.role] ?? 'neutral'}>
                    {user.role}
                  </StatusBadge>
                  <div className="text-xs text-psi-muted mt-1">{user.branch ?? '—'}</div>
                </DataCell>

                {/* Languages */}
                <DataCell>
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
                </DataCell>

                {/* Performance */}
                <DataCell>
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
                </DataCell>

                {/* Status */}
                <DataCell>
                  {user.is_penalized ? (
                    <div className="flex items-center gap-1.5 text-rose-600 text-sm font-medium">
                      <XCircle size={14} /> <span>Penalized</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                      <CheckCircle2 size={14} /> <span>Active</span>
                    </div>
                  )}
                </DataCell>

                {/* Actions */}
                <DataCell>
                  <IconBtn
                    icon={<MoreVertical size={15} />}
                    label="Expand row"
                    onClick={() => setExpanded(expanded === user.id ? null : user.id)}
                  />
                </DataCell>
              </DataRow>

              {/* Expanded performance row */}
              <AnimatePresence>
                {expanded === user.id && user.performance && (
                  <motion.tr
                    key={`${user.id}-expand`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={6} className="bg-psi-subtle px-5 py-4 border-b border-psi">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {user.performance.total_closed_aed != null && (
                          <>
                            <div className="psi-card-sm p-3">
                              <p className="text-[10px] font-bold text-psi-muted uppercase tracking-widest">Total Closed</p>
                              <p className="text-base font-extrabold text-psi-primary">{fmtAed(user.performance.total_closed_aed)}</p>
                            </div>
                            <div className="psi-card-sm p-3">
                              <p className="text-[10px] font-bold text-psi-muted uppercase tracking-widest">YTD Deals</p>
                              <p className="text-base font-extrabold text-psi-primary">{user.performance.ytd_deals}</p>
                            </div>
                            <div className="psi-card-sm p-3">
                              <p className="text-[10px] font-bold text-psi-muted uppercase tracking-widest">Roadshows</p>
                              <p className="text-base font-extrabold text-psi-primary">{user.performance.roadshows_attended}</p>
                            </div>
                            <div className="psi-card-sm bg-psi-success p-3">
                              <p className="text-[10px] font-bold text-psi-success uppercase tracking-widest">Closings</p>
                              <p className="text-base font-extrabold text-psi-success">{user.performance.roadshow_closings}</p>
                            </div>
                          </>
                        )}
                        {user.performance.team_ytd_revenue_aed != null && (
                          <>
                            <div className="psi-card-sm p-3">
                              <p className="text-[10px] font-bold text-psi-muted uppercase tracking-widest">Team Revenue</p>
                              <p className="text-base font-extrabold text-psi-primary">{fmtAed(user.performance.team_ytd_revenue_aed)}</p>
                            </div>
                            <div className="psi-card-sm p-3">
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
            </React.Fragment>
          ))}
        </DataTable>
      </SectionCard>
    </PageShell>
  );
}
