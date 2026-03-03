/**
 * Proposals.tsx
 * Fully wired to Firestore — proposals are read from and written to
 * the `crm_proposals` collection via live onSnapshot listener + addDoc.
 */

import React, { useState, useEffect } from 'react';
import {
  FileText, Send, ChevronRight,
  Building2, Map, UserCheck, Plus, Search, X, Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase/firebaseConfig';
import { toast } from 'sonner';
import PitchGenerator from '../features/proposals/PitchGenerator';

// ── Types ──────────────────────────────────────────────────────────────────────

type ProposalType = 'developer' | 'branch' | 'agent';

interface ProposalDoc {
  id: string;
  type: ProposalType;
  title: string;
  recipient: string;
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected';
  created_by: string;
  created_at?: { toDate: () => Date };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(ts?: { toDate: () => Date }): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_STYLE: Record<string, string> = {
  Draft: 'badge-neutral',
  Sent: 'badge-info',
  Approved: 'badge-success',
  Rejected: 'bg-rose-100 text-rose-700',
};

// ── Demo fallback ─────────────────────────────────────────────────────────────

function ts(d: string): { toDate: () => Date } { const dt = new Date(d); return { toDate: () => dt }; }

const DEMO_PROPOSALS: ProposalDoc[] = [
  { id: 'p1', type: 'branch', title: 'Q3 Roadshow — Dubai Marina', recipient: 'Dubai Marina Branch', status: 'Sent', created_by: 'System Admin', created_at: ts('2025-10-10') },
  { id: 'p2', type: 'agent', title: 'Agent Offer — Khalid Al-M.', recipient: 'Khalid Al-Mansouri', status: 'Approved', created_by: 'System Admin', created_at: ts('2025-10-11') },
  { id: 'p3', type: 'developer', title: 'Developer Pitch — Emaar', recipient: 'Emaar Properties', status: 'Draft', created_by: 'System Admin', created_at: ts('2025-10-12') },
  { id: 'p4', type: 'branch', title: 'London Luxury Expo Proposal', recipient: 'London Branch', status: 'Sent', created_by: 'System Admin', created_at: ts('2025-10-13') },
];

// ── Main component ────────────────────────────────────────────────────────────

export default function Proposals() {
  const [activeTab, setActiveTab] = useState<ProposalType>('branch');
  const [proposals, setProposals] = useState<ProposalDoc[]>(DEMO_PROPOSALS);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  const [newProposal, setNewProposal] = useState({
    title: '',
    recipient: '',
    status: 'Draft' as ProposalDoc['status'],
  });

  // ── Live Firestore listener ────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'crm_proposals'),
      snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ProposalDoc));
        if (docs.length > 0) {
          docs.sort((a, b) => {
            const at = a.created_at?.toDate().getTime() ?? 0;
            const bt = b.created_at?.toDate().getTime() ?? 0;
            return bt - at; // newest first
          });
          setProposals(docs);
        }
        // else: keep demo fallback
      },
      err => {
        console.warn('[Proposals] Firestore error — showing demo data:', err);
      }
    );
    return () => unsub();
  }, []);

  // ── Create proposal ────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, 'crm_proposals'), {
        type: activeTab,
        title: newProposal.title.trim(),
        recipient: newProposal.recipient.trim(),
        status: newProposal.status,
        created_by: 'System Admin',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      toast.success('Proposal created', {
        description: `"${newProposal.title}" saved to crm_proposals.`,
      });
      setShowModal(false);
      setNewProposal({ title: '', recipient: '', status: 'Draft' });
    } catch (err) {
      console.error('[Proposals] addDoc failed:', err);
      toast.error('Failed to create proposal', {
        description: err instanceof Error ? err.message : 'Unknown Firestore error',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const tabProposals = proposals.filter(p =>
    p.type === activeTab &&
    (p.title.toLowerCase().includes(searchQ.toLowerCase()) ||
      p.recipient.toLowerCase().includes(searchQ.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-psi-primary">
            Proposal Engine
          </h2>
          <p className="text-psi-secondary mt-1">
            Generate automated sponsorship pitches and participation offers.
          </p>
        </div>
        {activeTab !== 'developer' && (
          <button
            id="create-proposal-btn"
            onClick={() => setShowModal(true)}
            className="btn-accent flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium shadow-sm min-h-[44px]"
          >
            <Plus size={20} />
            <span>Create Proposal</span>
          </button>
        )}
      </header>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-psi-subtle border border-psi p-1 rounded-2xl w-fit mb-8">
        <TabButton active={activeTab === 'developer'} onClick={() => setActiveTab('developer')} label="Developer Pitch" icon={<Building2 size={16} />} />
        <TabButton active={activeTab === 'branch'} onClick={() => setActiveTab('branch')} label="Branch Proposal" icon={<Map size={16} />} />
        <TabButton active={activeTab === 'agent'} onClick={() => setActiveTab('agent')} label="Agent Offer" icon={<UserCheck size={16} />} />
      </div>

      {/* ── Tab content ── */}
      {activeTab === 'developer' ? (
        <PitchGenerator />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main list */}
          <div className="lg:col-span-2 space-y-6">
            <div className="psi-card overflow-hidden">
              <div className="p-6 border-b border-psi bg-psi-subtle flex justify-between items-center">
                <h3 className="font-bold text-psi-primary">
                  Recent {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Proposals
                  <span className="ml-2 text-psi-muted font-normal text-sm">({tabProposals.length})</span>
                </h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-psi-muted" size={14} />
                  <input
                    type="text"
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder="Search..."
                    className="psi-input pl-9 pr-4 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div className="divide-y divide-psi-subtle">
                {tabProposals.length === 0 ? (
                  <div className="flex flex-col items-center py-16 px-8 text-center">
                    <FileText size={36} className="text-psi-muted opacity-40 mb-4" />
                    <p className="text-psi-muted text-sm font-medium">No proposals yet.</p>
                    <p className="text-psi-muted text-xs mt-1">Click "Create Proposal" to add one.</p>
                  </div>
                ) : (
                  tabProposals.map(p => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-6 hover:bg-psi-subtle transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-psi-subtle flex items-center justify-center text-psi-muted group-hover:bg-psi-surface group-hover:shadow-sm transition-all flex-shrink-0">
                          <FileText size={24} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-psi-primary truncate">{p.title}</h4>
                          <p className="text-sm text-psi-secondary mt-0.5 flex items-center gap-1.5">
                            <Clock size={11} className="flex-shrink-0" />
                            {fmtDate(p.created_at)} · {p.created_by}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${STATUS_STYLE[p.status] ?? 'badge-neutral'}`}>
                          {p.status}
                        </span>
                        <ChevronRight size={20} className="text-psi-muted group-hover:text-psi-primary transition-colors" />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="psi-card p-8 bg-psi-raised border-psi shadow-lg">
              <h3 className="text-xl font-bold text-psi-primary mb-4">Common Parameters</h3>
              <p className="text-psi-secondary text-sm mb-6">
                These metrics drive the ROI forecasts in all proposals.
              </p>
              <div className="space-y-4">
                <ParamItem label="Marketing Leads" value="50%" />
                <ParamItem label="Walk-in Leads" value="50%" />
                <ParamItem label="Qualified Rate" value="30%" />
                <ParamItem label="Meeting Rate" value="15%" />
                <ParamItem label="Deal Rate" value="2%" />
              </div>
              <button className="btn-accent-outline w-full mt-8 py-3 rounded-2xl text-sm font-bold transition-all">
                Edit Global Metrics
              </button>
            </div>

            <div className="psi-card p-8">
              <h3 className="font-bold text-psi-primary mb-4">Tiered Cost Logic</h3>
              <div className="space-y-4">
                <TierInfo tier="Gold" comm="50%" cost="Agent Pays" color="text-amber-500" />
                <TierInfo tier="Silver" comm="30%" cost="Agent Pays" color="text-psi-secondary" />
                <TierInfo tier="Bronze" comm="20%" cost="Branch Pays" color="text-amber-700" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Proposal Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            key="proposal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="bg-psi-raised rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-psi"
            >
              {/* Modal header */}
              <div className="p-6 border-b border-psi flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-psi-accent-subtle flex items-center justify-center">
                    <Send size={16} className="text-psi-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-psi-primary">
                      New {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Proposal
                    </h3>
                    <p className="text-[11px] text-psi-muted">Saves to <code className="font-mono">crm_proposals</code></p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl text-psi-muted hover:text-psi-primary hover:bg-psi-subtle transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-psi-muted uppercase tracking-widest mb-1">Proposal Title *</label>
                  <input
                    required type="text"
                    value={newProposal.title}
                    onChange={e => setNewProposal({ ...newProposal, title: e.target.value })}
                    placeholder="e.g. Q4 London Luxury Roadshow"
                    className="psi-input w-full px-4 py-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-psi-muted uppercase tracking-widest mb-1">Recipient *</label>
                  <input
                    required type="text"
                    value={newProposal.recipient}
                    onChange={e => setNewProposal({ ...newProposal, recipient: e.target.value })}
                    placeholder={activeTab === 'developer' ? 'e.g. Emaar Properties' : activeTab === 'branch' ? 'e.g. Dubai Marina Branch' : 'e.g. Khalid Al-Mansouri'}
                    className="psi-input w-full px-4 py-2.5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-psi-muted uppercase tracking-widest mb-1">Initial Status</label>
                  <select
                    value={newProposal.status}
                    onChange={e => setNewProposal({ ...newProposal, status: e.target.value as ProposalDoc['status'] })}
                    className="psi-input w-full px-4 py-2.5"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Approved">Approved</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    id="create-proposal-submit-btn"
                    className="btn-accent w-full py-3 rounded-xl font-bold active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed select-none flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        <span>Saving to Firestore…</span>
                      </>
                    ) : 'Create Proposal'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TabButton({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all select-none ${active ? 'btn-accent shadow-sm' : 'text-psi-muted hover:text-psi-primary hover:bg-psi-subtle'
        }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ParamItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-psi-subtle last:border-0">
      <span className="text-sm text-psi-secondary">{label}</span>
      <span className="text-sm font-bold text-psi-primary">{value}</span>
    </div>
  );
}

function TierInfo({ tier, comm, cost, color }: { tier: string; comm: string; cost: string; color: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-psi-subtle rounded-2xl">
      <div className="flex items-center gap-3">
        <div className={`font-black italic ${color}`}>{tier}</div>
        <div className="text-xs font-bold text-psi-muted uppercase tracking-widest">{comm}</div>
      </div>
      <div className="text-xs font-medium text-psi-secondary">{cost}</div>
    </div>
  );
}
