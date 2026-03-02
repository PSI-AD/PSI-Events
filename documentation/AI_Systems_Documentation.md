# 🤖 AI Systems Documentation
## PSI Event Portal — AI-Powered Features

**Last Updated:** March 2026  
**AI SDK:** `@google/genai` v1.29 (Google Gemini)

---

## Overview

The PSI Portal integrates Google's Generative AI SDK across **7 features**. All AI calls are made client-side using the configured `VITE_GEMINI_API_KEY` environment variable.

---

## 1. Follow-Up Copilot (`/follow-up-copilot`)

**File:** `src/features/leads/FollowUpCopilot.tsx`

**Purpose:** Generate personalized post-event follow-up messages to leads with configurable tone.

**How it works:**
1. Agent selects a lead from their event roster
2. Inputs context: property interest, budget range, follow-up window
3. Selects tone: **Professional**, **Warm**, or **Urgent**
4. AI generates a personalized message in the lead's preferred language

**Output:** Ready-to-send WhatsApp / email copy. Clipboard-copyable.

---

## 2. AI Pitch Simulator (`/pitch-simulator`)

**File:** `src/features/training/AIPitchSimulator.tsx`

**Purpose:** Interactive roleplay simulator to train agents on handling buyer objections.

**How it works:**
1. Agent selects a property type and buyer persona
2. AI plays the role of a skeptical buyer
3. Agent responds; AI scores the response and provides coaching
4. Tracks improvement over multiple sessions

---

## 3. Business Card Scanner (`/card-scanner`)

**File:** `src/features/leads/BusinessCardScanner.tsx`

**Purpose:** Extract structured contact data from a business card photo using vision AI.

**How it works:**
1. Agent uploads or photographs a business card
2. GenAI extracts: name, title, company, email, phone, nationality
3. Data is pre-populated into a new lead creation form
4. One-click save to Firestore `crm_leads`

---

## 4. VIP Concierge (`/vip-concierge`)

**File:** `src/features/clients/VIPConcierge.tsx`

**Purpose:** Generate tailored concierge-style messages for VIP clients attending PSI roadshows.

**Inputs:** Client name, nationality, event, preferred language, special requirements  
**Output:** Formal, culturally aware welcome and event briefing message

---

## 5. Localized Pitch (`/localized-pitch`)

**File:** `src/features/events/LocalizedPitch.tsx`

**Purpose:** Generate property pitches in multiple languages for international roadshow audiences.

**Supported languages:** Arabic, Russian, Chinese (Mandarin), Hindi, French, German, and more.

**How it works:**
1. Select target language and buyer profile
2. Input property details (name, price, developer, highlights)
3. AI generates a full pitch narrative in the target language with culturally appropriate phrasing

---

## 6. AI Approvals Queue (`/approvals`)

**File:** `src/features/approvals/ApprovalQueue.tsx`

**Purpose:** AI-assisted manager approval system that risk-scores agent applications before manual review.

**Scoring factors:**
- Historical no-show record
- Document completeness
- L&D clearance status
- Previous event performance metrics

**Output:** Risk score (Low / Medium / High) displayed alongside each pending approval.

---

## 7. Predictive Analytics Engine

**Files:**
- `src/features/analytics/PredictiveAnalyticsDashboard.tsx`
- `src/features/analytics/PredictiveEngine.ts`

**Purpose:** ML-driven ROI forecasting per city, season, and developer combination.

**Inputs:** Historical event data from Firestore  
**Output:** Projected lead yield, conversion rate, and expected revenue per planned event

---

## Environment Configuration

```env
VITE_GEMINI_API_KEY=your_google_genai_key_here
```

The key must be prefixed with `VITE_` to be accessible in the Vite client bundle.

---

## Error Handling

All AI features implement:
- `try/catch` around GenAI API calls
- `toast.error()` on failure with human-readable message
- Loading spinner state during generation
- Graceful degradation — UI remains functional if AI is unavailable
