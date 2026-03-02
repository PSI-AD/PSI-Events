/**
 * bounty/BountyCard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared bounty card component used in both Organizer and Agent views.
 * Displays incentive, status, countdown, claim info, and action buttons.
 */

import React from 'react';
import { motion } from 'motion/react';
import {
    Clock, Target, CheckCircle2, ShieldCheck, Zap,
    DollarSign, Percent, Package,
} from 'lucide-react';
import { clsx, formatCountdown, getInitials } from './utils';
import type { BountyDocument, BountyStatus, IncentiveType } from './types';
import { useEffect, useState } from 'react';

// ── StatusBadge ───────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: BountyStatus }) {
    const cfg = {
        active: { label: 'ACTIVE', bg: 'bg-emerald-500/10 border border-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-400', pulse: true },
        claimed: { label: 'CLAIMED', bg: 'bg-amber-500/10   border border-amber-500/30', text: 'text-amber-600   dark:text-amber-400', dot: 'bg-amber-400', pulse: false },
        verified: { label: 'VERIFIED', bg: 'bg-blue-500/10    border border-blue-500/30', text: 'text-blue-600    dark:text-blue-400', dot: 'bg-blue-400', pulse: false },
        expired: { label: 'EXPIRED', bg: 'bg-psi-subtle border border-psi', text: 'text-psi-muted', dot: 'bg-slate-400', pulse: false },
    }[status];

    return (
        <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase', cfg.bg, cfg.text)}>
            <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot, cfg.pulse && 'animate-pulse')} />
            {cfg.label}
        </span>
    );
}

// ── IncentiveIcon ─────────────────────────────────────────────────────────────

export function IncentiveIcon({ type, size = 16 }: { type: IncentiveType; size?: number }) {
    if (type === 'cash') return <DollarSign size={size} />;
    if (type === 'commission_pct') return <Percent size={size} />;
    return <Package size={size} />;
}

// ── CountdownTicker ───────────────────────────────────────────────────────────

export function CountdownTicker({ expiresAt, onExpire }: { expiresAt: string; onExpire?: () => void }) {
    const [tick, setTick] = useState(() => formatCountdown(expiresAt));

    useEffect(() => {
        const id = setInterval(() => {
            const next = formatCountdown(expiresAt);
            setTick(next);
            if (next.expired) {
                clearInterval(id);
                onExpire?.();
            }
        }, 1000);
        return () => clearInterval(id);
    }, [expiresAt, onExpire]);

    return (
        <span className={clsx(
            'font-mono font-extrabold tabular-nums',
            tick.expired ? 'text-psi-muted' :
                tick.urgent ? 'text-rose-500 dark:text-rose-400' :
                    'text-psi-primary'
        )}>
            {tick.text}
        </span>
    );
}

// ── BountyCard ────────────────────────────────────────────────────────────────

export function BountyCard({
    bounty,
    viewAs,
    onClaim,
    onVerify,
    onExpired,
}: {
    bounty: BountyDocument;
    viewAs: 'organizer' | 'agent';
    onClaim?: (id: string) => void;
    onVerify?: (id: string) => void;
    onExpired?: (id: string) => void;
}) {
    const isOrganizer = viewAs === 'organizer';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className={clsx(
                'psi-card rounded-2xl overflow-hidden transition-all duration-300',
                bounty.status === 'active' && 'ring-1 ring-emerald-500/30',
                bounty.status === 'claimed' && 'ring-1 ring-amber-500/30',
                bounty.status === 'verified' && 'ring-1 ring-blue-500/30',
            )}
        >
            {/* Colour accent bar */}
            <div className={clsx(
                'h-1 w-full',
                bounty.status === 'active' && 'bg-gradient-to-r from-emerald-400 to-teal-400',
                bounty.status === 'claimed' && 'bg-gradient-to-r from-amber-400 to-orange-400',
                bounty.status === 'verified' && 'bg-gradient-to-r from-blue-400 to-violet-400',
                bounty.status === 'expired' && 'bg-psi-subtle',
            )} />

            <div className="p-4 md:p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className={clsx(
                            'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                            bounty.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                                bounty.status === 'claimed' ? 'bg-amber-500/10   text-amber-500' :
                                    bounty.status === 'verified' ? 'bg-blue-500/10    text-blue-500' :
                                        'bg-psi-subtle     text-psi-muted'
                        )}>
                            <IncentiveIcon type={bounty.incentiveType} />
                        </div>
                        <div className="min-w-0">
                            <p className="font-extrabold text-psi-primary text-sm leading-tight truncate">
                                {bounty.targetProject}
                            </p>
                            <p className="text-[11px] text-psi-muted truncate">
                                Issued by {bounty.issuedBy}
                            </p>
                        </div>
                    </div>
                    <StatusBadge status={bounty.status} />
                </div>

                {/* Incentive display */}
                <div className={clsx(
                    'rounded-xl p-3 mb-3',
                    bounty.status === 'active' ? 'bg-emerald-500/8 border border-emerald-500/20' :
                        bounty.status === 'verified' ? 'bg-blue-500/8    border border-blue-500/20' :
                            'bg-psi-subtle    border border-psi'
                )}>
                    <p className="text-[10px] font-bold text-psi-muted uppercase tracking-widest mb-1">Reward</p>
                    <p className={clsx(
                        'text-xl font-extrabold tracking-tight',
                        bounty.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' :
                            bounty.status === 'verified' ? 'text-blue-600    dark:text-blue-400' :
                                'text-psi-primary'
                    )}>
                        {bounty.incentiveLabel}
                    </p>
                    {bounty.status === 'verified' && bounty.bonusAed != null && (
                        <p className="text-[10px] text-psi-muted mt-0.5">
                            ✓ {bounty.bonusAed.toLocaleString('en-AE')} AED added to Settlement
                        </p>
                    )}
                </div>

                {/* Timer + meta */}
                <div className="flex items-center justify-between text-xs text-psi-muted mb-4">
                    <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {bounty.status === 'active'
                            ? <CountdownTicker expiresAt={bounty.expiresAt} onExpire={() => onExpired?.(bounty.id)} />
                            : <span className="text-psi-muted">{bounty.durationMinutes} min window</span>
                        }
                    </span>
                    <span className="flex items-center gap-1">
                        <Target size={11} />
                        <span>{bounty.targetProject}</span>
                    </span>
                </div>

                {/* Claim info (if claimed / verified) */}
                {(bounty.status === 'claimed' || bounty.status === 'verified') && bounty.claimedByName && (
                    <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20">
                        <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-extrabold text-amber-600 dark:text-amber-400 flex-shrink-0">
                            {getInitials(bounty.claimedByName)}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-psi-primary leading-tight">{bounty.claimedByName}</p>
                            <p className="text-[10px] text-psi-muted">Claimed the lead</p>
                        </div>
                        {bounty.status === 'verified' && <CheckCircle2 size={14} className="text-blue-500 ml-auto flex-shrink-0" />}
                    </div>
                )}

                {/* Action buttons */}
                {bounty.status === 'active' && !isOrganizer && onClaim && (
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onClaim(bounty.id)}
                        className="w-full btn-accent py-3 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Zap size={16} className="fill-current" />
                        Claim This Bounty
                    </motion.button>
                )}
                {bounty.status === 'claimed' && isOrganizer && onVerify && (
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onVerify(bounty.id)}
                        className="w-full py-3 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-slate-900 dark:text-white transition-all"
                    >
                        <ShieldCheck size={16} />
                        Verify in CRM &amp; Approve
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
}
