import React, { useState, useEffect } from 'react';
import PredictiveAnalyticsDashboard from '../features/analytics/PredictiveAnalyticsDashboard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  ComposedChart,
  Area
} from 'recharts';
import {
  Download,
  Calendar,
  ChevronDown,
  PieChart as PieChartIcon,
  Target,
  Zap,
  TrendingUp,
  Users
} from 'lucide-react';
import { motion } from 'motion/react';

const funnelData = [
  { name: 'Marketing Leads', target: 300, actual: 280 },
  { name: 'Walk-ins', target: 150, actual: 165 },
  { name: 'Qualified', target: 135, actual: 120 },
  { name: 'Meetings', target: 40, actual: 35 },
  { name: 'Deals', target: 5, actual: 4 },
];

const timeLapseData = [
  { name: 'Event Day', target: 10, actual: 8 },
  { name: '1 Month', target: 25, actual: 22 },
  { name: '3 Months', target: 60, actual: 55 },
  { name: '6 Months', target: 100, actual: 95 },
];

export default function Analytics() {
  const [eventData, setEventData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, we'd pass the actual event ID
    fetch('/api/events')
      .then(res => res.json())
      .then(events => {
        if (events.length > 0) {
          return fetch(`/api/events/${events[0].id}/financials`);
        }
      })
      .then(res => res?.json())
      .then(data => {
        setEventData(data);
        setLoading(false);
      });
  }, []);

  const dynamicFunnel = funnelData.map(item => ({
    ...item,
    target: Math.round(item.target * (eventData?.per_agent_target / 100 || 1))
  }));

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 md:space-y-12">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-psi-primary">Advanced Analytics</h2>
          <p className="text-psi-secondary mt-1 text-sm">Granular ROI tracking and P&amp;L scenarios.</p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 badge-success rounded-xl text-xs font-bold uppercase tracking-widest select-none">
            <Users size={14} />
            <span>{eventData?.attendee_count || 0} Agents</span>
          </div>
          <button className="flex items-center gap-2 bg-slate-900 dark:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-600 active:scale-[0.98] transition-all shadow-sm select-none min-h-[44px]">
            <Download size={16} />
            <span className="hidden sm:inline">Export Report</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Lead Funnel Target vs Actual */}
        <div className="lg:col-span-2 psi-card p-8 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-psi-info text-blue-600 dark:text-blue-400 rounded-lg">
                <Target size={20} />
              </div>
              <h3 className="text-lg font-bold text-psi-primary">Lead Funnel: Dynamic Per-Agent Targets</h3>
            </div>
            <div className="text-xs font-bold text-psi-muted uppercase">Target: {Math.round(eventData?.per_agent_target || 0)} leads/agent</div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dynamicFunnel} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--psi-chart-grid)" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--psi-chart-tick)', fontSize: 12 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--psi-chart-tick)', fontSize: 12, fontWeight: 500 }} />
                <Tooltip
                  cursor={{ fill: 'var(--psi-bg-subtle)' }}
                  contentStyle={{ backgroundColor: 'var(--psi-tooltip-bg)', border: '1px solid var(--psi-tooltip-border)', boxShadow: 'var(--psi-tooltip-shadow)', borderRadius: '12px', color: 'var(--psi-text-primary)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="target" name="Dynamic Target" fill="var(--psi-border-strong)" radius={[0, 4, 4, 0]} barSize={20} />
                <Bar dataKey="actual" name="Actual Achieved" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* P&L Scenario Card */}
        <div className="bg-psi-raised border border-psi p-5 md:p-8 rounded-3xl shadow-xl select-none">
          <h3 className="text-lg font-bold text-psi-primary mb-5 flex items-center gap-2">
            <Zap size={20} className="text-amber-400" />
            P&amp;L: {eventData?.is_sponsored ? 'Sponsored' : 'Branch Funded'}
          </h3>

          <div className="space-y-4 md:space-y-6">
            <div className="p-4 bg-psi-subtle rounded-2xl border border-psi min-w-0">
              <div className="text-xs font-bold text-psi-muted uppercase tracking-widest mb-1">Branch Net Profit</div>
              <div className="text-xl md:text-2xl font-bold text-emerald-500 dark:text-emerald-400 truncate">AED {eventData?.branch_net_profit?.toLocaleString() || '0'}</div>
            </div>

            <div className="p-4 bg-psi-subtle rounded-2xl border border-psi min-w-0">
              <div className="text-xs font-bold text-psi-muted uppercase tracking-widest mb-1">Gross Profit</div>
              <div className="text-xl md:text-2xl font-bold text-psi-primary truncate">AED {eventData?.gross_profit?.toLocaleString() || '0'}</div>
            </div>

            <div className="pt-3 md:pt-4 border-t border-psi space-y-2 md:space-y-3">
              <div className="flex justify-between text-sm gap-2">
                <span className="text-psi-secondary flex-shrink-0">Organizer Comm. (10%)</span>
                <span className="font-bold text-rose-500 dark:text-rose-400 truncate">-AED {eventData?.organizer_commission?.toLocaleString() || '0'}</span>
              </div>
              {eventData?.is_sponsored && (
                <div className="flex justify-between text-sm gap-2">
                  <span className="text-psi-secondary flex-shrink-0">Sponsorship Profit</span>
                  <span className="font-bold text-emerald-500 dark:text-emerald-400 truncate">+AED {eventData?.sponsorship_profit?.toLocaleString() || '0'}</span>
                </div>
              )}
              <div className="flex justify-between text-sm gap-2">
                <span className="text-psi-secondary flex-shrink-0">Total Expenses</span>
                <span className="font-bold text-psi-primary truncate">AED {eventData?.total_expenses?.toLocaleString() || '0'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Time-Lapse ROI */}
        <div className="psi-card p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-psi-accent-subtle text-emerald-600 dark:text-emerald-400 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-lg font-bold text-psi-primary">Time-Lapse ROI Tracking</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timeLapseData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--psi-chart-grid)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--psi-chart-tick)', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--psi-chart-tick)', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--psi-tooltip-bg)', border: '1px solid var(--psi-tooltip-border)', boxShadow: 'var(--psi-tooltip-shadow)', borderRadius: '12px', color: 'var(--psi-text-primary)' }}
                />
                <Legend iconType="circle" />
                <Area type="monotone" dataKey="target" fill="var(--psi-border)" stroke="var(--psi-border-strong)" strokeWidth={2} />
                <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={3} dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: 'var(--psi-surface)' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Branch Metrics */}
        <div className="psi-card p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-psi-warning text-amber-600 dark:text-amber-400 rounded-lg">
              <PieChartIcon size={20} />
            </div>
            <h3 className="text-lg font-bold text-psi-primary">Branch Opportunity Targets</h3>
          </div>
          <div className="space-y-6">
            <BranchProgress name="Dubai Marina" target={50} actual={42} color="bg-blue-500" />
            <BranchProgress name="Downtown" target={40} actual={38} color="bg-emerald-500" />
            <BranchProgress name="Business Bay" target={30} actual={15} color="bg-amber-500" />
            <BranchProgress name="Palm Jumeirah" target={20} actual={18} color="bg-violet-500" />
          </div>
        </div>
      </div>

      {/* ── Predictive Analytics & Sponsorship Engine ────────────── */}
      <div className="border-t border-psi pt-8 md:pt-12">
        <PredictiveAnalyticsDashboard defaultCity="London" targetMargin={40} />
      </div>
    </div>
  );
}

function BranchProgress({ name, target, actual, color }: { name: string; target: number; actual: number; color: string }) {
  const pct = Math.min(100, (actual / target) * 100);
  return (
    <div>
      <div className="flex justify-between items-end mb-2">
        <div>
          <div className="text-sm font-bold text-psi-primary">{name}</div>
          <div className="text-xs text-psi-muted uppercase tracking-widest">{actual} / {target} Agents</div>
        </div>
        <div className="text-sm font-black text-psi-primary tabular-nums">{Math.round(pct)}%</div>
      </div>
      <div className="w-full bg-psi-subtle h-2 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  );
}
