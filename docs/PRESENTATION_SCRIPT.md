# PSI Event Portal — Executive Boardroom Presentation Script
### Property Shop Investment LLC · Management Demo
**Date:** 2 March 2026 · **Presenter:** ___________________

---

## ⚡ Pre-Demo Checklist (Do This Before the Room Fills)

> Complete every step **before** the presentation starts. Do not skip.

- [ ] **1. Run the Database Seeder** — Open the app in your browser, navigate to the Login page, click the low-opacity **"DEV: Run Seeder"** button at the bottom of the screen. Wait for the "Data Injection Successful" alert. This populates all mock events, agents, and financial data.
- [ ] **2. Clear Browser Cache** — Open DevTools (`Cmd + Shift + I` on Mac / `F12` on Windows), go to the **Application** tab → **Storage** → click **"Clear site data"**. This ensures no stale state shows on screen.
- [ ] **3. Open the App in Full Screen** — Press **`F11`** (Windows) or **`Ctrl + Cmd + F`** (Mac) to go fullscreen. The dark UI is designed for projector screens — it will look far better full-screen.
- [ ] **4. Pre-navigate to the Dashboard** — Start the demo on the main Dashboard (`/`), collapsed sidebar, dark mode ON.
- [ ] **5. Mute Notifications** — Enable Do Not Disturb on your laptop before the demo.

---

## Phase 1 — The Hook (The Problem)

> 🎯 **Goal:** Create urgency. Make management feel the pain of the current process before showing the solution.

**[No screen action needed. Make eye contact with the room.]**

---

### Talking Points

> *"Before I show you the portal, I want to be honest about where we are today."*

> *"Currently, running international roadshows is a **logistical and financial blind spot**. We spend hundreds of thousands of AED on each event — venue, flights, hotels, developer sponsorship — but tracking the exact ROI, agent compliance, and target dilution across spreadsheets and WhatsApp groups is **inefficient and, frankly, risky**."*

> *"We have had situations where an agent boards a plane without uploading their visa copy. We have had post-event commission disputes that took weeks to resolve because two people had different Excel files. We have had developer sponsorships that we could not justify with data when the developer asked for an ROI report."*

> *"Every one of those problems costs us money, time, and credibility. This portal exists to eliminate all three."*

**[Pause. Let it land. Then open the laptop.]**

---

## Phase 2 — The Solution (The Dashboard & Math Engine)

> 🎯 **Goal:** Show that this is not a CRM — it is a **deterministic revenue engine**. The math does the management for you.

**[Action: Navigate to the main Dashboard at `/`]**

---

### Talking Points

> *"This is the **PSI Event Portal**."*

> *"It is not a CRM. A CRM stores data. This **generates decisions**."*

> *"Look at the top — you can see real-time KPIs: Total Revenue, Average ROI, Active Leads, and Conversion Rate. All of this updates the moment a deal closes in the system. No waiting for a Monday morning report."*

**[Scroll down to the Checklist Summary widget.]**

> *"Notice the Logistics Compliance widget. At a glance, the manager can see that this agent is **85% compliant** with their pre-event checklist. One click takes you to the full breakdown. We will look at that in a moment."*

**[Navigate to the Analytics page at `/analytics`.]**

> *"Now, the part I am most excited to show you. The **Serverless Target Engine**."*

> *"Here is the logic: If we need **300 qualified leads** from a Moscow roadshow, and we approve **4 agents**, the system automatically dilutes the target to **75 leads per agent**. That is fair. Every agent knows their number before the plane takes off."*

> *"But here is the critical part — if one agent **drops out** the night before, the math **instantly recalculates** to 100 leads per the remaining three agents. No phone calls. No arguments. The system is the arbiter."*

> *"**Absolute fairness. Zero manual arguments.**"*

**[Point to the Predictive Dashboard city selector.]**

> *"And for future events — the system has memory. Based on our last three London roadshows, it recommends a **minimum developer sponsorship of AED 180,000** to guarantee a 40% gross margin. That is not a guess. That is a data-backed number we can put in front of a developer in a negotiation."*

---

## Phase 3 — The Gatekeeper (Logistics & The Checklist)

> 🎯 **Goal:** Show that **compliance is automated and enforced**, not dependent on a coordinator chasing WhatsApp messages.

**[Action: Navigate to the Checklist page at `/checklist`]**

---

### Talking Points

> *"We have all been in the situation two days before an event where a coordinator is sending 'Please upload your visa!' to 20 agents on WhatsApp at 11pm."*

> *"That is over."*

> *"Look at this agent's profile. They are **85% complete** — 11 out of 13 mandatory compliance tasks are done. The green bar tells you that instantly."*

**[Point to the orange URGENT badge on the Upload UAE Visa task.]**

> *"See this? **Upload UAE Visa** is flagged as URGENT — the deadline is in 12 hours and it is still pending. The system has already sent this agent an automated WhatsApp and email nudge at 8am this morning."*

> *"We have **eliminated the 'I forgot' excuse.** The system acts as a hard chokepoint."*

**[Expand the Upload UAE Visa task card to reveal the Upload button.]**

> *"And it is not just a reminder system. The agent can upload their Visa document **directly here**, from any device — phone, tablet, laptop. The file goes straight to Firebase Storage. The moment it is validated by the Branch Manager, that task turns green and they are cleared for travel."*

> *"**If that Visa is not uploaded and verified by the system, they do not get on the plane. Period.** This is enforced at the function level — not by a coordinator — by the software itself."*

---

## Phase 4 — The Vault (Row-Level Security & Tiers)

> 🎯 **Goal:** Show management that **financial privacy and fairness are baked into the architecture**, not bolted on as an afterthought.

**[Action: Navigate to the System Manual at `/manual`, select Section 4 — "Enterprise Security & Privacy"]**

---

### Talking Points

> *"Finally — and this is important for the Board to understand — **financial privacy**."*

**[Point to the three-tier commission structure diagram.]**

> *"Every agent who attends a PSI roadshow is assigned a tier before the event. **Bronze, Silver, or Gold.**"*

> *"- A **Gold** agent has put their own money at risk — they pay their own way — and in return they earn **50% of every dirham of closed revenue** they generate.*"
> *"- A **Silver** agent shares the risk — **30% commission split**."*
> *"- A **Bronze** agent is fully funded by the branch — and earns **20%**."*

> *"This is the **50/30/20 model**. It eliminates post-event commission disputes because every agent signs off on their tier **before they travel**. The contract is in the system. The math is locked."*

**[Scroll to or point at the RLS diagram — Lock icon, Database node, and three role layers.]**

> *"Now — the security model that makes all of this work."*

> *"We use **Row-Level Security** — the same architecture used by enterprise banking software. What this means in practice:"*

> *"- An **Agent** logs in and sees **only their own targets, their own leads, and their own commission statement**. They cannot see what the agent next to them is earning. They cannot see the branch gross profit. They cannot see the developer sponsorship margin."*

> *"- A **Branch Manager** sees branch-level P&L — their team's aggregate numbers — but not the numbers from another branch."*

> *"- Only the **Executive Board** — this room — sees the full picture. Every event. Every branch. Every dollar of developer sponsorship and what margin it generated."*

> *"**Financial privacy is not a setting. It is baked into the data architecture at the query level.** An agent cannot see data they are not entitled to, even if they know the URL."*

**[Pause.]**

> *"We built this system to be the single source of truth for every PSI roadshow, from the moment the event is created to the moment the final settlement PDF is signed. Let me show you a live settlement report before I hand over to questions."*

**[Navigate to `/settlement` and generate a sample report.]**

---

## Closing — The Ask

> 🎯 **Goal:** Exit confidently with a clear next step.

---

> *"What you have seen today is a fully operational system — not a prototype. The Firebase backend is live. The compliance engine is running. The financial model is calculating real numbers against real event data."*

> *"Our ask is simple: **green-light the rollout** for the next three roadshows as a live pilot. We will instrument every step, measure every KPI, and bring you a full ROI report at the end of Q2."*

> *"The spreadsheets had their time. **This is what runs next.**"*

> *"Questions?"*

---

## Post-Demo Notes

| Action Item | Owner | Deadline |
|---|---|---|
| Share portal access credentials with Heads of Branch | Tech Lead | 3 Mar 2026 |
| Schedule agent onboarding walkthrough session | Operations | 5 Mar 2026 |
| Confirm Firebase Storage limits for document uploads | Tech Lead | 3 Mar 2026 |
| Send follow-up deck to Executive Board | PM | 3 Mar 2026 |

---

*Script prepared: 2026-03-01 · PSI Event Portal v1.0 · Confidential — Internal Use Only*
