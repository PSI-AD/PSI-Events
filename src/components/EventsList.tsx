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

// ── Types ─────────────────────────────────────────────────────────────────────

interface FirestoreEvent {
  id: string;
  name: string;
  status: 'Active' | 'Completed' | 'Draft' | 'Proposal';
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
  Active: 'bg-emerald-100 text-emerald-700',
  Completed: 'bg-blue-100 text-blue-700',
  Draft: 'bg-slate-100 text-slate-600',
  Proposal: 'bg-amber-100 text-amber-700',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function EventsList() {
  const [events, setEvents] = useState<FirestoreEvent[]>([]);
  const [loading, setLoading] = useState(true);
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
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'events'),
      snapshot => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreEvent));
        // Sort: Active first, then Completed, then by name
        docs.sort((a, b) => {
          if (a.status === 'Active' && b.status !== 'Active') return -1;
          if (b.status === 'Active' && a.status !== 'Active') return 1;
          return a.name.localeCompare(b.name);
        });
        setEvents(docs);
        setLoading(false);
      },
      err => {
        console.error('[EventsList] Firestore error:', err);
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
    } catch (err) {
      console.error('[EventsList] Create failed:', err);
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
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Events</h2>
          <p className="text-slate-500 mt-1 text-sm">
            Live roadshow data from Firestore ·{' '}
            <span className="text-emerald-600 font-bold">{events.length} total</span>
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-slate-800 active:scale-[0.98] transition-all shadow-sm select-none min-h-[44px]"
        >
          <Plus size={18} />
          <span>New Event</span>
        </button>
      </header>

      {/* Create modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">Create New Event</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                  <XCircle size={24} />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Event Name</label>
                  <input
                    required type="text" value={newEvent.name}
                    onChange={e => setNewEvent({ ...newEvent, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    placeholder="e.g. Q4 London Luxury Roadshow"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">City</label>
                    <input
                      type="text" value={newEvent.city}
                      onChange={e => setNewEvent({ ...newEvent, city: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Country</label>
                    <input
                      type="text" value={newEvent.country}
                      onChange={e => setNewEvent({ ...newEvent, country: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Target Leads</label>
                    <input
                      type="number" value={newEvent.target_leads}
                      onChange={e => setNewEvent({ ...newEvent, target_leads: parseInt(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Budget Type</label>
                    <select
                      value={newEvent.is_sponsored ? 'true' : 'false'}
                      onChange={e => setNewEvent({ ...newEvent, is_sponsored: e.target.value === 'true' })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    >
                      <option value="false">Branch Funded</option>
                      <option value="true">Developer Sponsored</option>
                    </select>
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    type="submit" disabled={saving}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-60 select-none"
                  >
                    {saving ? 'Creating…' : 'Create Event'}
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
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text" value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Filter by name, city or status…"
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
          />
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-72 bg-slate-100 animate-pulse rounded-3xl" />
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
              className="group bg-white border border-slate-200 rounded-3xl p-6 hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 cursor-pointer select-none"
            >
              {/* Top row */}
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${STATUS_STYLE[event.status] ?? STATUS_STYLE.Draft}`}>
                  {event.status}
                </span>
                <div className="text-slate-300 group-hover:text-slate-900 transition-colors">
                  <ArrowRight size={18} />
                </div>
              </div>

              {/* Name */}
              <h3 className="text-lg font-extrabold text-slate-900 mb-1 leading-tight truncate">
                {event.name}
              </h3>

              {/* Sponsor badge */}
              {event.is_sponsored && event.sponsorship?.developer && (
                <div className="flex items-center gap-1.5 mb-4">
                  <Zap size={11} className="text-amber-500" />
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                    {event.sponsorship.developer} · AED {(event.sponsorship.amount_aed ?? 0).toLocaleString()}
                  </span>
                </div>
              )}
              {!event.is_sponsored && (
                <div className="mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Branch Funded</span>
                </div>
              )}

              {/* Info rows */}
              <div className="space-y-2.5 mt-2">
                <div className="flex items-center gap-2.5 text-slate-500 text-sm">
                  <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                  <span className="truncate">{event.location?.city ?? '—'}, {event.location?.country ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-500 text-sm">
                  <CalendarIcon size={14} className="text-slate-400 flex-shrink-0" />
                  <span>{fmtDateShort(event.date_start)} – {fmtDate(event.date_end)}</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-500 text-sm">
                  <Target size={14} className="text-slate-400 flex-shrink-0" />
                  <span>{event.actual_leads} / {event.target_leads} leads</span>
                </div>
              </div>

              {/* Lead progress bar */}
              <div className="mt-4">
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${event.status === 'Active' ? 'bg-emerald-500' : 'bg-blue-400'}`}
                    style={{ width: `${Math.min(100, event.target_leads > 0 ? (event.actual_leads / event.target_leads) * 100 : 0)}%` }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  {event.status === 'Active' ? (
                    <div className="flex items-center gap-1 text-emerald-600">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-widest">Live</span>
                    </div>
                  ) : event.status === 'Completed' ? (
                    <div className="flex items-center gap-1 text-blue-600">
                      <CheckCircle2 size={12} />
                      <span className="text-xs font-bold uppercase tracking-widest">Complete</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-slate-400">
                      <Clock size={12} />
                      <span className="text-xs font-bold uppercase tracking-widest">Upcoming</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-mono text-slate-300 truncate max-w-[120px]">{event.id}</span>
              </div>
            </motion.div>
          ))}

          {filtered.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
              <CalendarIcon size={40} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900">
                {filter ? 'No events match your filter' : 'No events yet'}
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                {filter ? 'Try a different search term.' : 'Create your first roadshow above.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
