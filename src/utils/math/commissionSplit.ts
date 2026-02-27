/**
 * commissionCalculators.ts
 * Handles the core 50/30/20 commission logic for PSI Roadshows.
 * Strictly follows Utils_Math_Specifications.md
 */

export type PackageTier = 'Gold' | 'Silver' | 'Bronze';

/**
 * Calculates the final AED amount the agent takes home.
 * 
 * 🥇 Gold: (grossRevenue * 0.50) - (eventCost + travelCost)
 * 🥈 Silver: (grossRevenue * 0.30) - (eventCost + travelCost)
 * 🥉 Bronze: (grossRevenue * 0.20)
 */
export const calculateAgentNetRevenue = (
  grossRevenue: number,
  eventCost: number,
  travelCost: number,
  packageTier: PackageTier
): number => {
  switch (packageTier) {
    case 'Gold':
      return (grossRevenue * 0.50) - (eventCost + travelCost);
    case 'Silver':
      return (grossRevenue * 0.30) - (eventCost + travelCost);
    case 'Bronze':
      return (grossRevenue * 0.20);
    default:
      return 0;
  }
};

/**
 * Calculates the Gross Profit for the branch before the Organizer takes their cut.
 * 
 * 🥇 Gold: (grossRevenue * 0.50) + sponsorshipProfit
 * 🥈 Silver: (grossRevenue * 0.70) + sponsorshipProfit
 * 🥉 Bronze: (grossRevenue * 0.80) - (eventCost + travelCost) + sponsorshipProfit
 */
export const calculateBranchGrossProfit = (
  grossRevenue: number,
  eventCost: number,
  travelCost: number,
  packageTier: PackageTier,
  sponsorshipProfit: number = 0
): number => {
  switch (packageTier) {
    case 'Gold':
      return (grossRevenue * 0.50) + sponsorshipProfit;
    case 'Silver':
      return (grossRevenue * 0.70) + sponsorshipProfit;
    case 'Bronze':
      return (grossRevenue * 0.80) - (eventCost + travelCost) + sponsorshipProfit;
    default:
      return 0;
  }
};
