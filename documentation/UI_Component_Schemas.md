# UI Component Data Schemas (Front-End Props)

**Purpose:** To define the exact data structures (props) that the front-end UI components must accept from the backend database. This ensures visual elements in Figma translate perfectly to functional React/Next.js components.

---

## 1. Component: EventOverviewCard
**Placement:** Organizer Dashboard (Active Events Grid)
**UX Purpose:** To give organizers a scannable, high-level summary of a roadshow before clicking into the deep analytics.

### Required Data Fields (Props Matrix)
| Field Name | Data Type | UI Element Mapping | Figma Design Note |
| :--- | :--- | :--- | :--- |
| `eventName` | String | Card Title (`<h2>`) | e.g., "London Luxury Roadshow 2026" |
| `locationCity` | String | Subtitle Text | Accompanied by a map pin icon 📍 |
| `dateRange` | String | Calendar Row | Formatted as "Oct 12 - Oct 15" 📅 |
| `totalBudgetAED` | Number | Financial Highlight | Formatted with commas (e.g., 150,000 AED) 💰 |
| `approvalStatus` | String | Status Badge | Determines badge color (Green = "Confirmed", Yellow = "Pending") |
| `attendeeCount` | Number | Avatar Stack | Drives the "X Agents Attending" text |

---

## 2. Component: CommissionTierCard
**Placement:** Agent Portal (Participation Survey)
**UX Purpose:** The interactive selection cards where agents choose the Gold, Silver, or Bronze packages. This must clearly communicate the financial risk vs. reward.

### Required Data Fields (Props Matrix)
| Field Name | Data Type | UI Element Mapping | Figma Design Note |
| :--- | :--- | :--- | :--- |
| `tierName` | String | Card Header | "Gold", "Silver", or "Bronze" |
| `commissionSplit` | Number | Massive Typography | Visual hook (50%, 30%, 20%) |
| `costResponsibility` | String | Warning Banner | "Agent Covers Costs" vs. "Branch Covers Costs" |
| `isSelected` | Boolean | CSS State Trigger | Highlights the card border when clicked |
| `historicalROI` | Number | Tooltip/Small Text | Optional: Shows average historical take-home for this tier |

---

## 3. Component: ApprovalQueueRow
**Placement:** Branch Manager Dashboard (Approvals Module)
**UX Purpose:** A dense, scannable data table row allowing managers to quickly process agent requests.

### Required Data Fields (Props Matrix)
| Field Name | Data Type | UI Element Mapping | Figma Design Note |
| :--- | :--- | :--- | :--- |
| `agentName` | String | Column 1 (Primary Text) | Bold text, pulled from CRM sync |
| `requestedTier` | String | Column 2 (Badge) | Visually color-coded (Gold/Silver/Bronze) |
| `historicalPenalty` | Boolean | Alert Icon ⚠️ | If true, shows a red warning icon next to the name indicating past no-shows |
| `timePending` | String | Column 3 (Muted Text) | e.g., "24 hours ago" |
| `actionHandlers` | Function | Action Buttons | `onApprove()` and `onReject()` triggers |

---

## 4. Component: FunnelAnalyticsWidget
**Placement:** Executive & Branch Analytics Dashboard
**UX Purpose:** To visually track the dynamic target dilution we established in the serverless backend.

### Required Data Fields (Props Matrix)
| Field Name | Data Type | UI Element Mapping | Figma Design Note |
| :--- | :--- | :--- | :--- |
| `funnelStageName` | String | Row Label | e.g., "Qualified Leads", "Scheduled Meetings" |
| `dynamicTarget` | Number | Ghost Bar / Outline | Shows the fractional target (e.g., 37.5) expected by the system |
| `actualAchieved` | Number | Solid Fill Bar | Shows CRM actuals (e.g., 40) overlapping the target |
| `variancePercent` | Number | Green/Red Indicator | e.g., "+6.6% Over Target" |

---

## 5. Component: DocumentVerificationModal
**Placement:** Organizer Logistics Desk
**UX Purpose:** A pop-up interface for organizers to quickly review agent flight and visa uploads.

### Required Data Fields (Props Matrix)
| Field Name | Data Type | UI Element Mapping | Figma Design Note |
| :--- | :--- | :--- | :--- |
| `agentName` | String | Modal Header | Contextual title |
| `visaDocumentUrl` | String | Image/PDF Viewer | Embedded iframe or secure image tag |
| `visaExpiryDate` | String | Expiry Warning Text | Flags red if expiry is before event end date |
| `flightDetails` | String | Text Block | Airline, flight number, arrival time |
