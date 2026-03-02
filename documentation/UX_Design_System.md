# 🎨 UX System Documentation
## PSI Event Portal — Design System & UX Patterns

**Last Updated:** March 2026

---

## 1. Design Tokens (CSS Custom Properties)

All visual tokens are defined in `src/index.css` as `--psi-*` variables. Two themes are supported.

### Color Tokens

| Token | Standard (Dark) | Modern (Light) | Usage |
|---|---|---|---|
| `--psi-surface` | `#0f172a` | `#ffffff` | Page background |
| `--psi-raised` | `#1e293b` | `#f8fafc` | Card backgrounds |
| `--psi-subtle` | `#1e293b` | `#f1f5f9` | Secondary surfaces |
| `--psi-primary` | `#f8fafc` | `#0f172a` | Primary text |
| `--psi-secondary` | `#94a3b8` | `#475569` | Secondary text |
| `--psi-muted` | `#64748b` | `#94a3b8` | Muted/placeholder text |
| `--psi-accent` | `#10b981` | `#10b981` | Emerald accent (CTAs) |
| `--psi-border` | `rgba(255,255,255,0.08)` | `#e2e8f0` | Default borders |
| `--psi-page` | `#0a1628` | `#f8fafc` | Page-level background |

### Typography Tokens

| Token | Value | Usage |
|---|---|---|
| `--psi-font-sans` | Inter | Body and UI text |
| `--psi-font-mono` | JetBrains Mono | Code, IDs, financial figures |

---

## 2. Utility Classes

### Layout
| Class | Description |
|---|---|
| `psi-card` | Standard card (bg, border, rounded-2xl, shadow) |
| `psi-surface` | Surface-level background |
| `psi-input` | Styled form input with focus ring |

### Buttons
| Class | Description |
|---|---|
| `btn-accent` | Primary CTA — emerald gradient with shadow |
| `btn-accent-outline` | Outlined emerald button |
| `btn-ghost` | Transparent button with hover state |

### Badges
| Class | Color | Use Case |
|---|---|---|
| `badge-success` | Emerald | Active status |
| `badge-info` | Blue | Upcoming / informational |
| `badge-warning` | Amber | Pending / warning |
| `badge-neutral` | Slate | Draft / inactive |
| `badge-error` | Red | Error / critical |

---

## 3. The UX Trinity Pattern

Every user-facing async form action **must** implement all three:

### A. Button Loading Spinner
```tsx
const [isSubmitting, setIsSubmitting] = useState(false);

<button disabled={isSubmitting} className="btn-accent disabled:opacity-60">
  {isSubmitting ? (
    <>
      <Loader2 size={16} className="animate-spin" />
      <span>Saving…</span>
    </>
  ) : 'Save'}
</button>
```

### B. Success Toast
```tsx
import { toast } from 'sonner';

toast.success('Event created successfully!', {
  description: `"${name}" has been saved to Firebase.`,
});
```

### C. Error Toast
```tsx
toast.error('Failed to save', {
  description: err instanceof Error ? err.message : 'Unknown error',
});
```

---

## 4. Beautiful Empty States

When `onSnapshot` returns 0 documents, render a centered empty state — **never** a blank white area.

### Pattern:
```tsx
{data.length === 0 && !loading && (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center py-24 px-8 bg-psi-subtle 
               border-2 border-dashed border-psi rounded-3xl text-center"
  >
    <div className="w-20 h-20 rounded-3xl bg-psi-surface border border-psi 
                    flex items-center justify-center mb-6">
      <IconName size={36} className="text-psi-muted opacity-60" />
    </div>
    <h3 className="text-xl font-extrabold text-psi-primary mb-2">
      No [Items] Yet
    </h3>
    <p className="text-psi-secondary text-sm max-w-sm mb-8">
      Contextual description of how to get started.
    </p>
    <button onClick={onCTA} className="btn-accent ...">
      Create Your First [Item]
    </button>
  </motion.div>
)}
```

### Implemented Empty States:
- `EventsList.tsx` — Calendar icon, "No Events Yet", CTA to create event
- `Analytics.tsx` — BarChart2 icon, "No Analytics Data Yet", instructions for seeding
- `Team.tsx` — Users icon (where applicable)

---

## 5. Skeleton Loading Pattern

During initial Firestore hydration, show animated shimmer cards:

```tsx
{loading && (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {[1, 2, 3].map(i => (
      <div key={i} className="h-72 bg-psi-subtle animate-pulse rounded-3xl" />
    ))}
  </div>
)}
```

> **Exception:** `EventsList.tsx` initializes with `DEMO_EVENTS` so `loading` is `false` from mount — no skeleton needed.

---

## 6. Real-Time Data Pattern

All major list views use this standard pattern:

```tsx
useEffect(() => {
  const unsub = onSnapshot(
    collection(db, 'collection_name'),
    snapshot => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setData(docs.length > 0 ? docs : FALLBACK_DATA);
      setLoading(false);
    },
    err => {
      console.warn('Firestore error — showing fallback:', err);
      setLoading(false); // FALLBACK_DATA remains in state
    }
  );
  return () => unsub(); // ← Always unsubscribe to prevent memory leaks
}, []);
```

---

## 7. Sidebar Layout Rules

The `DashboardLayout` uses a **pure flex-row** — never use `margin-left` to offset content.

```
DashboardLayout (flex h-screen overflow-hidden)
├── <aside> shrink-0 transition-all w-64 / w-20   ← sidebar
└── <div> flex-1 min-w-0 overflow-hidden           ← content column
    ├── <header>                                   ← top bar
    └── <main> flex-1 overflow-y-auto              ← scrollable content
```

**Rule:** Content always fills remaining space via `flex-1`. Sidebar animates width; content reflows automatically.

---

## 8. Toast Notification Configuration

Global `<Toaster>` in `App.tsx`:
```tsx
<Toaster
  position="top-right"
  richColors
  closeButton
  theme="system"
  duration={3500}
/>
```

---

## 9. Responsive Breakpoints (SystemManual.tsx Pattern)

For large-screen content areas, use:
- `max-w-7xl w-full` — never `max-w-3xl` for full-page layouts
- `grid-cols-1 md:grid-cols-2 xl:grid-cols-4` — unlock 4-col on ultra-wide
- `p-6 md:p-8 lg:p-12` — breathing room scales with viewport

---

## 10. Motion & Animation Standards

| Animation | Scope | Values |
|---|---|---|
| Page section entry | `whileInView`, `once: true` | `y: 20 → 0`, `opacity: 0 → 1`, 0.4–0.5s |
| Card stagger | `delay: idx * 0.06` | Per-card stagger |
| Sidebar collapse | CSS `transition-all duration-300` | Not Motion — pure CSS |
| Active dot | `layoutId="sidebar-active-dot"` | Shared Motion layout |
| Progress bars | `whileInView width animation` | `delay: idx * 0.15 + 0.3` |
| Pulse indicators | `animate={{ scale: [1, 1.4, 1] }}` | `repeat: Infinity, duration: 2` |
