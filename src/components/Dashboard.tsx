/**
 * Dashboard.tsx
 * Performance Overview — KPI cards + Revenue/Cost chart + Agent Packages pie.
 * Fully theme-aware: all colors reference PSI design-system tokens.
 * Uses shared component library from components/shared/ui.tsx
 */

import React from 'react';
import { TrendingUp, Target, DollarSign, Activity } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { PageShell, PageHeader, SectionCard, StatCard } from './shared/ui';
import ChecklistSummaryWidget from '../features/checklists/ChecklistSummaryWidget';

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
    <PageShell>
      <PageHeader
        title="Performance Overview"
        subtitle="Real-time ROI and lead funnel analytics."
      />

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          title="Total Revenue"
          value="AED 1.2M"
          change="+12.5%"
          trend="up"
          icon={<DollarSign size={18} className="text-emerald-500" />}
        />
        <StatCard
          title="Avg. ROI"
          value="245%"
          change="+4.2%"
          trend="up"
          icon={<TrendingUp size={18} className="text-blue-500" />}
        />
        <StatCard
          title="Active Leads"
          value="1,482"
          change="-2.1%"
          trend="down"
          icon={<Target size={18} className="text-amber-500" />}
        />
        <StatCard
          title="Conversion Rate"
          value="3.8%"
          change="+0.5%"
          trend="up"
          icon={<Activity size={18} className="text-violet-500" />}
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Revenue vs Cost chart */}
        <SectionCard
          title="Revenue vs Cost"
          className="lg:col-span-2"
          headerRight={
            <select className="psi-input text-xs px-3 py-1.5">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          }
        >
          <div className="h-72 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--psi-chart-grid)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--psi-chart-tick)', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--psi-chart-tick)', fontSize: 12 }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Agent Package Distribution */}
        <SectionCard title="Agent Packages">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2.5 mt-2 border-t border-psi pt-4">
            {pieData.map((item, idx) => (
              <div key={item.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx] }} />
                  <span className="text-sm text-psi-secondary">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-psi-primary tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ── Bottom row: Checklist widget + spacer ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <ChecklistSummaryWidget className="lg:col-span-1" />
      </div>
    </PageShell>
  );
}
