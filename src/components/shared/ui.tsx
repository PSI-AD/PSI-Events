/**
 * src/components/shared/ui.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * PSI Enterprise Design System — Shared Component Library
 *
 * Every component in this file uses ONLY the PSI CSS design-token utilities
 * (psi-card, psi-input, text-psi-*, bg-psi-*, border-psi, btn-accent, etc.)
 * so they automatically respect every UI theme (default / modern / glass /
 * corporate / minimal) and both light + dark modes.
 *
 * Usage: import { PageShell, PageHeader, SectionCard, StatCard, ... } from './shared/ui'
 *
 * Components exported:
 *   PageShell       — max-width content wrapper with standard padding
 *   PageHeader      — h2 + subtitle + optional right-side slot
 *   SectionCard     — titled card panel wrapper
 *   StatCard        — KPI metric card (icon, value, trend)
 *   DataTable       — responsive table wrapper with themed header/rows
 *   EmptyState      — zero-result placeholder pattern
 *   SearchBar       — icon-prefixed search input
 *   TabBar          — segmented tab strip
 *   StatusBadge     — contextual colored badge chip
 *   Btn             — primary / secondary / ghost / outline button variants
 *   SkeletonRows    — animated loading skeleton rows
 *   ProgressBar     — labelled progress bar
 *   SectionDivider  — consistent horizontal section break
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { Search } from 'lucide-react';
import { motion } from 'motion/react';

// ─── Utility ──────────────────────────────────────────────────────────────────

function cx(...classes: (string | false | null | undefined)[]): string {
    return classes.filter(Boolean).join(' ');
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE SHELL
// Standard content wrapper: padding + max-width constraint
// Usage: <PageShell>…page content…</PageShell>
// ═══════════════════════════════════════════════════════════════════════════

export function PageShell({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cx('p-4 md:p-6 lg:p-8 max-w-7xl mx-auto', className)}>
            {children}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE HEADER
// Standard h2 + subtitle with an optional right-aligned actions slot
// Usage: <PageHeader title="Events" subtitle="…" actions={<Btn>…</Btn>} />
// ═══════════════════════════════════════════════════════════════════════════

export function PageHeader({
    title,
    subtitle,
    actions,
    className,
}: {
    title: string;
    subtitle?: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
}) {
    return (
        <header
            className={cx(
                'flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8',
                className,
            )}
        >
            <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-psi-primary">
                    {title}
                </h2>
                {subtitle && (
                    <p className="text-psi-secondary mt-1 text-sm leading-relaxed">
                        {subtitle}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>
            )}
        </header>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION CARD
// Themed card with optional title row, divider, and body content.
// Usage: <SectionCard title="Revenue" headerRight={<button>…</button>}>…</SectionCard>
// ═══════════════════════════════════════════════════════════════════════════

export function SectionCard({
    title,
    subtitle,
    headerRight,
    children,
    className,
    bodyClassName,
    noPadding,
}: {
    title?: string;
    subtitle?: string;
    headerRight?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    bodyClassName?: string;
    noPadding?: boolean;
}) {
    const hasHeader = title || headerRight;
    return (
        <div className={cx('psi-card overflow-hidden', className)}>
            {hasHeader && (
                <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-psi">
                    <div>
                        {title && (
                            <h3 className="text-sm font-bold text-psi-primary leading-tight">
                                {title}
                            </h3>
                        )}
                        {subtitle && (
                            <p className="text-xs text-psi-muted mt-0.5">{subtitle}</p>
                        )}
                    </div>
                    {headerRight && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {headerRight}
                        </div>
                    )}
                </div>
            )}
            <div className={cx(!noPadding && 'p-5', bodyClassName)}>{children}</div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// STAT CARD
// KPI metric card with icon, value, trend indicator.
// Re-exported from here so all pages use one definition.
// Usage: <StatCard title="Revenue" value="AED 1.2M" change="+12%" trend="up" icon={<DollarSign />} />
// ═══════════════════════════════════════════════════════════════════════════

import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function StatCard({
    title,
    value,
    change,
    trend,
    icon,
    className,
}: {
    title: string;
    value: string;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
    icon?: React.ReactNode;
    className?: string;
}) {
    return (
        <motion.div
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={cx('psi-card p-5 shadow-sm select-none min-w-0', className)}
        >
            <div className="flex justify-between items-start mb-4">
                {icon && (
                    <div className="p-2.5 bg-psi-subtle rounded-xl flex-shrink-0">
                        {icon}
                    </div>
                )}
                {change && trend && trend !== 'neutral' && (
                    <div
                        className={cx(
                            'flex items-center gap-1 text-xs font-bold flex-shrink-0',
                            trend === 'up'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400',
                        )}
                    >
                        {trend === 'up' ? (
                            <ArrowUpRight size={13} />
                        ) : (
                            <ArrowDownRight size={13} />
                        )}
                        <span>{change}</span>
                    </div>
                )}
            </div>
            <div className="min-w-0">
                <p className="text-psi-secondary text-xs font-medium truncate">
                    {title}
                </p>
                <p className="text-xl md:text-2xl font-bold text-psi-primary mt-0.5 truncate tracking-tight tabular-nums">
                    {value}
                </p>
                {change && trend === 'neutral' && (
                    <p className="text-xs text-psi-muted mt-1">{change}</p>
                )}
            </div>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA TABLE
// Themed table wrapper — full token-driven header + row styling.
// Usage:
//   <DataTable columns={['Name','Role','Status']} loading={false} empty={filtered.length===0}>
//     {filtered.map(row => <tr>…</tr>)}
//   </DataTable>
// ═══════════════════════════════════════════════════════════════════════════

export function DataTable({
    columns,
    children,
    loading,
    empty,
    emptyMessage = 'No records found',
    minWidth = '600px',
}: {
    columns: string[];
    children?: React.ReactNode;
    loading?: boolean;
    empty?: boolean;
    emptyMessage?: string;
    minWidth?: string;
}) {
    if (loading) {
        return <SkeletonRows rows={5} />;
    }

    return (
        <div className="w-full overflow-x-auto">
            <table
                className="w-full text-left border-collapse"
                style={{ minWidth }}
            >
                <thead>
                    <tr className="bg-psi-subtle border-b border-psi">
                        {columns.map(col => (
                            <th
                                key={col}
                                className="px-5 py-3.5 text-[11px] font-bold text-psi-muted uppercase tracking-[0.08em] whitespace-nowrap"
                            >
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {empty ? (
                        <tr>
                            <td colSpan={columns.length}>
                                <div className="py-16 text-center">
                                    <p className="font-bold text-psi-primary">{emptyMessage}</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        children
                    )}
                </tbody>
            </table>
        </div>
    );
}

/** A single DataTable row — applies consistent hover + divider styles */
export function DataRow({
    children,
    onClick,
    className,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
}) {
    return (
        <tr
            onClick={onClick}
            className={cx(
                'border-b border-psi-subtle last:border-0 transition-colors',
                onClick && 'cursor-pointer hover:bg-psi-subtle/60',
                className,
            )}
        >
            {children}
        </tr>
    );
}

/** A DataTable cell — consistent padding */
export function DataCell({
    children,
    className,
}: {
    children?: React.ReactNode;
    className?: string;
}) {
    return (
        <td className={cx('px-5 py-3.5 text-sm text-psi-secondary', className)}>
            {children}
        </td>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// EMPTY STATE
// Full-width zero-results placeholder. Accepts an icon + message + optional CTA.
// ═══════════════════════════════════════════════════════════════════════════

export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
}: {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cx(
                'flex flex-col items-center justify-center py-20 text-center gap-3',
                className,
            )}
        >
            {icon && (
                <div className="w-14 h-14 rounded-2xl bg-psi-subtle flex items-center justify-center text-psi-muted mb-1">
                    {icon}
                </div>
            )}
            <p className="font-bold text-psi-primary">{title}</p>
            {description && (
                <p className="text-sm text-psi-secondary max-w-xs leading-relaxed">
                    {description}
                </p>
            )}
            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH BAR
// Standard icon-prefixed search input using psi-input token class.
// ═══════════════════════════════════════════════════════════════════════════

export function SearchBar({
    value,
    onChange,
    placeholder = 'Search…',
    className,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    className?: string;
}) {
    return (
        <div className={cx('relative', className)}>
            <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-psi-muted pointer-events-none"
                size={15}
            />
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="psi-input w-full pl-10 pr-4 py-2.5 text-sm"
            />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB BAR
// Horizontal segmented tab strip — active tab uses btn-accent token.
// ═══════════════════════════════════════════════════════════════════════════

export interface TabItem<T extends string = string> {
    id: T;
    label: string;
    icon?: React.ReactNode;
    count?: number;
}

export function TabBar<T extends string = string>({
    tabs,
    active,
    onChange,
    className,
}: {
    tabs: TabItem<T>[];
    active: T;
    onChange: (id: T) => void;
    className?: string;
}) {
    return (
        <div
            className={cx(
                'flex gap-1 bg-psi-subtle border border-psi p-1 rounded-xl w-fit flex-wrap',
                className,
            )}
        >
            {tabs.map(tab => {
                const isActive = tab.id === active;
                return (
                    <button
                        key={tab.id}
                        id={`tab-${tab.id}`}
                        onClick={() => onChange(tab.id)}
                        className={cx(
                            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 select-none',
                            isActive
                                ? 'btn-accent shadow-sm'
                                : 'text-psi-muted hover:text-psi-primary hover:bg-psi-surface',
                        )}
                    >
                        {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
                        <span>{tab.label}</span>
                        {tab.count !== undefined && (
                            <span
                                className={cx(
                                    'px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums',
                                    isActive
                                        ? 'bg-white/20 text-white'
                                        : 'bg-psi-border-subtle text-psi-muted',
                                )}
                            >
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// STATUS BADGE
// Contextual chip — success / warning / error / info / neutral.
// ═══════════════════════════════════════════════════════════════════════════

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

const BADGE_CLASSES: Record<BadgeVariant, string> = {
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    info: 'badge-info',
    neutral: 'badge-neutral',
};

export function StatusBadge({
    children,
    variant = 'neutral',
    className,
}: {
    children: React.ReactNode;
    variant?: BadgeVariant;
    className?: string;
}) {
    return (
        <span
            className={cx(
                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest',
                BADGE_CLASSES[variant],
                className,
            )}
        >
            {children}
        </span>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// BUTTON  (Btn)
// Wraps the design-system button tokens into a typed React component.
// variant: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
// ═══════════════════════════════════════════════════════════════════════════

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type BtnSize = 'sm' | 'md' | 'lg';

const BTN_VARIANTS: Record<BtnVariant, string> = {
    primary: 'btn-accent text-white shadow-sm',
    secondary: 'bg-psi-subtle text-psi-primary border border-psi hover:bg-psi-surface shadow-sm',
    ghost: 'text-psi-secondary hover:text-psi-primary hover:bg-psi-subtle',
    outline: 'btn-accent-outline',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm',
};

const BTN_SIZES: Record<BtnSize, string> = {
    sm: 'px-3 py-1.5 text-xs rounded-lg min-h-[32px]',
    md: 'px-4 py-2.5 text-sm rounded-xl min-h-[40px]',
    lg: 'px-6 py-3   text-sm rounded-xl min-h-[48px]',
};

export function Btn({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    iconRight,
    disabled,
    loading,
    onClick,
    type = 'button',
    className,
    id,
}: {
    children?: React.ReactNode;
    variant?: BtnVariant;
    size?: BtnSize;
    icon?: React.ReactNode;
    iconRight?: React.ReactNode;
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    className?: string;
    id?: string;
}) {
    return (
        <button
            id={id}
            type={type}
            disabled={disabled || loading}
            onClick={onClick}
            className={cx(
                'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 select-none',
                'active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                'disabled:opacity-40 disabled:pointer-events-none',
                BTN_VARIANTS[variant],
                BTN_SIZES[size],
                className,
            )}
        >
            {loading ? (
                <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <circle
                        className="opacity-25"
                        cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                </svg>
            ) : (
                icon && <span className="flex-shrink-0">{icon}</span>
            )}
            {children && <span>{children}</span>}
            {iconRight && !loading && (
                <span className="flex-shrink-0">{iconRight}</span>
            )}
        </button>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKELETON ROWS
// Animated shimmer placeholder while data loads.
// ═══════════════════════════════════════════════════════════════════════════

export function SkeletonRows({
    rows = 4,
    className,
}: {
    rows?: number;
    className?: string;
}) {
    return (
        <div className={cx('p-5 space-y-3', className)}>
            {Array.from({ length: rows }).map((_, i) => (
                <div
                    // eslint-disable-next-line react/no-array-index-key
                    key={i}
                    className="h-12 bg-psi-subtle animate-pulse rounded-xl"
                    style={{ opacity: 1 - i * 0.12 }}
                />
            ))}
        </div>
    );
}

/** A single shimmer line — for use inside custom layouts */
export function SkeletonLine({
    width = 'full',
    height = 'h-4',
    className,
}: {
    width?: string;
    height?: string;
    className?: string;
}) {
    return (
        <div
            className={cx(
                'bg-psi-subtle animate-pulse rounded-lg',
                height,
                width === 'full' ? 'w-full' : `w-${width}`,
                className,
            )}
        />
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS BAR
// Labelled progress bar using design-system color token classes.
// ═══════════════════════════════════════════════════════════════════════════

export function ProgressBar({
    label,
    sublabel,
    value,        // 0-100
    colorClass = 'bg-psi-accent',
    className,
}: {
    label?: string;
    sublabel?: string;
    value: number;
    colorClass?: string;
    className?: string;
}) {
    const pct = Math.min(100, Math.max(0, value));
    return (
        <div className={cx('space-y-1.5', className)}>
            {(label || sublabel) && (
                <div className="flex items-end justify-between gap-2">
                    <div>
                        {label && (
                            <p className="text-sm font-semibold text-psi-primary leading-tight">
                                {label}
                            </p>
                        )}
                        {sublabel && (
                            <p className="text-xs text-psi-muted">{sublabel}</p>
                        )}
                    </div>
                    <span className="text-sm font-bold text-psi-primary tabular-nums flex-shrink-0">
                        {Math.round(pct)}%
                    </span>
                </div>
            )}
            <div className="w-full bg-psi-subtle h-2 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={cx('h-full rounded-full', colorClass)}
                />
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION DIVIDER
// Consistent horizontal rule between major page sections.
// ═══════════════════════════════════════════════════════════════════════════

export function SectionDivider({ className }: { className?: string }) {
    return (
        <div className={cx('border-t border-psi', className)} role="separator" />
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// INLINE METRIC ROW
// A key-value pair row used inside cards (label left, value right).
// ═══════════════════════════════════════════════════════════════════════════

export function MetricRow({
    label,
    value,
    valueClass,
    className,
}: {
    label: string;
    value: React.ReactNode;
    valueClass?: string;
    className?: string;
}) {
    return (
        <div
            className={cx(
                'flex justify-between items-center py-2 border-b border-psi-subtle last:border-0 gap-4',
                className,
            )}
        >
            <span className="text-sm text-psi-secondary">{label}</span>
            <span className={cx('text-sm font-bold text-psi-primary', valueClass)}>
                {value}
            </span>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// AVATAR
// Deterministic coloured avatar from initials or a fallback icon.
// ═══════════════════════════════════════════════════════════════════════════

const AVATAR_PALETTE = [
    'bg-emerald-100 text-emerald-700',
    'bg-blue-100    text-blue-700',
    'bg-amber-100   text-amber-700',
    'bg-violet-100  text-violet-700',
    'bg-rose-100    text-rose-700',
    'bg-cyan-100    text-cyan-700',
];

export function Avatar({
    initials,
    seed,
    size = 'md',
    className,
}: {
    initials: string;
    seed?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}) {
    const s = seed ?? initials;
    const code =
        s.charCodeAt(0) + (s.charCodeAt(s.length - 1) || 0);
    const color = AVATAR_PALETTE[code % AVATAR_PALETTE.length];

    const sizeClass: Record<typeof size, string> = {
        sm: 'w-7 h-7 text-[10px]',
        md: 'w-9 h-9 text-xs',
        lg: 'w-12 h-12 text-sm',
    };

    return (
        <div
            className={cx(
                'rounded-full flex items-center justify-center font-bold flex-shrink-0 select-none',
                color,
                sizeClass[size],
                className,
            )}
            aria-label={initials}
        >
            {initials.slice(0, 2).toUpperCase()}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// ICON BUTTON
// Square icon-only button used in table action columns and toolbars.
// ═══════════════════════════════════════════════════════════════════════════

export function IconBtn({
    icon,
    label,
    onClick,
    variant = 'ghost',
    size = 'md',
    disabled,
    className,
}: {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    variant?: 'ghost' | 'outline';
    size?: 'sm' | 'md';
    disabled?: boolean;
    className?: string;
}) {
    const sizeClass = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
    const variantClass =
        variant === 'outline'
            ? 'border border-psi text-psi-muted hover:text-psi-primary hover:border-psi-strong'
            : 'text-psi-muted hover:text-psi-primary hover:bg-psi-subtle';

    return (
        <button
            aria-label={label}
            title={label}
            onClick={onClick}
            disabled={disabled}
            className={cx(
                'inline-flex items-center justify-center rounded-lg transition-all duration-150',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                'disabled:opacity-40 disabled:pointer-events-none active:scale-95',
                sizeClass,
                variantClass,
                className,
            )}
        >
            {icon}
        </button>
    );
}
