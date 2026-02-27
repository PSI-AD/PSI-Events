# System Audit & Error Logging Protocol

**Project:** Enterprise Event Management & ROI Tracking Portal  
**Company:** Property Shop Investment (PSI) LLC  
**Purpose:** To define the strict tracking mechanisms for human actions, API sync failures, mathematical errors, and security breaches, ensuring 100% system observability.

> **Executive Context:** "In an enterprise financial system, accountability is paramount. This protocol ensures that if a branch manager accidentally rejects an agent, or if the CRM goes offline during a data sync, our IT team is instantly notified and possesses the exact forensic logs required to fix the issue in minutes, not days."

---

## 👁️ 1. The Human Audit Trail (Action Logging)
Every critical operational action taken by a user must be logged in a dedicated, tamper-proof `system_audit_logs` Firebase collection. This prevents disputes between agents and managers regarding who clicked what and when.

### Mandatory Logged Actions:
*   **Status Changes:** When a Branch Manager changes an Agent's status from "Pending" to "Approved" or "Rejected".
*   **Document Verification:** When an Organizer clicks "Verify" or "Reject" on an Agent's uploaded Visa or Flight tickets.
*   **Expense Ledger Updates:** When an Organizer adds, edits, or deletes an expense entry (Venue, Travel, etc.).
*   **Event Finalization:** When an Organizer locks the event and triggers the final post-event CRM revenue sync.

### Required Data Payload for Human Logs:
*   `timestamp`: Exact server time of the action.
*   `actor_id`: The CRM ID of the user performing the action.
*   `action_type`: e.g., "MANAGER_APPROVAL", "EXPENSE_ADDED".
*   `target_id`: The ID of the affected document (e.g., the Agent's ID or the Expense ID).
*   `previous_state` & `new_state`: What the data looked like before and after the click.

---

## 🔌 2. API Integration & Sync Monitoring
Because the portal relies on the primary CRM for read-only data, any disconnection between the two systems must be caught immediately.

### Monitoring Workhooks (CRM to Firebase):
*   **The 200 OK Log:** Every successful payload sync must log a lightweight success entry to track the health of the connection.
*   **The 400 Validation Catch:** If the CRM sends a property with an invalid tier (e.g., "Super Luxury" instead of the strictly mandated "Luxury"), the portal must log a "Data Validation Error" and alert the CRM database administrators to fix their payload.
*   **The Dead Letter Queue (DLQ):** If the CRM pushes actual closed revenue data, but the Firebase server is temporarily unreachable, the payload must enter a DLQ to be automatically retried 3 times before triggering a "Critical Sync Failure" pager alert to the DevOps team.

---

## 🧮 3. Cloud Function & Math Error Tracking
The serverless backend handles the dynamic target dilution and gross profit calculations. If the math fails, the dashboards fail.

### Critical Error Traps:
*   **Divide-by-Zero Triggers:** If an event has 0 approved agents, the function is programmed to return 0. However, the system must still log an "Info" level event noting that a calculation was attempted on an empty attendee pool.
*   **Missing Variable Nulls:** If an Organizer accidentally leaves the "Event Cost" blank, and the Cloud Function attempts to calculate Gross Profit, it must catch the missing data, log a "Warning: Missing Financial Input," and display a graceful error on the UI rather than crashing.
*   **Execution Timeouts:** Cloud Functions must be monitored for latency. If the dynamic target calculation takes longer than 3 seconds to execute, it must log a "Performance Degradation" warning for the engineering team to optimize the query.

---

## 🔐 4. Security & Unauthorized Access Audits
The Firestore Security Rules (RLS) physically block unauthorized data access. However, the system must record who is trying to break those rules.

### Intrusion Monitoring:
*   **The 403 Forbidden Log:** If an Agent-level account attempts to query the `analytics_snapshots` collection to see the company's Gross Profit, Firestore will block them. The system must immediately log this event, capturing the Agent's ID, the timestamp, and the exact query they attempted to run.
*   **Alert Thresholds:** A single 403 error might be a UI glitch. However, if a single `crm_user_id` triggers five 403 Forbidden errors within 60 seconds, it indicates a user actively trying to probe the database. This must trigger an immediate "High Priority Security Alert" to the IT Admin dashboard.
