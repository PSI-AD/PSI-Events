/**
 * Dashboard.tsx
 * Performance Overview — KPI cards + Revenue/Cost chart + Agent Packages pie.
 * Fully theme-aware: all colors reference PSI design-system tokens.
 */

import React from 'react';
import {
  TrendingUp,
  Users,
  Target,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const data = [
  { name: 'Jan', revenue: 4000, cost: 2400 },
  { name: 'Feb', revenue: 3000, cost: 1398 },
  { name: 'Mar', revenue: 2000, cost: 9800 },
  { name: 'Apr', revenue: 2780, cost: 3908 },
  { name: 'May', revenue: 1890, cost: 4800 },
  { name: 'Jun', revenue: 2390, cost: 3800 },
];

const pieData = [
  { name: 'Gold', value: 400 },
  { name: 'Silver', value: 300 },
  { name: 'Bronze', value: 300 },
];

const COLORS = ['#10b981', '#3b82f6', '#f59e0b'];

// ── Recharts tooltip — pulls from CSS token vars ─────────────────────────────
const chartTooltipStyle: React.CSSProperties = {
  backgroundColor: 'var(--psi-tooltip-bg)',
  border: '1px solid var(--psi-tooltip-border)',
  boxShadow: 'var(--psi-tooltip-shadow)',
  borderRadius: '12px',
  color: 'var(--psi-text-primary)',
  fontSize: '13px',
};

export default function Dashboard() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-psi-primary">
          Performance Overview
        </h2>
        <p className="text-psi-secondary mt-1 text-sm">
          Real-time ROI and lead funnel analytics.
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard
          title="Total Revenue"
          value="AED 1.2M"
          change="+12.5%"
          trend="up"
          icon={<DollarSign className="text-emerald-500" />}
        />
        <StatCard
          title="Avg. ROI"
          value="245%"
          change="+4.2%"
          trend="up"
          icon={<TrendingUp className="text-blue-500" />}
        />
        <StatCard
          title="Active Leads"
          value="1,482"
          change="-2.1%"
          trend="down"
          icon={<Target className="text-amber-500" />}
        />
        <StatCard
          title="Conversion Rate"
          value="3.8%"
          change="+0.5%"
          trend="up"
          icon={<Activity className="text-violet-500" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 psi-card p-8 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-psi-primary">Revenue vs Cost</h3>
            <select className="psi-input text-sm font-medium px-3 py-1.5">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--psi-chart-grid)"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--psi-chart-tick)', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--psi-chart-tick)', fontSize: 12 }}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Package Distribution */}
        <div className="psi-card p-8 shadow-sm">
          <h3 className="text-lg font-bold text-psi-primary mb-8">Agent Packages</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4 mt-4">
            {pieData.map((item, idx) => (
              <div key={item.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[idx] }}
                  />
                  <span className="text-sm font-medium text-psi-secondary">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-psi-primary tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  change,
  trend,
  icon,
}: {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ReactNode;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className="psi-card p-5 md:p-6 shadow-sm select-none min-w-0"
    >
      <div className="flex justify-between items-start mb-3 md:mb-4">
        {/* Icon container — uses subtle bg token */}
        <div className="p-2.5 md:p-3 bg-psi-subtle rounded-2xl flex-shrink-0">
          {icon}
        </div>
        {/* Trend badge */}
        <div
          className={`flex items-center gap-1 text-xs font-bold flex-shrink-0
            ${trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
        >
          {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{change}</span>
        </div>
      </div>
      <div className="min-w-0">
        <h4 className="text-psi-secondary text-xs md:text-sm font-medium truncate">{title}</h4>
        <p className="text-xl md:text-2xl font-bold text-psi-primary mt-0.5 truncate tracking-tight tabular-nums">
          {value}
        </p>
      </div>
    </motion.div>
  );
}
