# 🛡️ Admin Manual — PSI Event Portal
**For:** Management, Organizers, Branch Managers, Internal Operators  
**Version:** 2.0 | **Last Updated:** March 2, 2026

---

## Role Hierarchy & Permissions

### Access Control Model
The system uses an **email-whitelist + Firebase Custom Claims** model. Access is granted in two steps:

1. **Whitelist Check:** Google login is checked against an approved email list. Only `@propertyshopinvest.com` emails (or specifically whitelisted personal accounts like `propertyshopinvest@gmail.com`) are permitted.
2. **Role Claims:** Once authenticated, the user's Firebase token contains a `role` claim that filters data server-side.

### Role Matrix

| Role | Data Scope | Route Access |
|---|---|---|
| **Organizer / Admin** | All events, all branches, all P&L, all expenses | All 37 routes |
| **Branch Manager** | Own branch agents, approvals, and P&L only | Dashboard, Approvals, Settlement, Analytics |
| **Agent (Sales)** | Own leads, own QR pass, own settlement only | Check-In (personal pass), Checklist, AI tools |
| **L&D Team** | Attendee lists, assessment management | Team roster, Compliance |
| **Developer (External)** | Tokenized read-only proposal/brochure | `/pitch/:token`, `/digital-brochure`, `/sponsor/:token` |

> ⚠️ **Security Principle:** All role restrictions are enforced via **Firestore Security Rules** (server-side). Client-side hiding is cosmetic only.

---

## Admin Dashboard (`/`)

### Live KPI Cards
The dashboard uses three concurrent `onSnapshot` Firestore listeners:

| KPI | Source Collection | Query |
|---|---|---|
| Total Active Leads | `crm_leads` | All documents |
| Conversion Rate | `crm_leads` | `status == 'deal_closed'` |
| Total Revenue | `event_rosters` | `SUM(closedRevenueAed)` |
| Avg Commission Split | `event_rosters` | `AVG(commissionSplit)` |

### Revenue vs Budget Chart
Pulls from `crm_events` and builds a time-series area chart comparing:
- Actual revenue (emerald fill)
- Total budget allocation (muted fill)
- Calculated at render time from Firestore snapshot

### Agent Tier Distribution Pie
Pulls from `event_rosters` and aggregates:
- Gold tier agents → **amber**
- Silver tier agents → **slate**
- Bronze tier agents → **brown**

---

## Managing Events

### Creating Events (`/events`)
1. Click **"New Event"**
2. Fill: Name, City, Country, Target Leads, Budget Type (Branch Funded / Developer Sponsored)
3. Firestore path: `events/{auto-id}`
4. Default status: `Draft`

### Event Status Flow
```
Draft → Active → Completed
```
Status is updated manually or via Firestore document update from the Settings panel or Organizer interface.

---

## Approvals Queue (`/approvals`)

### How Approvals Work
1. Agent submits participation survey → document written to `events/{id}/attendees/{agentId}`
2. Document appears in Manager's Approvals Queue
3. Manager sees: agent name, branch, commission tier selected, historical no-show flags (⚠️ badge)
4. AI risk score visible beside each pending approval (Low / Medium / High)
5. Manager clicks **Approve** or **Reject**
6. On **Approve:** agent receives notification + document upload prompt
7. On **Reject:** agent sees rejection with optional reason

### No-Show Penalty
If an agent receives **Confirmed** status but fails to appear on event day (no QR check-in), a `penalized_no_show: true` flag is written to their `crm_users` historical record. This flag is **immutable** via the client — it can only be removed via a Cloud Function admin call.

---

## Document Verification

After a manager approves an agent, the agent uploads:
1. Passport scan
2. Visa scan (if required)
3. Flight booking confirmation

The Organiser verifies these in the **Approvals Queue** under the agent's expanded view. Once verified:
- `documents_verified: true` is written to `events/{id}/attendees/{agentId}`
- Agent is cleared to receive their QR pass

### Document Storage Path
```
Firebase Storage: agent_documents/{userId}/{taskId}_{originalFilename}
```
Example: `agent_documents/usr_123/visa_upload_passport_scan.pdf`

---

## Settlement Management (`/settlement`)

### Running a Final Settlement
1. Navigate to `/settlement`
2. Select the event from the roster
3. For each agent, enter their **Closed Revenue (AED)**
4. The `CommissionEngine.ts` calculates:
   - `agentPayout = closedRevenue × tierPercentage`
   - `branchGrossProfit = totalRevenue − SUM(agentPayouts)`
   - `netROI = (grossProfit / totalCosts) * 100`
5. Click **"Generate Final Settlement Report"**
6. Print as PDF or export

### Commission Advance Management (`/cash-advance`)
- Tracks advance amounts per agent per event
- Automatically flags if advance > projected payout
- Links to event roster for reconciliation

---

## Compliance & Media (`/compliance`)

A review interface for brand compliance of event marketing materials:
- Upload event social media images/videos
- Review against PSI brand guidelines
- Approve or reject with annotated feedback
- Status stored in Firestore with timestamp

---

## Burn Rate Auditor (`/burn-rate`)

Live expense consumption dashboard:
- Shows total approved budget vs. committed spend
- Breaks down costs by category: Venue, Hospitality, Travel, Marketing, Miscellaneous
- Color-coded burn rate gauge: 
  - Green ≤ 60% spent
  - Amber 60–80%
  - Red > 80%
- Source collection: `event_expenses`

---

## Seeding & Data Management

### Production Data Seeding
> **⚠️ WARNING:** Never run the seeder against the production Firebase project. Use only for development/staging.

Two seed functions are accessible from the `/login` page (DEV buttons):

1. **"🚀 Inject Full Demo Data"** — Calls `injectSeedData()` via `firebaseSeeder.ts`
   - Creates: 5 events, 20 agents, 5 projects, 50 leads, 20 rosters, 10 expenses, 5 agent debts

2. **"🎯 Inject Presentation Data"** — Calls `injectPresentationData()`
   - Creates the exact data payload used for the executive demo
   - Deterministic IDs so data can be linked in demo flows

Both use Firestore `writeBatch` for atomic writes — all-or-nothing.

---

## Live HQ Management (`/live`)

A public-facing display screen for use on event day (typically on a wall screen at the PSI booth):
- Shows live lead count, agent check-in count
- Event countdown timers
- Real-time leaderboard (if connected to `event_rosters`)
- No login required — designed for large display visibility

---

## System Manual (In-App Admin View)

The **System Manual** at `/manual` is accessible to all authenticated users. It provides a 4-section visual overview of the system — useful for onboarding new managers on-site.

---

## Troubleshooting (Admin)

| Issue | Diagnosis | Resolution |
|---|---|---|
| Agent's QR pass not generating | `documents_verified` is false | Verify their documents in Approvals Queue |
| KPI dashboard shows 0 | No data in Firestore collections | Run the demo seeder from `/login` |
| Expense burn rate not updating | `event_expenses` listener may be failing | Check Firestore Rules — Agents/Managers are blocked from this collection |
| Agent showing ⚠️ no-show badge | `historical_kpis.penalized_no_show: true` in their user doc | Contact Cloud Functions admin to review and potentially reset |
| Settlement math incorrect | Wrong tier assigned to roster entry | Re-open the settlement form and reassign the correct tier |
| AI features not working | `VITE_GEMINI_API_KEY` not set or expired | Rotate key in `.env.local` and redeploy |
