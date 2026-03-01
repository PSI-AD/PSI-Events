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
  ChevronDown,
  PieChart as PieChartIcon,
  Target,
  Zap,
  TrendingUp,
  Users
} from 'lucide-react';
import { motion } from 'motion/react';
import { PageShell, PageHeader, SectionCard, ProgressBar, Btn, StatusBadge } from './shared/ui';

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
    <PageShell className="space-y-8">
      <PageHeader
        title="Advanced Analytics"
        subtitle="Granular ROI tracking and P&L scenarios."
        actions={
          <>
            <StatusBadge variant="success">
              <Users size={12} />
              <span>{eventData?.attendee_count || 0} Agents</span>
            </StatusBadge>
            <Btn icon={<Download size={15} />}>
              <span className="hidden sm:inline">Export Report</span>
              <span className="sm:hidden">Export</span>
            </Btn>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Lead Funnel Target vs Actual */}
        <SectionCard
          title="Lead Funnel: Dynamic Per-Agent Targets"
          className="lg:col-span-2"
          headerRight={
            <div className="text-xs font-bold text-psi-muted uppercase">
              Target: {Math.round(eventData?.per_agent_target || 0)} leads/agent
            </div>
          }
        >
          <div className="h-72 mt-2">
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
        </SectionCard>

        {/* P&L Scenario Card */}
        <SectionCard title={`P&L: ${eventData?.is_sponsored ? 'Sponsored' : 'Branch Funded'}`}>
          <div className="space-y-4">
            <div className="p-3.5 bg-psi-subtle rounded-xl border border-psi">
              <div className="text-xs font-bold text-psi-muted uppercase tracking-widest mb-1">Branch Net Profit</div>
              <div className="text-xl font-bold text-emerald-500 dark:text-emerald-400 truncate">AED {eventData?.branch_net_profit?.toLocaleString() || '0'}</div>
            </div>
            <div className="p-3.5 bg-psi-subtle rounded-xl border border-psi">
              <div className="text-xs font-bold text-psi-muted uppercase tracking-widest mb-1">Gross Profit</div>
              <div className="text-xl font-bold text-psi-primary truncate">AED {eventData?.gross_profit?.toLocaleString() || '0'}</div>
            </div>
            <div className="pt-3 border-t border-psi space-y-2">
              <div className="flex justify-between text-sm gap-2">
                <span className="text-psi-secondary flex-shrink-0">Organizer Comm. (10%)</span>
                <span className="font-bold text-rose-500 dark:text-rose-400">-AED {eventData?.organizer_commission?.toLocaleString() || '0'}</span>
              </div>
              {eventData?.is_sponsored && (
                <div className="flex justify-between text-sm gap-2">
                  <span className="text-psi-secondary flex-shrink-0">Sponsorship Profit</span>
                  <span className="font-bold text-emerald-500 dark:text-emerald-400">+AED {eventData?.sponsorship_profit?.toLocaleString() || '0'}</span>
                </div>
              )}
              <div className="flex justify-between text-sm gap-2">
                <span className="text-psi-secondary flex-shrink-0">Total Expenses</span>
                <span className="font-bold text-psi-primary">AED {eventData?.total_expenses?.toLocaleString() || '0'}</span>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Time-Lapse ROI Tracking">
          <div className="h-72 mt-2">
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
        </SectionCard>

        <SectionCard title="Branch Opportunity Targets">
          <div className="space-y-5 mt-1">
            <ProgressBar label="Dubai Marina" sublabel="42 / 50 Agents" value={84} colorClass="bg-blue-500" />
            <ProgressBar label="Downtown" sublabel="38 / 40 Agents" value={95} colorClass="bg-emerald-500" />
            <ProgressBar label="Business Bay" sublabel="15 / 30 Agents" value={50} colorClass="bg-amber-500" />
            <ProgressBar label="Palm Jumeirah" sublabel="18 / 20 Agents" value={90} colorClass="bg-violet-500" />
          </div>
        </SectionCard>
      </div>

      <div className="border-t border-psi pt-8">
        <PredictiveAnalyticsDashboard defaultCity="London" targetMargin={40} />
      </div>
    </PageShell>
  );
}
