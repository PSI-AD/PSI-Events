# Mathematical Helper Functions (/utils directory)

**Purpose:** To serve as the single source of truth for all financial P&L, commission splits, and dynamic target calculations across the Event Management Portal.

---

## 💰 1. File Spec: commissionCalculators.ts
This utility file handles the core 50/30/20 commission logic and determines exactly who absorbs the event and travel costs.

### 👤 Function: Calculate Agent Net Revenue
**Inputs Required:** `grossRevenue` (Number), `eventCost` (Number), `travelCost` (Number), `packageTier` (String).

**Mathematical Logic:**
*   **🥇 If Gold:** `(grossRevenue * 0.50) - (eventCost + travelCost)`
*   **🥈 If Silver:** `(grossRevenue * 0.30) - (eventCost + travelCost)`
*   **🥉 If Bronze:** `(grossRevenue * 0.20)` *(Subtract 0, as the branch covers costs)*

**Expected Output:** The final AED amount the agent takes home.

### 🏢 Function: Calculate Branch Gross Profit
**Inputs Required:** `grossRevenue` (Number), `eventCost` (Number), `travelCost` (Number), `packageTier` (String), `sponsorshipProfit` (Number - defaults to 0).

**Mathematical Logic:**
*   **🥇 If Gold:** `(grossRevenue * 0.50) + sponsorshipProfit` *(Branch pays 0 costs)*
*   **🥈 If Silver:** `(grossRevenue * 0.70) + sponsorshipProfit` *(Branch pays 0 costs)*
*   **🥉 If Bronze:** `(grossRevenue * 0.80) - (eventCost + travelCost) + sponsorshipProfit`

**Expected Output:** The Gross Profit for the branch before the Organizer takes their cut.

---

## 🤝 2. File Spec: sponsorshipCalculators.ts
This utility isolates the logic for developer-funded events versus branch-funded events.

### 🏢 Function: Calculate Sponsorship Profit
**Inputs Required:** `sponsorshipAmount` (Number), `eventCost` (Number), `sourceAgentReward` (Number).

**Mathematical Logic:**
`sponsorshipAmount - eventCost - sourceAgentReward`

**⚠️ Edge Case Guardrail:** If `sponsorshipAmount` is 0 or empty, the function must immediately return 0 without attempting to subtract the reward or costs (as those become branch liabilities).

### 📈 Function: Calculate Final Branch Net Profit
**Inputs Required:** `branchGrossProfit` (Number from previous function), `organizerCommissionPercent` (Number - e.g., 0.10).

**Mathematical Logic:**
`branchGrossProfit - (branchGrossProfit * organizerCommissionPercent)`

**Expected Output:** The absolute final bottom-line ROI for the branch.

---

## 🎯 3. File Spec: dynamicTargetCalculators.ts
This utility powers the Cloud Function and the Target vs. Actual dashboard, ensuring expectations scale perfectly with headcount.

### 👤 Function: Calculate Fractional Agent Targets
**Inputs Required:** `branchTotalTarget` (Number), `actualApprovedAgents` (Number).

**Mathematical Logic:**
`branchTotalTarget / actualApprovedAgents`

**🛠️ Strict Development Constraints:**
*   **🚫 Divide by Zero Protection:** If `actualApprovedAgents` equals 0, the function must forcibly return 0 to prevent a system crash.
*   **🔢 Float Precision:** The output must retain decimals (e.g., 37.5) and strictly must not be rounded up or down using standard math libraries. Rounding will corrupt the branch total when aggregating the dashboard.

**Expected Output:** The exact dynamic fractional target (applies to total leads, walk-ins, marketing leads, and deals).
