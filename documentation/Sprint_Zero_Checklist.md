Sprint Zero Checklist: Environment & Operations Setup
Project: Enterprise Event Management & ROI Tracking Portal
Company: Property Shop Investment (PSI) LLC
Objective: To verify that the development team, local environments, and CI/CD pipelines are fully operational before any Phase 1 feature tickets are assigned.

Phase 1: Access & Tooling Verification
Before writing any logic, every developer must prove they have the correct keys to the building.

[ ] Repository Access: Verify all developers have cloned the main repository and can see the /docs folder containing the master architectural files.

[ ] Jira/Board Access: Verify the Agile board is populated with the Epics and User Stories defined in Jira_Epics_and_User_Stories.md.

[ ] Firebase Permissions: Verify the Lead Developer has Admin access to the Firebase console to configure the live and staging environments.

[ ] Postman Workspace: Ensure the backend team has imported the API_Postman_Collection.md specs into their shared Postman workspace.

Phase 2: Local Environment Sandbox
Developers must prove they can run the system offline without touching live data.

[ ] Emulator Boot Check: Every developer must successfully launch the Firebase Local Emulator Suite on their machine.

[ ] Database Seeding: Every developer must run the local seeding utility defined in Database_Seeding_Strategy.md.

[ ] Data Verification: Have the developers open their local Firebase console and visually confirm that the "God-Mode Organizer," the "Strict Branch Manager," and the dummy Event Logistics documents are present.

[ ] Feature-Sliced Folders: Verify the local codebase perfectly matches the /features, /utils, and /components structure outlined in Frontend_Architecture.md.

Phase 3: The CI/CD "Dummy" Run
Test the plumbing before you send water through it. You must ensure the automated gates actually work.

[ ] Create a Test Branch: Have a developer create a branch called feature/sprint-zero-test.

[ ] The Intentional Failure: Have them write a dummy math function in the /utils folder that intentionally fails a basic unit test.

[ ] Push & Block: Have them push the branch. Verify that the CI/CD pipeline (Deployment_and_CICD_Strategy.md) catches the failed test and blocks the pull request.

[ ] The Fix & Merge: Have them fix the dummy test, push again, and verify the pipeline successfully deploys the code to the Staging URL.

Phase 4: Architectural Alignment Sign-Off
No developer touches a Phase 1 ticket until they understand the rules.

[ ] The RBAC Confirmation: The Lead Developer must verbally confirm they understand that Row-Level Security will be handled strictly via Firestore Rules, not just hidden in the React UI.

[ ] The Math Rule: The entire team must confirm understanding that absolutely no financial formulas (50/30/20 splits) are allowed inside the UI components; they must live in the /utils directory.

[ ] The CRM Boundary: The backend team must confirm they understand the portal is read-only for staff and inventory data, relying entirely on the CRM webhooks.
