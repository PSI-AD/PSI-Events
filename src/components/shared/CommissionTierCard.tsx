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
 * Fully theme-aware — uses PSI design-system tokens.
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
          ? 'border-psi-action bg-psi-action-subtle shadow-md'
          : 'psi-card hover:border-psi-strong shadow-sm'}
      `}
    >
      {/* Card Header */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-psi-muted">
          {tierName} Tier
        </h3>
        {isSelected && (
          <div className="btn-accent p-1 rounded-full">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Commission number */}
      <div className="mb-6">
        <span className="text-6xl font-bold tracking-tighter text-psi-primary">
          {commissionSplit}%
        </span>
        <span className="text-psi-muted ml-2 font-medium">Split</span>
      </div>

      {/* Cost responsibility */}
      <div className={`
        px-3 py-2 rounded-lg text-xs font-semibold mb-4
        ${costResponsibility.toLowerCase().includes('agent')
          ? 'bg-psi-warning text-psi-warning border border-psi-accent'
          : 'bg-psi-info text-psi-info border border-psi-accent'}
      `}>
        {costResponsibility}
      </div>

      {/* Historical ROI */}
      {historicalROI !== undefined && (
        <div className="text-xs text-psi-muted flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Avg. Take-home: {historicalROI.toLocaleString()} AED
        </div>
      )}
    </motion.div>
  );
};
