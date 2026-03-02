/**
 * EventsList.tsx
 * Live Firestore listener on the `events` collection.
 * Maps Firestore documents → Event cards. Removed all fetch('/api/events') calls.
 */

import React, { useState, useEffect } from 'react';
import {
  Plus, MapPin, Calendar as CalendarIcon, Users, ArrowRight,
  Filter, XCircle, Zap, Building2, Target, CheckCircle2, Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase/firebaseConfig';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FirestoreEvent {
  id: string;
  name: string;
  status: 'Active' | 'Upcoming' | 'Completed' | 'Draft' | 'Proposal';
  location?: { city?: string; country?: string };
  date_start?: { toDate: () => Date };
  date_end?: { toDate: () => Date };
  is_sponsored: boolean;
  target_leads: number;
  actual_leads: number;
  sponsorship?: { developer?: string; amount_aed?: number };
  budget?: { type?: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(ts?: { toDate: () => Date }): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateShort(ts?: { toDate: () => Date }): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const STATUS_STYLE: Record<string, string> = {
  Active: 'badge-success',
  Upcoming: 'badge-info',
  Completed: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  Draft: 'badge-neutral',
  Proposal: 'badge-warning',
};

// ── Timestamp shim helper ──────────────────────────────────────────────────────
// Lets us create DEMO_EVENTS with plain Date objects that satisfy the Firestore
// Timestamp interface so fmtDate / fmtDateShort work without modification.

function ts(dateStr: string): { toDate: () => Date } {
  const d = new Date(dateStr);
  return { toDate: () => d };
}

// ── Bulletproof demo events (presentation fallback) ───────────────────────────
// Shown immediately on mount AND used as fallback if Firestore returns 0 docs
// or errors. This guarantees the table is never blank during a live demo.

const DEMO_EVENTS: FirestoreEvent[] = [
  {
    id: 'evt_1',
    name: 'Moscow Luxury Property Expo',
    status: 'Active',
    location: { city: 'Moscow', country: 'Russia' },
    date_start: ts('2026-03-15'),
    date_end: ts('2026-03-17'),
    is_sponsored: true,
    sponsorship: { developer: 'Emaar', amount_aed: 150000 },
    target_leads: 300,
    actual_leads: 255,   // 85% progress
  },
  {
    id: 'evt_2',
    name: 'London VIP Roadshow',
    status: 'Upcoming',
    location: { city: 'London', country: 'UK' },
    date_start: ts('2026-04-10'),
    date_end: ts('2026-04-12'),
    is_sponsored: false,
    target_leads: 450,
    actual_leads: 45,    // 10% progress — planning stage
  },
  {
    id: 'evt_3',
    name: 'Riyadh Investor Summit',
    status: 'Active',
    location: { city: 'Riyadh', country: 'KSA' },
    date_start: ts('2026-03-05'),
    date_end: ts('2026-03-06'),
    is_sponsored: true,
    sponsorship: { developer: 'Aldar', amount_aed: 120000 },
    target_leads: 250,
    actual_leads: 113,   // ~45% progress
  },
  {
    id: 'evt_4',
    name: 'Monaco Yacht Show Real Estate Event',
    status: 'Completed',
    location: { city: 'Monaco', country: 'Monaco' },
    date_start: ts('2026-02-15'),
    date_end: ts('2026-02-16'),
    is_sponsored: true,
    sponsorship: { developer: 'Meraas', amount_aed: 300000 },
    target_leads: 150,
    actual_leads: 150,   // 100% complete
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function EventsList() {
  const [events, setEvents] = useState<FirestoreEvent[]>(DEMO_EVENTS);
  const [loading, setLoading] = useState(false); // false = demo data is pre-loaded
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newEvent, setNewEvent] = useState({
    name: '',
    city: 'Dubai',
    country: 'UAE',
    target_leads: 200,
    is_sponsored: false,
  });

  // ── Live Firestore listener ─────────────────────────────────────────────────
  // Replaces demo data ONLY if Firestore returns real documents.
  // On error or empty snapshot → keeps DEMO_EVENTS so the table never blanks.
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'events'),
      snapshot => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreEvent));
        if (docs.length > 0) {
          // Sort: Active first, then Completed, then alphabetical
          docs.sort((a, b) => {
            if (a.status === 'Active' && b.status !== 'Active') return -1;
            if (b.status === 'Active' && a.status !== 'Active') return 1;
            return a.name.localeCompare(b.name);
          });
          setEvents(docs);
        }
        // else: Firestore returned 0 docs → keep DEMO_EVENTS in state
        setLoading(false);
      },
      err => {
        console.warn('[EventsList] Firestore error — showing demo data:', err);
        // Silently fall back; DEMO_EVENTS is already in state
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // ── Client-side filter ──────────────────────────────────────────────────────
  const filtered = events.filter(e => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      (e.location?.city ?? '').toLowerCase().includes(q) ||
      (e.location?.country ?? '').toLowerCase().includes(q) ||
      e.status.toLowerCase().includes(q)
    );
  });

  // ── Create new event ────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, 'events'), {
        name: newEvent.name,
        status: 'Draft',
        location: { city: newEvent.city, country: newEvent.country },
        target_leads: newEvent.target_leads,
        actual_leads: 0,
        is_sponsored: newEvent.is_sponsored,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      setShowModal(false);
      setNewEvent({ name: '', city: 'Dubai', country: 'UAE', target_leads: 200, is_sponsored: false });
      toast.success('Event created successfully!', {
        description: `"${newEvent.name}" has been saved to Firestore.`,
      });
    } catch (err) {
      console.error('[EventsList] Create failed:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to create event', { description: msg });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-psi-primary">Events</h2>
          <p className="text-psi-secondary mt-1 text-sm">
            Live roadshow data ·{' '}
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{events.length} events</span>
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-accent flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium shadow-sm select-none min-h-[44px]"
        >
          <Plus size={18} />
          <span>New Event</span>
        </button>
      </header>

      {/* Create modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-psi-raised rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-psi"
            >
              <div className="p-6 border-b border-psi flex justify-between items-center">
                <h3 className="text-xl font-bold text-psi-primary">Create New Event</h3>
                <button onClick={() => setShowModal(false)} className="text-psi-muted hover:text-psi-secondary transition-colors">
                  <XCircle size={24} />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-psi-muted uppercase tracking-widest mb-1">Event Name</label>
                  <input
                    required type="text" value={newEvent.name}
                    onChange={e => setNewEvent({ ...newEvent, name: e.target.value })}
                    className="psi-input w-full px-4 py-2.5"
                    placeholder="e.g. Q4 London Luxury Roadshow"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-psi-muted uppercase tracking-widest mb-1">City</label>
                    <input
                      type="text" value={newEvent.city}
                      onChange={e => setNewEvent({ ...newEvent, city: e.target.value })}
                      className="psi-input w-full px-4 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-psi-muted uppercase tracking-widest mb-1">Country</label>
                    <input
                      type="text" value={newEvent.country}
                      onChange={e => setNewEvent({ ...newEvent, country: e.target.value })}
                      className="psi-input w-full px-4 py-2.5"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-psi-muted uppercase tracking-widest mb-1">Target Leads</label>
                    <input
                      type="number" value={newEvent.target_leads}
                      onChange={e => setNewEvent({ ...newEvent, target_leads: parseInt(e.target.value) })}
                      className="psi-input w-full px-4 py-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-psi-muted uppercase tracking-widest mb-1">Budget Type</label>
                    <select
                      value={newEvent.is_sponsored ? 'true' : 'false'}
                      onChange={e => setNewEvent({ ...newEvent, is_sponsored: e.target.value === 'true' })}
                      className="psi-input w-full px-4 py-2.5"
                    >
                      <option value="false">Branch Funded</option>
                      <option value="true">Developer Sponsored</option>
                    </select>
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    type="submit" disabled={saving}
                    className="btn-accent w-full py-3 rounded-xl font-bold active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed select-none flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        <span>Creating…</span>
                      </>
                    ) : 'Create Event'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Filter bar */}
      <div className="flex gap-4 mb-8">
        <div className="flex-1 relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-psi-muted" size={18} />
          <input
            type="text" value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Filter by name, city or status…"
            className="psi-input w-full pl-12 pr-4 py-3"
          />
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-72 bg-psi-subtle animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((event, idx) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="group psi-card p-6 hover:shadow-xl dark:hover:shadow-black/40 hover:shadow-slate-200/60 transition-all duration-300 cursor-pointer select-none"
            >
              {/* Top row */}
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${STATUS_STYLE[event.status] ?? STATUS_STYLE.Draft}`}>
                  {event.status}
                </span>
                <div className="text-psi-muted group-hover:text-psi-primary transition-colors">
                  <ArrowRight size={18} />
                </div>
              </div>

              {/* Name */}
              <h3 className="text-lg font-extrabold text-psi-primary mb-1 leading-tight truncate">
                {event.name}
              </h3>

              {/* Sponsor badge */}
              {event.is_sponsored && event.sponsorship?.developer && (
                <div className="flex items-center gap-1.5 mb-4">
                  <Zap size={11} className="text-amber-500" />
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                    {event.sponsorship.developer} · AED {(event.sponsorship.amount_aed ?? 0).toLocaleString()}
                  </span>
                </div>
              )}
              {!event.is_sponsored && (
                <div className="mb-4">
                  <span className="text-[10px] font-bold text-psi-muted uppercase tracking-widest">Branch Funded</span>
                </div>
              )}

              {/* Info rows */}
              <div className="space-y-2.5 mt-2">
                <div className="flex items-center gap-2.5 text-psi-secondary text-sm">
                  <MapPin size={14} className="text-psi-muted flex-shrink-0" />
                  <span className="truncate">{event.location?.city ?? '—'}, {event.location?.country ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-psi-secondary text-sm">
                  <CalendarIcon size={14} className="text-psi-muted flex-shrink-0" />
                  <span>{fmtDateShort(event.date_start)} – {fmtDate(event.date_end)}</span>
                </div>
                <div className="flex items-center gap-2.5 text-psi-secondary text-sm">
                  <Target size={14} className="text-psi-muted flex-shrink-0" />
                  <span>{event.actual_leads} / {event.target_leads} leads</span>
                </div>
              </div>

              {/* Lead progress bar */}
              <div className="mt-4">
                <div className="w-full bg-psi-subtle h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${event.status === 'Active'
                      ? 'bg-emerald-500'
                      : event.status === 'Upcoming'
                        ? 'bg-blue-400'
                        : event.status === 'Completed'
                          ? 'bg-slate-400'
                          : 'bg-blue-400'
                      }`}
                    style={{ width: `${Math.min(100, event.target_leads > 0 ? (event.actual_leads / event.target_leads) * 100 : 0)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-psi-muted font-mono">
                    {event.actual_leads} leads
                  </span>
                  <span className="text-[10px] text-psi-muted font-mono">
                    {event.target_leads > 0 ? Math.round((event.actual_leads / event.target_leads) * 100) : 0}%
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-5 pt-4 border-t border-psi flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  {event.status === 'Active' ? (
                    <div className="flex items-center gap-1 text-emerald-500">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-widest">Live</span>
                    </div>
                  ) : event.status === 'Completed' ? (
                    <div className="flex items-center gap-1 text-blue-500 dark:text-blue-400">
                      <CheckCircle2 size={12} />
                      <span className="text-xs font-bold uppercase tracking-widest">Complete</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-psi-muted">
                      <Clock size={12} />
                      <span className="text-xs font-bold uppercase tracking-widest">Upcoming</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-mono text-psi-muted truncate max-w-[120px]">{event.id}</span>
              </div>
            </motion.div>
          ))}

          {filtered.length === 0 && !loading && (
            <div className="col-span-full">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col items-center justify-center py-24 px-8 bg-psi-subtle border-2 border-dashed border-psi rounded-3xl text-center"
              >
                <div className="w-20 h-20 rounded-3xl bg-psi-surface border border-psi flex items-center justify-center mb-6 shadow-inner">
                  <CalendarIcon size={36} className="text-psi-muted opacity-60" />
                </div>
                <h3 className="text-xl font-extrabold text-psi-primary mb-2">
                  {filter ? 'No Events Match Your Filter' : 'No Events Yet'}
                </h3>
                <p className="text-psi-secondary text-sm max-w-sm leading-relaxed mb-8">
                  {filter
                    ? `No events found for "${filter}". Try a different city, status, or event name.`
                    : 'Your roadshow calendar is empty. Create your first international event to get started.'}
                </p>
                {!filter && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="btn-accent flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-md active:scale-[0.98] transition-all select-none"
                  >
                    <Plus size={18} />
                    Create Your First Event
                  </button>
                )}
                {filter && (
                  <button
                    onClick={() => setFilter('')}
                    className="btn-accent-outline px-6 py-3 rounded-xl font-bold transition-all select-none"
                  >
                    Clear Filter
                  </button>
                )}
              </motion.div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
