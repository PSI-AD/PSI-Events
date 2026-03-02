/**
 * traveldesk/FlightSearch.tsx
 * Agent-facing flight search + booking UI panel, and the shared FlightCard.
 *
 * Exports:
 *  - FlightCard           — a single rich flight result card
 *  - AgentFlightSearch    — the full search/booking flow for a single agent
 */

import React, { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Plane, Search, CheckCircle2, Loader2,
    ArrowRight, Luggage, DollarSign,
    AlertTriangle, RefreshCw,
    Lock, BadgeCheck, TrendingDown, Star,
} from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase/firebaseConfig';
import { addExpense } from '../../../services/firebase/expenseService';
import type { ApprovedAgent, EventTravelConfig, FlightOption } from './types';
import { mockSearchFlights, clsx, fmtAed, fmtDuration } from './data';

// ── Flight card ───────────────────────────────────────────────────────────────

export function FlightCard({
    flight, budget, onBook, booking,
}: {
    flight: FlightOption;
    budget: EventTravelConfig['budget'];
    onBook: (f: FlightOption) => void;
    booking: boolean;
}) {
    const overBudget = flight.price > budget.maxPerAgent;
    const saving = budget.maxPerAgent - flight.price;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx(
                'psi-card rounded-2xl overflow-hidden transition-all border',
                overBudget
                    ? 'border-rose-200 dark:border-rose-800/40 opacity-60'
                    : 'border-psi hover:border-amber-400/50'
            )}
        >
            {overBudget && (
                <div className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-500 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest">
                    <Lock size={9} /> Over Budget — {fmtAed(flight.price - budget.maxPerAgent)} above cap
                </div>
            )}
            {!overBudget && saving > 0 && (
                <div className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                    <TrendingDown size={9} /> Within budget — saves {fmtAed(saving)}
                </div>
            )}

            <div className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl flex-shrink-0 border border-slate-300 dark:border-slate-700">
                            {flight.logo}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-extrabold text-psi-primary text-sm">{flight.airline}</span>
                                <span className="text-psi-muted text-xs font-mono bg-psi-subtle px-1.5 py-0.5 rounded-md">{flight.flightNumber}</span>
                                <span className={clsx(
                                    'text-[10px] font-black px-2 py-0.5 rounded-full',
                                    flight.cabinClass === 'Business'
                                        ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                                        : 'bg-psi-subtle text-psi-muted border border-psi'
                                )}>
                                    {flight.cabinClass}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="font-black text-psi-primary text-base tabular-nums">{flight.departure}</span>
                                <div className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                                    <div className="flex items-center gap-1 w-full">
                                        <div className="h-px flex-1 bg-psi-muted/30" />
                                        <Plane size={12} className="text-psi-muted flex-shrink-0 rotate-90" />
                                        <div className="h-px flex-1 bg-psi-muted/30" />
                                    </div>
                                    <span className="text-psi-muted text-[10px] font-medium">
                                        {fmtDuration(flight.durationMins)}{flight.stops > 0 ? ` · via ${flight.stopCity}` : ' · Direct'}
                                    </span>
                                </div>
                                <span className="font-black text-psi-primary text-base tabular-nums">{flight.arrival}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                <span className="flex items-center gap-1 text-[10px] font-bold text-psi-muted bg-psi-subtle px-2 py-0.5 rounded-full">
                                    <Luggage size={9} /> {flight.baggageKg}kg
                                </span>
                                {flight.refundable && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                                        <CheckCircle2 size={9} /> Refundable
                                    </span>
                                )}
                                <span className="flex items-center gap-1 text-[10px] font-bold text-psi-muted bg-psi-subtle px-2 py-0.5 rounded-full">
                                    <Star size={9} className="text-amber-400" /> {flight.rating}
                                </span>
                                {flight.seatsLeft <= 3 && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full">
                                        <AlertTriangle size={9} /> {flight.seatsLeft} seats left
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 sm:gap-2 flex-shrink-0">
                        <div className="text-right">
                            <p className={clsx(
                                'text-2xl font-black font-mono leading-none tabular-nums',
                                overBudget ? 'text-rose-500' : 'text-psi-primary'
                            )}>
                                {fmtAed(flight.price)}
                            </p>
                            <p className="text-psi-muted text-[10px] mt-0.5">per person · one-way</p>
                        </div>
                        <motion.button
                            id={`book-flight-${flight.id}`}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => !overBudget && !booking && onBook(flight)}
                            disabled={overBudget || booking}
                            className={clsx(
                                'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md whitespace-nowrap',
                                overBudget
                                    ? 'bg-psi-subtle text-psi-muted border border-psi cursor-not-allowed'
                                    : booking
                                        ? 'bg-amber-500/50 text-slate-900 dark:text-white cursor-wait'
                                        : 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-900 dark:text-white shadow-amber-500/20'
                            )}
                        >
                            {booking ? (
                                <><Loader2 size={13} className="animate-spin" /> Booking…</>
                            ) : overBudget ? (
                                <><Lock size={13} /> Over Budget</>
                            ) : (
                                <><Plane size={13} /> Book This Flight</>
                            )}
                        </motion.button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ── Agent Flight Search panel ─────────────────────────────────────────────────

export function AgentFlightSearch({
    agent, config, useDemoData, onBooked,
}: {
    agent: ApprovedAgent;
    config: EventTravelConfig;
    useDemoData: boolean;
    onBooked: (agent: ApprovedAgent, flight: FlightOption, expenseRef: string) => void;
}) {
    const [phase, setPhase] = useState<'idle' | 'searching' | 'results' | 'booking' | 'confirmed'>('idle');
    const [flights, setFlights] = useState<FlightOption[]>([]);
    const [sortBy, setSortBy] = useState<'price' | 'duration' | 'rating'>('price');
    const [booked, setBooked] = useState<FlightOption | null>(agent.bookedFlight ?? null);
    const [expenseRef, setExpenseRef] = useState(agent.expenseRef ?? '');
    const [bookingId, setBookingId] = useState<string | null>(null);

    const isConfirmed = agent.status === 'confirmed' || phase === 'confirmed';

    const handleSearch = useCallback(async () => {
        setPhase('searching');
        try {
            const results = await mockSearchFlights(config.route, config.budget);
            setFlights(results);
            setPhase('results');
        } catch {
            setPhase('idle');
        }
    }, [config.route, config.budget]);

    const handleBook = async (flight: FlightOption) => {
        setPhase('booking');
        setBookingId(flight.id);
        try {
            const expRef = `EXP_${Date.now()}`;
            if (!useDemoData) {
                await setDoc(
                    doc(db, 'events', config.eventId, 'attendees', agent.id),
                    { status: 'Confirmed', bookedFlight: flight, confirmedAt: serverTimestamp() },
                    { merge: true }
                );
                await addExpense(
                    config.eventId,
                    {
                        amount: flight.price,
                        category: 'Travel',
                        subcategory: 'Flight',
                        paidBy: 'Agent',
                        description: `Auto-booked via Travel Desk: ${flight.flightNumber} ${config.route.from}→${config.route.to}`,
                        createdBy: agent.id,
                    },
                    agent.id
                );
            } else {
                await new Promise(r => setTimeout(r, 1400));
            }
            setBooked(flight);
            setExpenseRef(expRef);
            setPhase('confirmed');
            onBooked(agent, flight, expRef);
        } catch {
            setPhase('results');
            setBookingId(null);
        }
    };

    const sortedFlights = useMemo(() => {
        return [...flights].sort((a, b) => {
            if (sortBy === 'price') return a.price - b.price;
            if (sortBy === 'duration') return a.durationMins - b.durationMins;
            return b.rating - a.rating;
        });
    }, [flights, sortBy]);

    if (isConfirmed && booked) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-emerald-900/30 border border-emerald-700 rounded-2xl">
                    <BadgeCheck size={28} className="text-emerald-400 flex-shrink-0" />
                    <div>
                        <p className="text-emerald-300 font-extrabold text-sm">Flight Booked — Status: Confirmed</p>
                        <p className="text-emerald-500 text-xs mt-0.5">
                            Expense auto-posted to ledger · Ref: <span className="font-mono">{expenseRef || agent.expenseRef}</span>
                        </p>
                    </div>
                </div>
                <div className="psi-card rounded-2xl p-4 border border-psi">
                    <p className="text-psi-muted text-[10px] font-black uppercase tracking-widest mb-3">Your Booked Flight</p>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-lg">
                            {booked.logo}
                        </div>
                        <div className="flex-1">
                            <p className="font-extrabold text-psi-primary">{booked.airline} · {booked.flightNumber}</p>
                            <p className="text-psi-secondary text-xs">
                                {config.route.fromCity} {booked.departure} → {config.route.toCity} {booked.arrival} · {fmtDuration(booked.durationMins)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-black font-mono text-emerald-400">{fmtAed(booked.price)}</p>
                            <p className="text-psi-muted text-[10px]">auto-expensed</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-psi-subtle border border-psi rounded-xl">
                <Plane size={14} className="text-amber-500 flex-shrink-0" />
                <div className="flex items-center gap-2 text-sm font-bold text-psi-primary flex-wrap">
                    <span>{config.route.fromCity} ({config.route.from})</span>
                    <ArrowRight size={14} className="text-psi-muted flex-shrink-0" />
                    <span>{config.route.toCity} ({config.route.to})</span>
                    <span className="text-psi-muted font-normal text-xs">{config.route.date}</span>
                </div>
                <div className="ml-auto flex items-center gap-1.5 text-amber-500 text-xs font-black flex-shrink-0">
                    <DollarSign size={12} />
                    Budget cap: {fmtAed(config.budget.maxPerAgent)}
                </div>
            </div>

            {phase === 'idle' && (
                <motion.button
                    id={`search-flights-${agent.id}`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSearch}
                    className="w-full flex items-center justify-center gap-2.5 py-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-slate-900 dark:text-white font-extrabold text-sm shadow-lg shadow-blue-500/20 transition-all"
                >
                    <Search size={18} /> Search Available Flights
                </motion.button>
            )}

            {phase === 'searching' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4 py-12">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                        <Plane size={20} className="text-blue-400 absolute inset-0 m-auto" />
                    </div>
                    <div className="text-center">
                        <p className="text-psi-primary font-bold">Searching flights…</p>
                        <p className="text-psi-muted text-xs mt-1">Querying corporate travel API</p>
                    </div>
                    <div className="flex gap-1.5">
                        {['TravelPerk', 'Skyscanner', 'Amadeus'].map((s, i) => (
                            <motion.span key={s}
                                initial={{ opacity: 0.3 }}
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.4 }}
                                className="text-[10px] font-bold text-psi-muted bg-psi-subtle px-2 py-0.5 rounded-full border border-psi">
                                {s}
                            </motion.span>
                        ))}
                    </div>
                </motion.div>
            )}

            {(phase === 'results' || phase === 'booking') && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 bg-psi-subtle border border-psi rounded-xl p-1">
                            {(['price', 'duration', 'rating'] as const).map(s => (
                                <button key={s} onClick={() => setSortBy(s)}
                                    className={clsx(
                                        'px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize',
                                        sortBy === s ? 'bg-amber-500 text-slate-900 dark:text-white shadow-sm' : 'text-psi-muted hover:text-psi-primary'
                                    )}>
                                    {s}
                                </button>
                            ))}
                        </div>
                        <span className="text-psi-muted text-xs ml-auto">
                            {flights.filter(f => f.price <= config.budget.maxPerAgent).length} within budget
                        </span>
                        <button onClick={handleSearch} className="flex items-center gap-1 text-psi-muted hover:text-psi-primary text-xs font-bold transition-colors">
                            <RefreshCw size={11} /> Refresh
                        </button>
                    </div>
                    <div className="space-y-3">
                        {sortedFlights.map(f => (
                            <FlightCard
                                key={f.id}
                                flight={f}
                                budget={config.budget}
                                onBook={handleBook}
                                booking={phase === 'booking' && bookingId === f.id}
                            />
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
