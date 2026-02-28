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
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Advanced Analytics</h2>
          <p className="text-slate-500 mt-1 text-sm">Granular ROI tracking and P&amp;L scenarios.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold uppercase tracking-widest">
            <Users size={14} />
            <span>{eventData?.attendee_count || 0} Agents Confirmed</span>
          </div>
          <button className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 transition-all shadow-sm">
            <Download size={16} />
            <span>Export Report</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Lead Funnel Target vs Actual */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Target size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Lead Funnel: Dynamic Per-Agent Targets</h3>
            </div>
            <div className="text-xs font-bold text-slate-400 uppercase">Target: {Math.round(eventData?.per_agent_target || 0)} leads/agent</div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dynamicFunnel} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="target" name="Dynamic Target" fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={20} />
                <Bar dataKey="actual" name="Actual Achieved" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* P&L Scenario Card */}
        <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Zap size={20} className="text-amber-400" />
            P&L: {eventData?.is_sponsored ? 'Sponsored' : 'Branch Funded'}
          </h3>

          <div className="space-y-6">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Branch Net Profit</div>
              <div className="text-2xl font-bold text-emerald-400">AED {eventData?.branch_net_profit?.toLocaleString() || '0'}</div>
            </div>

            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Gross Profit</div>
              <div className="text-2xl font-bold text-slate-200">AED {eventData?.gross_profit?.toLocaleString() || '0'}</div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Organizer Comm. (10%)</span>
                <span className="font-bold text-rose-400">-AED {eventData?.organizer_commission?.toLocaleString() || '0'}</span>
              </div>
              {eventData?.is_sponsored && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Sponsorship Profit</span>
                  <span className="font-bold text-emerald-400">+AED {eventData?.sponsorship_profit?.toLocaleString() || '0'}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total Expenses</span>
                <span className="font-bold">AED {eventData?.total_expenses?.toLocaleString() || '0'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Time-Lapse ROI */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Time-Lapse ROI Tracking</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timeLapseData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
                <Area type="monotone" dataKey="target" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={2} />
                <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={3} dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Branch Metrics */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <PieChartIcon size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Branch Opportunity Targets</h3>
          </div>
          <div className="space-y-6">
            <BranchProgress name="Dubai Marina" target={50} actual={42} color="bg-blue-500" />
            <BranchProgress name="Downtown" target={40} actual={38} color="bg-emerald-500" />
            <BranchProgress name="Business Bay" target={30} actual={15} color="bg-amber-500" />
            <BranchProgress name="Palm Jumeirah" target={20} actual={18} color="bg-purple-500" />
          </div>
        </div>
      </div>

      {/* ── Predictive Analytics & Sponsorship Engine ────────────── */}
      <div className="border-t border-slate-100 pt-8 md:pt-12">
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
          <div className="text-sm font-bold text-slate-900">{name}</div>
          <div className="text-xs text-slate-400 uppercase tracking-widest">{actual} / {target} Agents</div>
        </div>
        <div className="text-sm font-black text-slate-900">{Math.round(pct)}%</div>
      </div>
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
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
