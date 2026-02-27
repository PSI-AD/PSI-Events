import React from 'react';
import { motion } from 'motion/react';

interface CommissionTierCardProps {
  tierName: string;
  commissionSplit: number;
  costResponsibility: string;
  isSelected: boolean;
  historicalROI?: number;
  onSelect?: () => void;
}

/**
 * CommissionTierCard
 * Interactive selection card for agents to choose their commission package.
 * Strictly follows UI_Component_Schemas.md
 */
export const CommissionTierCard: React.FC<CommissionTierCardProps> = ({
  tierName,
  commissionSplit,
  costResponsibility,
  isSelected,
  historicalROI,
  onSelect,
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`
        relative cursor-pointer p-6 rounded-2xl border-2 transition-all duration-200
        ${isSelected 
          ? 'border-emerald-500 bg-emerald-50/50 shadow-md' 
          : 'border-zinc-200 bg-white hover:border-zinc-300 shadow-sm'}
      `}
    >
      {/* Card Header */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          {tierName} Tier
        </h3>
        {isSelected && (
          <div className="bg-emerald-500 text-white p-1 rounded-full">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Massive Typography */}
      <div className="mb-6">
        <span className="text-6xl font-bold tracking-tighter text-zinc-900">
          {commissionSplit}%
        </span>
        <span className="text-zinc-400 ml-2 font-medium">Split</span>
      </div>

      {/* Warning Banner / Cost Responsibility */}
      <div className={`
        px-3 py-2 rounded-lg text-xs font-semibold mb-4
        ${costResponsibility.toLowerCase().includes('agent') 
          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
          : 'bg-blue-100 text-blue-800 border border-blue-200'}
      `}>
        {costResponsibility}
      </div>

      {/* Historical ROI Tooltip/Small Text */}
      {historicalROI !== undefined && (
        <div className="text-xs text-zinc-400 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Avg. Take-home: {historicalROI.toLocaleString()} AED
        </div>
      )}
    </motion.div>
  );
};
