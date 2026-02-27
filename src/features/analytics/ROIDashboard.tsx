import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, DollarSign, PieChart, ShieldAlert, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AnalyticsSnapshot, FunnelStage } from '../../types/analytics';

interface ROIDashboardProps {
  snapshot: AnalyticsSnapshot;
  userRole: 'organizer' | 'manager' | 'agent' | 'l_and_d';
}

/**
 * ROIDashboard
 * Executive ROI Analytics Dashboard.
 * Strictly follows Utils_Math_Specifications.md, UI_Component_Schemas.md, and Firestore_Security_Rules_Logic.md
 */
export const ROIDashboard: React.FC<ROIDashboardProps> = ({
  snapshot,
  userRole
}) => {
  const isAgent = userRole === 'agent';
  const { financials, funnel } = snapshot;

  // Agent Blindfold Check (Firestore_Security_Rules_Logic.md)
  if (isAgent) {
    return (
      <div className="p-12 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-center space-y-4">
        <div className="bg-zinc-100 p-4 rounded-full text-zinc-400">
          <ShieldAlert size={48} />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900">Access Restricted</h2>
        <p className="text-zinc-500 max-w-md">
          Executive financial metrics and sponsorship margins are restricted to Management and Organizers. 
          Please refer to your personal attendee dashboard for your specific targets and net revenue.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top-Level KPI Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          label="Total Gross Revenue" 
          value={financials.totalGrossRevenue} 
          icon={<TrendingUp className="text-emerald-500" />} 
        />
        <KPICard 
          label="Total Event Cost" 
          value={financials.totalEventCost} 
          icon={<DollarSign className="text-amber-500" />} 
        />
        <KPICard 
          label="Gross Profit" 
          value={financials.grossProfit} 
          icon={<PieChart className="text-blue-500" />} 
        />
        <KPICard 
          label="Branch Net Profit" 
          value={financials.branchNetProfit} 
          icon={<LandmarkIcon className="text-indigo-500" />} 
          isHighlight
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Financial P&L Widget */}
        <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <LandmarkIcon size={20} className="text-zinc-400" />
            Financial P&L Breakdown
          </h3>
          
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1">Developer Sponsorship</p>
              <p className="text-2xl font-bold text-emerald-900">{financials.sponsorshipAmount.toLocaleString()} <span className="text-sm font-normal">AED</span></p>
              <p className="text-xs text-emerald-600 mt-1 font-medium">Sponsorship Profit: {financials.sponsorshipProfit.toLocaleString()} AED</p>
            </div>

            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Branch Contribution</p>
              <p className="text-2xl font-bold text-zinc-900">
                {(financials.totalGrossRevenue - financials.sponsorshipAmount).toLocaleString()} <span className="text-sm font-normal text-zinc-400">AED</span>
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-zinc-500">Final ROI Margin</span>
              <span className="text-lg font-bold text-zinc-900">
                {((financials.branchNetProfit / financials.totalGrossRevenue) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Target vs. Actual Funnel Widget */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <Target size={20} className="text-zinc-400" />
            Dynamic Target vs. Actual Funnel
          </h3>

          <div className="space-y-6">
            {funnel.map((stage, idx) => (
              <FunnelRow key={idx} stage={stage} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ label, value, icon, isHighlight = false }: { label: string, value: number, icon: React.ReactNode, isHighlight?: boolean }) => (
  <div className={`p-6 rounded-2xl border ${isHighlight ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-200 text-zinc-900'} shadow-sm`}>
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2 rounded-lg ${isHighlight ? 'bg-zinc-800' : 'bg-zinc-50'}`}>
        {icon}
      </div>
    </div>
    <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isHighlight ? 'text-zinc-500' : 'text-zinc-400'}`}>{label}</p>
    <p className="text-2xl font-bold tracking-tight">{value.toLocaleString()} <span className="text-sm font-normal opacity-50">AED</span></p>
  </div>
);

const FunnelRow: React.FC<{ stage: FunnelStage }> = ({ stage }) => {
  const isOverTarget = stage.actualAchieved >= stage.dynamicTarget;
  const progress = Math.min((stage.actualAchieved / stage.dynamicTarget) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-sm font-bold text-zinc-900">{stage.stageName}</p>
          <p className="text-xs text-zinc-400">Target: {stage.dynamicTarget.toFixed(1)}</p>
        </div>
        <div className="text-right">
          <div className={`flex items-center gap-1 text-sm font-bold ${isOverTarget ? 'text-emerald-600' : 'text-amber-600'}`}>
            {isOverTarget ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {stage.variancePercent > 0 ? '+' : ''}{stage.variancePercent.toFixed(1)}%
          </div>
          <p className="text-xs font-bold text-zinc-900">{stage.actualAchieved} Achieved</p>
        </div>
      </div>
      <div className="h-3 bg-zinc-100 rounded-full overflow-hidden relative">
        {/* Target Outline/Ghost Bar */}
        <div className="absolute inset-y-0 left-0 border-r-2 border-zinc-300 z-10" style={{ width: '100%' }} />
        {/* Actual Progress */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className={`h-full transition-all ${isOverTarget ? 'bg-emerald-500' : 'bg-amber-500'}`}
        />
      </div>
    </div>
  );
};

const LandmarkIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="3" y1="21" x2="21" y2="21"></line>
    <line x1="3" y1="7" x2="21" y2="7"></line>
    <line x1="4" y1="7" x2="4" y2="21"></line>
    <line x1="9" y1="7" x2="9" y2="21"></line>
    <line x1="15" y1="7" x2="15" y2="21"></line>
    <line x1="20" y1="7" x2="20" y2="21"></line>
    <path d="M2 7l10-5 10 5"></path>
  </svg>
);
