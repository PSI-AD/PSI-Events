# 📦 Product Documentation — PSI Event Portal
**Version:** 2.0 | **Last Updated:** March 2, 2026  
**Audience:** Product Managers, Stakeholders, QA Teams

---

## Product Overview

The **PSI Event Portal** is a custom enterprise SPA built for **Property Shop Investment LLC** that manages the complete lifecycle of international real estate roadshow events. It replaces manual spreadsheet tracking, disconnected WhatsApp approvals, and untracked expense management with a single, auditable, real-time platform.

**Core Problem Solved:**  
Running International roadshows is a logistical and financial blind spot. Tracking the exact ROI, agent compliance, and target dilution across spreadsheets is inefficient and risky. The PSI Portal eliminates this.

---

## Platform Architecture Summary

| Layer | Technology |
|---|---|
| **Frontend** | React 19 SPA + Vite 6 build system |
| **Routing** | React Router DOM v7 (37 routes) |
| **Database** | Firebase Firestore v12 (real-time) |
| **Auth** | Firebase Auth (Google SSO, email whitelist) |
| **Storage** | Firebase Storage (agent documents) |
| **AI** | Google GenAI (`@google/genai`) |
| **Hosting** | Firebase Hosting |
| **Build** | Vite code-splitting — each route is a separate JS chunk |

---

## Core Feature Categories

### 1. Event Lifecycle Management
The system manages roadshow events from inception to post-mortem:

**Creation Phase:**
- Organizers create event records with: name, location (city/country), date range, lead target, budget type (branch-funded or developer-sponsored)
- Status starts as `Draft` and transitions through `Active` → `Completed`

**Registration Phase:**
- Agents submit participation surveys selecting Gold/Silver/Bronze commission tier
- Managers receive real-time approval requests per agent
- AI risk-scoring assists manager decisions (Low/Medium/High risk per agent)

**Verification Phase:**
- Approved agents upload visa, passport, and flight documents
- Organizers verify documents digitally — clearing agents for QR pass generation

**Execution Phase:**
- Day-of: Agents display QR pass; Organizers scan with in-app scanner
- Real-time lead distribution begins
- Traffic Controller monitors event floor zones
- VIP Intercept flags and captures high-value leads immediately

**Post-Event Phase:**
- Settlement calculation generates per-agent payout reports
- Executive Debrief produces full P&L summary
- Predictive Engine updates City-level ROI models for future events

---

### 2. Financial Math Engine

**Commission Package Matrix:**

| Package | Agent Share | Cost Responsibility |
|---|---|---|
| 🥇 Gold | 50% of closed revenue | Agent pays all event & travel costs |
| 🥈 Silver | 30% of closed revenue | Shared — varies by event agreement |
| 🥉 Bronze | 20% of closed revenue | Branch pays all costs |

**Dynamic Lead Target Dilution:**  
If a branch targets 300 leads via 3 agents and 4 agents are approved:
```
Per-Agent Target = 300 ÷ 4 = 75 leads
```
This recalculation cascades through the full funnel:
- Marketing Leads (×0.5)
- Walk-ins (×0.5)
- Qualified Leads (×0.3)
- Meetings (×0.1)
- Deals (×0.01)

**Sponsorship P&L Calculation:**
```
Branch Net Profit = 
  Total Closed Revenue
  − Agent Commissions (sum of tier%)
  − Event Costs (if branch-funded)
  − Travel Costs (if tier < Gold or branch-funded)
  + Sponsorship Amount (if developer-sponsored)
```

---

### 3. AI-Powered Tools (7 Features)

| Feature | AI Capability | User Benefit |
|---|---|---|
| Follow-Up Copilot | Message generation (tone-aware) | Personalized lead follow-up in 30 seconds |
| AI Pitch Simulator | Conversation roleplay | Agent objection handling training |
| Business Card Scanner | Computer vision OCR | Physical card → CRM in 1 tap |
| Localized Pitch | Multilingual generation | Native-language pitch for any buyer |
| VIP Concierge | Formal messaging | Premium concierge tone for VIP clients |
| AI Approvals | Risk scoring | Faster, data-driven approval decisions |
| Predictive Analytics | ML forecasting | City-level ROI predictions for future events |

---

### 4. Real-Time Data Architecture

Every primary user-facing list uses Firebase `onSnapshot`:
```
User opens /events
  → useEffect registers onSnapshot listener
  → Firestore sends initial snapshot
  → setEvents(docs)
  → Firestore pushes updates as they occur
  → Component re-renders in real time
  → useEffect cleanup: unsubscribe on unmount
```

This means:
- If an event is created on one screen → it instantly appears on all other screens
- KPI cards update without refresh
- Agent check-in status propagates to Organizer scanner in real time

---

### 5. Security Model

**Authentication:** Google SSO with email whitelist  
**Authorization:** Firebase Custom Claims (`role: organizer | manager | agent | l_and_d`)  
**Data Firewall:** Firestore Security Rules enforce all role restrictions server-side

**Zero Trust Principle:** Even if an agent reverse-engineers the client JS, Firestore will return `403 Permission Denied` for any collection not permitted by their role claim.

**Key Security Boundaries:**
- Agents **cannot** read `events/{id}/expenses` (company P&L)
- Agents **cannot** read `analytics_snapshots` (gross profit data)
- Agents **can only** read their own attendee document (not other agents' records)
- Managers **can only** read agents from their own branch

---

### 6. External Portals (Token-Gated)

Three public-facing portals accessible without login:

| Portal | Route | Audience | Access |
|---|---|---|---|
| Developer Pitch | `/pitch/:token` | Real estate developers | JWT token via email |
| Sponsor Dashboard | `/sponsor/:token` | Developer sponsors | JWT token |
| Client Brochure | `/client-portal/:token` | Property investors | QR code or link |

These portals are **read-only** and their tokens expire based on configuration.

---

### 7. Gamification System

**Bounty Board (`/bounties`):**  
Monthly performance challenges:
- Top Closer: First agent to close 3 deals in a single roadshow
- Polyglot: Successfully pitch in 3 different languages
- Early Bird: Check in before 08:00 on day 1 of event

**Agent Leaderboard:**  
Live leaderboard embedded in `LiveHQ` and accessible during events showing:
- Leads captured per agent
- Conversion rate ranking
- Deal value ranking

---

### 8. Compliance & Media Management

**Checklist Engine (`/checklist`):**  
Rule-driven task list managing pre-event compliance:
- Tasks can be: manual checkbox, file upload, or linked assessment
- Upload tasks auto-complete on successful Firebase Storage write
- Deadline tracking with URGENT highlighting (within 12h of deadline)
- Progress bar visible on the main dashboard via `ChecklistSummaryWidget`

**Media Compliance (`/compliance`):**  
Brand standard enforcement for event marketing materials:
- Upload event photos/videos
- Score against PSI brand guidelines
- Approve/reject workflow with timestamp audit trail

---

## Known Platform Limitations (v2.0)

| Limitation | Current State | Planned Resolution |
|---|---|---|
| Auth guard | Dashboard accessible without login | Full `<ProtectedRoute>` guard planned for Phase 2 |
| Analytics calculation | Client-side only (no Cloud Functions in production) | Phase 2 backend functions |
| CRM integration | Manual seeding only (no live CRM webhook) | Phase 2 API integration |
| Multi-language UI | English only (AI features multi-language) | Phase 3 i18n |
| Mobile optimization | Responsive but desktop-first | Phase 2 dedicated mobile pass view |

---

## Version History

| Version | Date | Key Changes |
|---|---|---|
| 1.0 | Q4 2025 | Initial: events, proposals, settlement, check-in |
| 1.5 | Feb 2026 | Added: AI tools, gamification, analytics, onSnapshot migration |
| 2.0 | Mar 2026 | Added: collapsible sidebar, UX Trinity, demo fallback, 37 routes, full RLS diagram |
