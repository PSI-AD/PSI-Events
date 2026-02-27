# Developer Onboarding Guide & Day 1 Setup

**Project:** Enterprise Event Management & ROI Tracking Portal  
**Company:** Property Shop Investment (PSI) LLC  
**Role:** Full-Stack / Front-End / Back-End Engineer

---

## 👋 Welcome to the Team!
You are building the financial and logistical engine that will power PSI's roadshow operations. This system replaces spreadsheets with automated serverless math, strict manager approvals, and real-time ROI tracking. Accuracy, security, and scalable architecture are our highest priorities. Let's get your local environment set up.

---

## 📚 1. Required Reading (The Architecture Map)
Before you set up your local environment, you must understand the business logic. Please review these files in the `/documentation` folder in this exact order:

1.  **[Project_Master.md](./documentation/Project_Master.MD):** Start here. This explains the core problem, the Firebase NoSQL database schema, and the serverless Cloud Function logic.
2.  **[Utils_Math_Specifications.md](./documentation/Utils_Math_Specifications.md):** The absolute source of truth for our 50/30/20 commission splits and Gross Profit margins.
3.  **[Frontend_Architecture.md](./Frontend_Architecture.md):** Our strict Feature-Sliced Design UI folder structure.
4.  **[UI_Component_Schemas.md](./documentation/UI_Component_Schemas.md):** The exact data structures your UI components must accept to match the Figma designs perfectly.
5.  **[Firestore_Security_Rules_Logic.md](./documentation/Firestore_Security_Rules_Logic.md):** How we use Row-Level Security to firewall financial data from the sales floor.

---

## 🛠️ 2. Workstation Prerequisites
Ensure your local machine has the following enterprise tools installed and authorized:

*   **Version Control:** Git (Ensure you have access to the PSI corporate repository).
*   **Environment:** Node.js (Use the LTS version designated by the Lead Developer).
*   **Backend Emulation:** Firebase CLI (Required to run the Firestore database and Cloud Functions locally without touching production data).
*   **API Testing:** Postman (Import the `API_Postman_Collection.md` specs to test the CRM webhooks).

---

## 🚀 3. Day 1 Setup Objectives
Your goal for today is to get the app running locally with mock data, completely isolated from the live CRM.

### Step A: Initialize the Repository
Clone the project repository to your local machine. Verify that the folder structure perfectly matches the `Frontend_Architecture.md` specification. If folders are missing, create them according to the spec.

### Step B: Start the Firebase Local Emulator
Do not connect your local build to the live production Firebase project. Start the Firebase Local Emulator Suite. This gives you a safe, isolated sandbox to test database queries and serverless math.

### Step C: Seed the Mock Data
Open `Database_Seeding_Strategy.md`. Follow the instructions to manually inject the four test users (Organizer, Manager, Perfect Agent, Penalized Agent) and the mock roadshow events into your local emulator. This provides the predictable data you need to build the UI.

### Step D: Build Your First Component
Navigate to the `/src/components` directory. Using the data seeded in Step C and the specs in `UI_Component_Schemas.md`, build the `EventOverviewCard` component. Verify that it renders correctly in your browser.

---

## 🛑 4. Core Development Rules to Remember
*   **Rule 1: No Math in the UI.** All financial calculations must live exclusively in the `/utils` folder. UI components should only display data, never calculate it.
*   **Rule 2: Never Push Directly to Main.** All code must be committed to a `feature/` branch and pushed through the automated CI/CD pipeline (`Deployment_and_CICD_Strategy.md`).
*   **Rule 3: Test the Edge Cases.** When building forms or Cloud Functions, always test the divide-by-zero scenario and the empty-field scenario.
