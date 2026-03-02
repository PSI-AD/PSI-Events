/**
 * burnrate/BurnRateWidgets.tsx
 * Sub-components for the BurnRateAuditor widget:
 *  - BurnBar        — animated progress bar with over-budget flash
 *  - CategoryRow    — per-category spend row with a mini bar
 *  - KPICard        — metric mini card (Daily Budget, Burn Rate, etc.)
 */

import React from 'react';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';
import type { ExpenseCategory } from '../../../types/expense';

// ── Formatter (local, avoids circular import from BurnRateAuditor) ─────────────

export function fmtAED(n: number): string {
    return new Intl.NumberFormat('en-AE', {
        style: 'currency', currency: 'AED',
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(Math.abs(n));
}

// ── Animated progress bar ─────────────────────────────────────────────────────

export function BurnBar({ ratio, barClass }: { ratio: number; barClass: string }) {
    const pct = Math.min(ratio * 100, 100);
    const overPct = ratio > 1 ? Math.min((ratio - 1) * 100, 100) : 0;

    return (
        <div className="relative w-full h-3 bg-psi-subtle rounded-full overflow-hidden">
            {/* Expected budget line */}
            <div className="absolute top-0 left-0 h-full bg-slate-300 rounded-full" style={{ width: '100%' }} />
            {/* Actual spend bar */}
            <motion.div
                className={`absolute top-0 left-0 h-full rounded-full ${barClass}`}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
            />
            {/* Over-budget flash overlay */}
            {overPct > 0 && (
                <motion.div
                    className="absolute top-0 right-0 h-full bg-rose-400/40 rounded-r-full"
                    style={{ width: `${overPct}%` }}
                    animate={{ opacity: [0.4, 0.9, 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                />
            )}
        </div>
    );
}

// ── Category bar row ──────────────────────────────────────────────────────────

export function CategoryRow({
    category, amount, total, isFrozenCategory,
}: {
    category: ExpenseCategory;
    amount: number;
    total: number;
    isFrozenCategory: boolean;
}) {
    const pct = total > 0 ? (amount / total) * 100 : 0;
    const catColors: Record<ExpenseCategory, string> = {
        Venue: 'bg-blue-500',
        Hospitality: 'bg-violet-500',
        Marketing: 'bg-pink-500',
        Travel: 'bg-amber-500',
    };

    return (
        <div className={`flex items-center gap-3 py-2 transition-opacity ${isFrozenCategory ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-2 w-28 flex-shrink-0">
                {isFrozenCategory && <Lock size={10} className="text-rose-500 flex-shrink-0" />}
                <span className="text-xs font-semibold text-psi-secondary truncate">{category}</span>
            </div>
            <div className="flex-1">
                <div className="h-2 bg-psi-subtle rounded-full overflow-hidden">
                    <motion.div
                        className={`h-full rounded-full ${catColors[category]}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                    />
                </div>
            </div>
            <div className="w-28 text-right flex-shrink-0">
                <span className="text-xs font-bold text-psi-primary font-mono">{fmtAED(amount)}</span>
                <span className="text-[10px] text-psi-muted ml-1">({pct.toFixed(0)}%)</span>
            </div>
        </div>
    );
}

// ── KPI mini card ─────────────────────────────────────────────────────────────

export function KPICard({
    label, value, sub, colorClass, icon,
}: {
    label: string;
    value: string;
    sub?: string;
    colorClass: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="psi-card rounded-2xl p-4 flex flex-col gap-1">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 ${colorClass.replace('text-', 'bg-').replace('-600', '-500/10').replace('-400', '-500/10')}`}>
                <span className={colorClass}>{icon}</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-psi-muted">{label}</p>
            <p className={`text-xl font-extrabold font-mono ${colorClass}`}>{value}</p>
            {sub && <p className="text-[10px] text-psi-muted">{sub}</p>}
        </div>
    );
}
