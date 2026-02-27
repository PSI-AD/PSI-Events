# 🏗️ Frontend Architecture: Enterprise Event Management Portal

This document outlines the scalable, enterprise-grade folder structure for the modern JavaScript framework (React/Next.js) tailored for the Property Shop Investment LLC Event Management Portal.

## 📂 Visual File Tree

```text
src/
├── 🎨 assets/                  # Static UI graphics, icons, and global styles
│   ├── images/                 # Brand assets and placeholder graphics
│   ├── icons/                  # Custom SVG icons and Lucide wrappers
│   └── styles/                 # Global CSS and Tailwind configuration
│
├── 🧱 components/              # Shared, reusable UI elements
│   ├── common/                 # Atomic components (Buttons, Inputs, Badges)
│   ├── layout/                 # Shared structural components (Nav, Sidebar)
│   └── shared/                 # Business-specific shared UI (TierCards, FunnelWidgets)
│
├── 🚀 features/                # Domain-specific logic (Modular Architecture)
│   ├── 📅 events/              # Event creation, logistics, and listing
│   ├── 📝 proposals/           # Tiered proposal engine and survey forms
│   ├── 📈 analytics/           # ROI dashboards and lead funnel visualization
│   └── 🔐 approvals/           # Manager approval queues and doc verification
│
├── 🖼️ layouts/                 # Page wrappers for different user roles
│   ├── OrganizerLayout/        # Sidebar and header for Admin/Organizer
│   ├── AgentLayout/            # Focused view for Sales Agents
│   └── AuthLayout/             # Minimal wrapper for login/onboarding
│
├── 📡 services/                # External API and infrastructure configuration
│   ├── firebase/               # Firestore, Auth, and Cloud Functions config
│   └── crm/                    # Webhook handlers and CRM sync logic
│
├── 🧠 store/                   # Global state management (Context API / Redux)
│   ├── authContext.tsx         # User session and authentication state
│   └── rbacContext.tsx         # Role-Based Access Control state management
│
├── 🏷️ types/                   # Strict TypeScript interfaces
│   ├── user.ts                 # Maps to crm_users collection
│   ├── event.ts                # Maps to events collection
│   ├── proposal.ts             # Maps to proposals sub-collection
│   └── analytics.ts            # Maps to analytics_snapshots
│
└── 🛠️ utils/                   # Complex mathematical and helper functions
    ├── math/                   # Financial logic
    │   ├── commissionSplit.ts  # 50/30/20 package calculators
    │   └── leadDilution.ts     # Dynamic lead target dilution logic
    └── helpers/                # General formatting and data manipulation
        └── dateFormatting.ts   # Event date and logistics helpers
```

## 🏗️ Architectural Principles

### 1. Feature-Based Modality
Logic is encapsulated within the `features/` directory. Each feature contains its own components, hooks, and API calls, ensuring that the `events` module remains decoupled from the `proposals` module.

### 2. Strict Type Safety
The `types/` directory ensures that all data payloads flowing through the application strictly match the Firebase NoSQL schema defined in the `Project_Master.MD`.

### 3. Centralized Financial Logic
All ROI, P&L, and commission calculations are centralized in `utils/math/`. This prevents logic duplication and ensures that the "Source of Truth" for financial math is easily auditable.

### 4. Role-Based Layouts
The `layouts/` directory allows the application to dynamically switch the entire UI shell based on the user's RBAC status (e.g., hiding the Expense Ledger from Agents).
