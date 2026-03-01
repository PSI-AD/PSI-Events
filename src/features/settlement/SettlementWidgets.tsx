/**
 * settlement/SettlementWidgets.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Presentational UI sub-components used inside SettlementDashboard.
 * Keeps the main file focused on state orchestration.
 *
 * Exports:
 *   StatCard        — KPI metric tile
 *   TierBadge       — Risk tier pill
 *   CurrencySelector — Dropdown with flag + name + reference rate
 *   AgentRow        — Editable agent input row
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Trash2 } from 'lucide-react';
import type { AgentEntry, RiskTier, SupportedCurrency } from './CommissionEngine';
import { CURRENCY_CATALOGUE, REFERENCE_FX_RATES, TIER_CONFIG } from './CommissionEngine';

function clsx(...classes: (string | false | undefined | null)[]) {
    return classes.filter(Boolean).join(' ');
}

// ── StatCard ──────────────────────────────────────────────────────────────────

export function StatCard({
    label, value, sub, accent, icon,
}: {
    label: string;
    value: string;
    sub?: string;
    accent: 'gold' | 'emerald' | 'blue' | 'red' | 'violet';
    icon: React.ReactNode;
}) {
    const accentMap = {
        gold: { ring: 'ring-amber-500/30', text: 'text-amber-400', bg: 'bg-amber-500/10' },
        emerald: { ring: 'ring-emerald-500/30', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        blue: { ring: 'ring-blue-500/30', text: 'text-blue-400', bg: 'bg-blue-500/10' },
        red: { ring: 'ring-red-500/30', text: 'text-red-400', bg: 'bg-red-500/10' },
        violet: { ring: 'ring-violet-500/30', text: 'text-violet-400', bg: 'bg-violet-500/10' },
    };
    const c = accentMap[accent];
    return (
        <div className={clsx('psi-card rounded-2xl p-4 md:p-5 ring-1 select-none min-w-0', c.ring)}>
            <div className={clsx('w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center mb-2 md:mb-3 flex-shrink-0', c.bg)}>
                <span className={c.text}>{icon}</span>
            </div>
            <div className="min-w-0">
                <p className="text-[10px] md:text-xs text-psi-muted font-semibold uppercase tracking-widest mb-0.5 truncate">{label}</p>
                <p className={clsx('text-lg md:text-xl lg:text-2xl font-bold tracking-tight truncate', c.text)}>{value}</p>
                {sub && <p className="text-[10px] md:text-xs text-psi-muted mt-0.5 truncate">{sub}</p>}
            </div>
        </div>
    );
}

// ── TierBadge ─────────────────────────────────────────────────────────────────

export function TierBadge({ tier }: { tier: RiskTier }) {
    const cfg = TIER_CONFIG[tier];
    return (
        <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full', cfg.tailwindBadge)}>
            {cfg.label}
        </span>
    );
}

// ── CurrencySelector ──────────────────────────────────────────────────────────

export function CurrencySelector({
    value,
    onChange,
}: {
    value: SupportedCurrency;
    onChange: (c: SupportedCurrency) => void;
}) {
    const [open, setOpen] = useState(false);
    const selected = CURRENCY_CATALOGUE.find(c => c.code === value)!;

    return (
        <div className="relative">
            <button
                type="button"
                id="currency-selector-btn"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 psi-card rounded-xl text-left hover:bg-psi-subtle transition-all select-none"
            >
                <div className="flex items-center gap-2">
                    <span className="text-xl">{selected.flag}</span>
                    <div>
                        <p className="text-psi-primary text-sm font-bold">{selected.code}</p>
                        <p className="text-psi-muted text-[10px]">{selected.name}</p>
                    </div>
                </div>
                <ChevronDown size={14} className={`text-psi-muted transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute left-0 right-0 mt-1.5 psi-card rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                        {CURRENCY_CATALOGUE.map(cur => (
                            <button
                                key={cur.code}
                                type="button"
                                onClick={() => { onChange(cur.code); setOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-psi-subtle transition-colors border-b border-psi last:border-0 ${cur.code === value ? 'bg-psi-subtle' : ''}`}
                            >
                                <span className="text-xl">{cur.flag}</span>
                                <div>
                                    <p className={`text-sm font-bold ${cur.code === value ? 'text-amber-600 dark:text-amber-400' : 'text-psi-primary'}`}>{cur.code}</p>
                                    <p className="text-psi-muted text-[10px]">{cur.name}</p>
                                </div>
                                <span className="ml-auto text-xs text-psi-muted font-mono">{REFERENCE_FX_RATES[cur.code].toFixed(4)} AED</span>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── AgentRow ──────────────────────────────────────────────────────────────────

export function AgentRow({
    agent, onChange, onRemove, localCurrency,
}: {
    key?: React.Key;
    agent: AgentEntry;
    onChange: (updated: AgentEntry) => void;
    onRemove: () => void;
    localCurrency: SupportedCurrency;
}) {
    const currMeta = CURRENCY_CATALOGUE.find(c => c.code === localCurrency)!;
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="psi-card rounded-xl p-3"
        >
            {/* Row 1: Name, Branch, Tier */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_36px] gap-2 md:gap-3 mb-2">
                <input id={`agent-name-${agent.id}`} type="text" value={agent.name}
                    onChange={e => onChange({ ...agent, name: e.target.value })}
                    placeholder="Agent full name" className="psi-input px-3 py-2.5 text-sm min-h-[44px]" />
                <input id={`agent-branch-${agent.id}`} type="text" value={agent.branch}
                    onChange={e => onChange({ ...agent, branch: e.target.value })}
                    placeholder="Branch / office" className="psi-input px-3 py-2.5 text-sm min-h-[44px]" />
                <div className="relative">
                    <select id={`agent-tier-${agent.id}`} value={agent.tier}
                        onChange={e => onChange({ ...agent, tier: e.target.value as RiskTier })}
                        className="psi-input w-full px-3 py-2.5 text-sm pr-8 min-h-[44px] appearance-none">
                        <option value="gold">Gold (50%)</option>
                        <option value="silver">Silver (30%)</option>
                        <option value="bronze">Bronze (20%)</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-psi-muted pointer-events-none" />
                </div>
                <button id={`remove-agent-${agent.id}`} onClick={onRemove}
                    className="flex items-center justify-center w-full md:w-9 h-9 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors min-h-[44px] md:min-h-0">
                    <Trash2 size={15} />
                </button>
            </div>

            {/* Row 2: Revenue + Costs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-psi-muted font-bold">AED</span>
                    <input id={`agent-revenue-${agent.id}`} type="number" min={0}
                        value={agent.closedRevenue || ''}
                        onChange={e => onChange({ ...agent, closedRevenue: Number(e.target.value) })}
                        placeholder="Gross revenue"
                        className="psi-input w-full pl-11 pr-3 py-2.5 text-sm min-h-[44px]" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-psi-muted pointer-events-none">Gross Rev.</span>
                </div>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-psi-muted font-bold">{currMeta.symbol}</span>
                    <input id={`agent-travel-${agent.id}`} type="number" min={0}
                        value={agent.travelCostLocal || ''}
                        onChange={e => onChange({ ...agent, travelCostLocal: Number(e.target.value) })}
                        placeholder="Travel cost"
                        className="psi-input w-full pl-8 pr-3 py-2.5 text-sm border-violet-300 dark:border-violet-700/40 focus:ring-violet-500/50 focus:border-violet-500 min-h-[44px]" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-psi-muted pointer-events-none">Travel ({localCurrency})</span>
                </div>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-psi-muted font-bold">{currMeta.symbol}</span>
                    <input id={`agent-event-cost-${agent.id}`} type="number" min={0}
                        value={agent.eventCostLocal || ''}
                        onChange={e => onChange({ ...agent, eventCostLocal: Number(e.target.value) })}
                        placeholder="Stand share"
                        className="psi-input w-full pl-8 pr-3 py-2.5 text-sm border-violet-300 dark:border-violet-700/40 focus:ring-violet-500/50 focus:border-violet-500 min-h-[44px]" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-psi-muted pointer-events-none">Stand ({localCurrency})</span>
                </div>
            </div>
        </motion.div>
    );
}
