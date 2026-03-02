# 📁 PSI Event Portal — Master Documentation Index
**Version:** 2.0 | **Last Updated:** March 2, 2026  
**Owner:** PSI Technology Team | **Company:** Property Shop Investment LLC

> This index is the single entry point for all project documentation. Start here.

---

## 🗺️ Documentation Map

```
PSI Event Portal Documentation
│
├── 📌 START HERE
│   ├── README.md                        ← Project overview + route map
│   └── docs_index.md                    ← This file (documentation navigator)
│
├── 🏛️ ARCHITECTURE & SYSTEM
│   ├── documentation/Project_Master.MD  ← System blueprint (14 sections)
│   ├── Frontend_Architecture.md         ← Folder structure + 7 arch principles
│   └── documentation/Utils_Math_Specifications.md  ← 50/30/20 math formulas
│
├── 🎨 DESIGN & UX
│   ├── documentation/UX_Design_System.md  ← Design tokens + UX patterns
│   └── documentation/UI_Component_Schemas.md  ← Component prop signatures
│
├── 🤖 AI SYSTEMS
│   └── documentation/AI_Systems_Documentation.md  ← All 7 AI features
│
├── ⚙️ DATA & BACKEND
│   ├── documentation/Firestore_Security_Rules_Logic.md  ← RLS rules
│   ├── documentation/Database_Seeding_Strategy.md  ← Seeder usage
│   └── documentation/API_Postman_Collection.md  ← CRM webhook payloads
│
├── 🛠️ DEVELOPER RESOURCES
│   ├── documentation/Developer_Onboarding_Guide.md  ← Day 1 setup
│   ├── documentation/Deployment_and_CICD_Strategy.md  ← Deploy workflow
│   └── documentation/QA_and_Architectural_Context.md  ← Tech rationale + QA
│
├── 🧪 TESTING & QA
│   ├── documentation/UAT_Scripts_Phase1.md  ← User acceptance test scripts
│   └── documentation/Sprint_Zero_Checklist.md  ← Pre-production checklist
│
├── 📊 PRODUCT & USER DOCS
│   ├── documentation/Feature_Registry.md  ← Complete feature catalog
│   ├── documentation/Product_Documentation.md  ← Feature descriptions + flows
│   ├── documentation/User_Manual.md  ← End-user step-by-step guide
│   └── documentation/Admin_Manual.md  ← Internal operator guide
│
├── 📡 INTEGRATIONS
│   └── documentation/API_Postman_Collection.md  ← CRM / Firebase APIs
│
├── 📅 PROJECT MANAGEMENT
│   ├── documentation/Jira_Epics_and_User_Stories.md
│   ├── documentation/Phased_Rollout_Strategy.md
│   ├── documentation/Executive_Readout_Presentation.md
│   └── documentation/Project_Kickoff_Email.md
│
├── 🔍 AUDIT & REPORTING
│   ├── documentation/System_Audit_and_Error_Logging.md
│   └── documentation/DOCUMENTATION_UPDATE_REPORT.md  ← Latest audit report
│
└── 📝 PRESENTATIONS & SCRIPTS
    └── docs/PRESENTATION_SCRIPT.md  ← Executive demo talking points
```

---

## 🚀 Quick Reference by Role

### New Developer
1. `README.md` → `documentation/Developer_Onboarding_Guide.md` → `Frontend_Architecture.md` → `documentation/UX_Design_System.md`

### Product Manager
1. `documentation/Feature_Registry.md` → `documentation/Product_Documentation.md` → `documentation/Jira_Epics_and_User_Stories.md`

### System Architect
1. `documentation/Project_Master.MD` → `Frontend_Architecture.md` → `documentation/Firestore_Security_Rules_Logic.md` → `documentation/AI_Systems_Documentation.md`

### QA Engineer
1. `documentation/UAT_Scripts_Phase1.md` → `documentation/QA_and_Architectural_Context.md` → `documentation/Sprint_Zero_Checklist.md`

### End User
1. `documentation/User_Manual.md` → In-app System Manual at `/manual`

### Internal Operator / Admin
1. `documentation/Admin_Manual.md` → `documentation/Firestore_Security_Rules_Logic.md`

### Executive
1. `documentation/Executive_Readout_Presentation.md` → `docs/PRESENTATION_SCRIPT.md` → `/executive-presentation` (in-app)

---

## 📊 Documentation Health Dashboard

| Document | Status | Last Updated | Coverage |
|---|---|---|---|
| `Project_Master.MD` | ✅ Current | Mar 2026 | 100% |
| `README.md` | ✅ Current | Mar 2026 | 100% |
| `Frontend_Architecture.md` | ✅ Current | Mar 2026 | 100% |
| `Developer_Onboarding_Guide.md` | ✅ Current | Mar 2026 | 100% |
| `AI_Systems_Documentation.md` | ✅ New | Mar 2026 | 100% |
| `UX_Design_System.md` | ✅ New | Mar 2026 | 100% |
| `Feature_Registry.md` | ✅ New | Mar 2026 | 100% |
| `Product_Documentation.md` | ✅ New | Mar 2026 | 100% |
| `User_Manual.md` | ✅ New | Mar 2026 | 100% |
| `Admin_Manual.md` | ✅ New | Mar 2026 | 100% |
| `Firestore_Security_Rules_Logic.md` | ⚠️ Partial | Original | 70% |
| `Database_Seeding_Strategy.md` | ⚠️ Partial | Original | 60% |
| `UAT_Scripts_Phase1.md` | ⚠️ Outdated | Original | Phase 1 only |
| `API_Postman_Collection.md` | ⚠️ Partial | Original | CRM only |
| `Utils_Math_Specifications.md` | ⚠️ Partial | Original | Core math only |

---

## 🔑 Key Terms Glossary

| Term | Definition |
|---|---|
| **RLS** | Row-Level Security — Firestore server-side access filtering |
| **UX Trinity** | Loading spinner + success toast + error toast — required on all forms |
| **DEMO_EVENTS** | Fallback data array in `EventsList.tsx` — pre-loaded to prevent blank screens |
| **onSnapshot** | Firebase Firestore real-time listener (replaces `getDocs`) |
| **DashboardLayout** | The collapsible sidebar shell wrapping all authenticated routes |
| **PublicLayout** | Full-bleed layout for unauthenticated public routes |
| **50/30/20** | Gold/Silver/Bronze commission tier percentages |
| **Lead Dilution** | Auto-recalculation of per-agent targets when headcount changes |
| **Burn Rate** | Live event expense consumption vs. budget tracking |
| **Traffic Controller** | Real-time event floor management command center |
| **VIP Intercept** | On-floor tool for capturing high-value visitor leads |
| **Intel Drop** | Curated market intelligence feed for agents |
| **Fast Pass** | Express QR-based client check-in without agent app |
| **GenAI** | Google Generative AI SDK — powers all 7 AI features |
| **Seeder** | `firebaseSeeder.ts` — injects demo data via Firestore writeBatch |
