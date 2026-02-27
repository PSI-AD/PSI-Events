/**
 * analytics.ts
 * Type definitions for the ROI Analytics Dashboard.
 */

export interface FinancialSnapshot {
  totalGrossRevenue: number;
  totalEventCost: number;
  grossProfit: number;
  branchNetProfit: number;
  sponsorshipAmount: number;
  sponsorshipProfit: number;
}

export interface FunnelStage {
  stageName: string;
  dynamicTarget: number;
  actualAchieved: number;
  variancePercent: number;
}

export interface AnalyticsSnapshot {
  eventId: string;
  branchName: string;
  financials: FinancialSnapshot;
  funnel: FunnelStage[];
  updatedAt: any; // Firestore Timestamp
}
