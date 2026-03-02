# 📖 User Manual — PSI Event Portal
**For:** Sales Agents, Branch Managers, Event Organisers  
**Version:** 2.0 | **Last Updated:** March 2, 2026

---

## Getting Started

### Logging In
1. Navigate to `http://[your-portal-domain]/login`
2. Click **"Sign in with Google"**
3. Select your company Google account (`@propertyshopinvest.com`)
4. If denied, contact your administrator — only whitelisted emails can enter

### Dashboard Overview (`/`)
When you log in, you land on the main dashboard showing:
- **Total Active Leads** — live count from Firestore
- **Conversion Rate** — closed deals ÷ total leads
- **Total Revenue** — sum of all closed commissions
- **Avg Commission Split** — average tier across all rosters
- **Revenue vs Budget** chart — area chart over time
- **Agent Tier Distribution** — Gold/Silver/Bronze pie
- **Checklist Progress** — compact widget with deep-link to full checklist

All data updates in real time — no page refresh needed.

---

## SECTION 1 — Events

### Viewing Events (`/events`)
The Events page shows all roadshows as cards in a responsive grid:
- **Green badge** = Active (currently running)
- **Blue badge** = Upcoming (planned, not started)
- **Slate badge** = Completed
- **Amber badge** = Proposal / pending approval

Each card shows: event name, location, dates, lead progress bar with percentage, and sponsor badge if applicable.

**Filtering:** Use the search bar at the top to filter by event name, city, or status.

### Creating an Event
1. Click **"New Event"** (top-right button)
2. Fill in: Event Name, City, Country, Target Leads, Budget Type
3. Click **"Create Event"** — a spinner will appear while saving
4. A green toast notification confirms success: *"Event created successfully!"*

> If Firebase is slow or offline, the 4 demo events (Moscow, London, Riyadh, Monaco) are always visible as fallback data.

---

## SECTION 2 — Check-In (`/check-in`)

### As an Agent — My QR Pass
1. Navigate to **Check-In → "My QR Pass" tab**
2. Your digital pass is auto-generated once your manager has approved you
3. Show this QR code to the organiser on event day
4. Your pass expires **24 hours** after generation — refresh on the morning of the event

### As an Organiser — Scanning Agents
1. Navigate to **Check-In → "Scanner" tab**
2. The live roster shows all approved agents and their current check-in status
3. Scan or paste an agent's QR token
4. The system validates the JWT and atomically writes `status: physically_present`
5. The agent's card turns green on both screens simultaneously

> ⚠️ **Critical:** An agent who has not physically checked in via QR will receive **zero leads** regardless of approval status. There are no overrides.

---

## SECTION 3 — Compliance Checklist (`/checklist`)

### What is the Checklist?
A task-based compliance tracker that ensures every agent completes required onboarding steps before attending an event.

### Completing Tasks
1. Navigate to **"Checklist"** in the sidebar (or from the dashboard widget)
2. Each task shows its title, deadline, and completion status
3. For upload tasks (e.g., passport, visa):
   - Click **"Upload Document"**
   - Select your file
   - The file uploads to Firebase Storage
   - The task auto-completes on successful upload
4. **URGENT** tasks are highlighted in amber — these are overdue or within 12 hours of deadline

### Dashboard Widget
The dashboard shows a compact progress bar (e.g., "10 of 13 Tasks Completed").  
Click **"View Full Checklist →"** to go to the full action center.

---

## SECTION 4 — Settlement Calculator (`/settlement`)

### Generating a Settlement Report
1. Navigate to **Settlement** in the sidebar
2. Verify Event Details: name, date, venue, branch
3. Add each agent to the Roster with their **Closed Revenue (AED)**
4. Assign or confirm their **Risk Tier** (Gold/Silver/Bronze)
5. Click **"Generate Final Settlement Report"** — payouts calculate instantly
6. Review the Top Performer callout and Net ROI
7. Print or save the report as PDF

### Reading the Report
| Field | Meaning |
|---|---|
| Agent Payout | Closed Revenue × Tier % |
| Branch Gross Profit | Total Revenue − All Agent Payouts |
| Net ROI % | (Gross Profit ÷ Total Costs) × 100 |

### Commission Tiers
- 🥇 **Gold (50%):** Agent bears all travel/event costs; receives 50% of closed revenue
- 🥈 **Silver (30%):** Shared risk; agent receives 30%
- 🥉 **Bronze (20%):** Branch bears all costs; agent receives 20%

---

## SECTION 5 — Commission Advance (`/cash-advance`)

Agents can request an advance against projected commissions from upcoming or current events. The system:
- Tracks the advance amount against actual deal closures
- Flags over-advance situations
- Links advances to specific events (`eventId`)

---

## SECTION 6 — AI Tools

### Follow-Up Copilot (`/follow-up-copilot`)
Generate personalized follow-up messages for leads:
1. Select the lead's details (name, property interest, budget, nationality)
2. Choose message tone: Professional / Warm / Urgent
3. Click **"Generate"** — AI drafts a tailored message
4. Copy to clipboard and send via WhatsApp or email

### AI Pitch Simulator (`/pitch-simulator`)
Practice handling buyer objections with AI:
1. Select a buyer persona and property type
2. The AI plays a skeptical buyer
3. You respond; AI coaches you on improvements

### Business Card Scanner (`/card-scanner`)
Turn physical business cards into CRM contact records:
1. Upload or photograph a business card
2. AI extracts name, title, company, email, phone, nationality
3. Review extracted data and save to Firestore

### Localized Pitch (`/localized-pitch`)
Generate property pitches in buyer's native language:
1. Select target language (Arabic, Russian, Chinese, Hindi, French, etc.)
2. Input property details
3. AI generates a culturally appropriate pitch in the target language

### VIP Intercept (`/vip-intercept`)
For capturing high-value visitor leads on the event floor:
1. Enter the VIP's details (company, budget, interest)
2. System generates immediate follow-up notes and priority score
3. Alerts your manager for real-time VIP handling

---

## SECTION 7 — Operations Tools

### Traffic Controller (`/traffic-controller`)
Real-time event floor management:
- Monitor visitor flow across event zones
- Track agent positions and engagement
- Assign agents to hot zones dynamically

### Travel Desk (`/travel-desk`)
Manage flight and accommodation for approved agents:
- View all confirmed bookings per event
- Flag missing or non-compliant travel details
- Track departure/return schedules

### Floorplan Heatmap (`/floorplan-heatmap`)
Visual density analysis of the event floor:
- See which zones attract the most visitors
- Compare heatmaps across time windows
- Identify underperforming booth areas

---

## SECTION 8 — Gamification

### Bounty Board (`/bounties`)
Monthly challenges and performance rewards:
- View active challenges with point values
- Track your progress vs. other agents
- Claim completed bounties for recognition or bonuses

---

## SECTION 9 — Market Intel (`/market-intel`)
Curated real estate intelligence dispatched during roadshows:
- Price per sqft trends by city
- Competitor developer activity
- Investor sentiment indicators
- New off-plan project alerts

---

## SECTION 10 — Settings (`/settings`)
Configure your portal experience:
- **Theme:** Switch between Standard (dark) and Modern (minimal light) themes
- Additional preferences may be available based on your role

---

## Troubleshooting

| Issue | Solution |
|---|---|
| Events page is empty | Demo data displays automatically — Firestore may be loading. Wait 5 seconds. |
| QR pass not generating | Confirm your manager has approved your attendance |
| Upload fails on checklist | Check internet connection; files must be under 10MB |
| Toast says "Access Denied" | Your email is not on the whitelist — contact admin |
| AI feature not responding | Check internet connection; AI calls require active network |
| Dashboard shows no data | Use the DEV seed buttons on `/login` to populate with demo data |

---

## System Manual (In-App)

The in-app **System Manual** at `/manual` covers 4 visual sections:
1. **The Accountability Journey** — Animated workflow diagram of all 4 gates
2. **How to Check-In** — Step-by-step QR process with screenshots
3. **Understanding Settlements** — Financial Risk Matrix (Gold/Silver/Bronze)
4. **Enterprise Security & Privacy** — Row-Level Security diagram
