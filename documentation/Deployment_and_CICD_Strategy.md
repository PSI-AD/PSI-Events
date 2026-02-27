# Deployment Pipeline & CI/CD Strategy

**Project:** Enterprise Event Management & ROI Tracking Portal  
**Company:** Property Shop Investment (PSI) LLC  
**Purpose:** To define the strict Git branching, automated testing, and release promotion protocols required to safely update the portal without disrupting live roadshow operations.

> **Investor & Executive Note:** "This pipeline guarantees zero-downtime deployments. It ensures that every single mathematical formula and manager approval workflow is automatically audited by robots before human users ever see the update, completely eliminating the risk of a 'bad launch' taking down the system."

---

## 🌿 1. The Strict Git Branching Model
Developers are strictly forbidden from pushing updates directly to the live application. All work must follow a structured path.

*   **`feature/*` Branches:** Where daily development happens (e.g., `feature/gold-tier-ui` or `feature/sponsorship-math`).
*   **`staging` Branch:** The pre-production testing ground. Code merged here automatically updates the Staging Environment.
*   **`main` Branch:** The untouchable, live production code. Code can only enter `main` after passing all automated tests and receiving explicit approval from the Lead Developer.

---

## 🏗️ 2. The Environment Matrix
The system will run on three completely isolated Firebase environments to prevent test data from corrupting real financial ROI.

### Environment A: Local Emulator
*   **Used By:** Developers.
*   **Data Source:** Seeded mock data (`Database_Seeding_Strategy.md`).
*   **Purpose:** Building UI components and testing cloud functions offline without incurring Firebase database read costs.

### Environment B: Staging (UAT)
*   **Used By:** QA Team, Organizers, Branch Managers (during Beta).
*   **Data Source:** Connected to a sandbox version of the CRM to test the API sync without touching live property inventory.
*   **Purpose:** User Acceptance Testing (UAT). This is an exact replica of the live app where we intentionally try to break the workflows before release.

### Environment C: Production (Live)
*   **Used By:** The entire PSI company.
*   **Data Source:** The live, read-only CRM data.
*   **Purpose:** Real roadshows, real money, real ROI tracking.

---

## 🛑 3. Automated Testing Gates (The CI Pipeline)
Before a developer's code is allowed to merge into the staging or main branches, the automated CI pipeline (e.g., GitHub Actions or GitLab CI) must run these strict checks. If any check fails, the deployment is blocked.

*   **Gate 1: The Math Audit (Unit Tests):** The pipeline will automatically run thousands of simulated calculations against the `/utils` folder. It must verify that the 50/30/20 splits are perfectly accurate down to the decimal point and that the Cloud Function divide-by-zero protection works.
*   **Gate 2: The RBAC Security Audit:** The pipeline must verify that the Firebase Security Rules haven't been accidentally altered. It confirms that Agents still cannot read the Gross Profit collections.
*   **Gate 3: UI Build Check:** The pipeline compiles the front-end (React/Next.js) to ensure there are no broken links or missing assets that would cause a white screen for the user.

---

## 🚢 4. The Deployment Protocol (The CD Pipeline)
Once the code passes the automated testing gates, the deployment sequence executes:

1.  **Staging Promotion:** When code is merged into the `staging` branch, the pipeline automatically deploys the updated app to the Staging Firebase Hosting URL.
2.  **QA Sign-Off:** The QA lead runs through the UAT scripts manually on the staging link.
3.  **Production Promotion:** Once QA gives the green light, the Lead Developer opens a Pull Request from `staging` to `main`.
4.  **Zero-Downtime Release:** The pipeline deploys the new code to the live Production URL. Users currently logged into the app will see a seamless background update or be prompted to refresh their browser.

---

## 🚨 5. The Emergency Rollback Procedure
Even with strict testing, unexpected edge cases happen during live events. If a critical bug is discovered in Production (e.g., the approval queue stops loading):

*   **The Instant Revert:** The Lead Developer triggers a "1-Click Rollback" in the Firebase Hosting console, instantly reverting the live app to the exact state it was in one hour prior.
*   **The Post-Mortem:** The buggy code is isolated back in a feature branch. The development team must write a new Automated Testing Gate (Step 3) specifically to catch that exact bug so it can never happen again.
