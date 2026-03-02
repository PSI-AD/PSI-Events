# 🧑‍💻 Developer Onboarding Guide — PSI Event Portal (v2.0)
**Last Updated:** March 2026

---

## Day 0 — Before Your First Commit

Read these documents in order:
1. `README.md` — Product overview and route map
2. `documentation/Project_Master.MD` — Architecture, routes, DB schema, financial models
3. `Frontend_Architecture.md` — Folder structure and 7 architectural principles
4. `documentation/UX_Design_System.md` — Design tokens, UX patterns, animation standards
5. `documentation/AI_Systems_Documentation.md` — AI feature overview and GenAI SDK usage
6. `documentation/Firestore_Security_Rules_Logic.md` — RLS model (read before touching Firestore)

---

## Day 1 — Environment Setup

### Prerequisites
- Node.js 20+
- npm 10+
- A Google account (for Firebase Console access)
- A `VITE_GEMINI_API_KEY` from Google AI Studio

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/PSI-AD/PSI-Events.git
cd PSI-Events

# 2. Install dependencies
npm install

# 3. Create your local env file
cp .env.example .env.local
# → Fill in all VITE_FIREBASE_* and VITE_GEMINI_API_KEY values

# 4. Start the dev server
npm run dev
# → Opens at http://localhost:3000

# 5. Type check
npm run lint
# → tsc --noEmit (zero errors expected)
```

### `.env.local` Required Keys

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_GEMINI_API_KEY=
```

---

## Day 1 — Seeding Demo Data

The app ships with a seeder accessible from the `/login` page (visible when not authenticated).

1. Open `http://localhost:3000/login`
2. Click **"🚀 Inject Full Demo Data"** — seeds events, users, projects, leads, rosters, expenses, agent debts
3. OR click **"🎯 Inject Presentation Data"** — seeds the exact executive demo payload

> ⚠️ **Never run these seeders against the production Firebase project.** Always confirm your `.env.local` points to a development/staging project.

Source file: `src/utils/firebaseSeeder.ts`

---

## Core Development Rules

### 1. Real-Time Data Only
Use `onSnapshot` — not `getDocs`. Always return the unsubscribe function:
```tsx
useEffect(() => {
  const unsub = onSnapshot(collection(db, 'name'), snap => { ... });
  return () => unsub();
}, []);
```

### 2. UX Trinity — No Exceptions
Every form submit must have: loading spinner + success toast + error toast.

### 3. No Hardcoded `margin-left`
The sidebar layout uses `flex-1` on the content column. Never add `ml-64` or similar.

### 4. Design Tokens Only
Use `psi-card`, `psi-input`, `btn-accent`, etc. Do not use raw Tailwind color classes for backgrounds and text — this breaks theme switching.

### 5. Empty States Are Mandatory
If a list can return zero items, implement a `BeautifulEmptyState` — never a blank screen.

### 6. TypeScript is Strict
All Firestore document types live in `src/types/`. If you add a new status value to an interface (e.g., `'Upcoming'`), update the union type and all `STATUS_STYLE` maps.

### 7. Fallback Data Pattern
For any view used in demos/presentations, initialize state with `DEMO_DATA` and only replace it when Firestore returns live records:
```tsx
const [data, setData] = useState(DEMO_DATA);
// in onSnapshot: if (docs.length > 0) setData(docs);
```

---

## Adding a New Feature

1. **Create the folder:** `src/features/{feature-name}/`
2. **Add the component:** `FeatureName.tsx`
3. **Add the route:** In `App.tsx`, add a new `<Route>` inside the appropriate layout
4. **Add to sidebar:** In `DashboardLayout.tsx`, add to the correct `NAV_GROUPS` entry
5. **Follow UX Trinity:** Loading state + toasts + empty state
6. **Write types:** Add TypeScript interfaces to `src/types/` if new Firestore collections are used

---

## Build & Deploy

```bash
# Production build
npm run build
# → Output in dist/

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

CI/CD via GitHub Actions triggers automatically on push to `main`. See `.github/workflows/` for pipeline config.

---

## Key Files Reference

| File | Purpose |
|---|---|
| `src/App.tsx` | All 37 routes + global `<Toaster>` |
| `src/index.css` | Full design system |
| `src/layouts/DashboardLayout.tsx` | Collapsible sidebar layout |
| `src/services/firebase/firebaseConfig.ts` | Firebase SDK init |
| `src/utils/firebaseSeeder.ts` | Demo data injection |
| `src/utils/checklistEngine.ts` | Checklist task rule engine |
| `src/features/settlement/CommissionEngine.ts` | 50/30/20 financial math |
| `src/components/Dashboard.tsx` | Main KPI dashboard |
| `src/components/EventsList.tsx` | Events + DEMO_EVENTS fallback |
| `src/components/Analytics.tsx` | Live analytics (onSnapshot) |
| `src/features/help/SystemManual.tsx` | In-app visual manual |

---

## Common Gotchas

| Issue | Cause | Fix |
|---|---|---|
| Sidebar gap after collapse | Hardcoded `ml-*` on content | Remove margin, use `flex-1` |
| Theme not applied | Using raw color classes | Use `psi-*` token classes |
| Data doesn't update live | Using `getDocs` | Switch to `onSnapshot` |
| Memory leak warning | Missing unsubscribe | Return `unsub()` from `useEffect` |
| TS error on status union | New status not in type | Add to interface union + STATUS_STYLE |
| Toast not showing | Sonner Toaster missing | Check `App.tsx` for `<Toaster>` |
| AI not working | Missing env key | Check `VITE_GEMINI_API_KEY` in `.env.local` |
