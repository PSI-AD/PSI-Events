# Database Security Rules & Data Firewalls

**Project:** Enterprise Event Management & ROI Tracking Portal  
**Company:** PROPERTY SHOP INVESTMENT LLC  
**Purpose:** To define the strict backend Row-Level Security (RLS) logic. These rules sit directly on the Firebase servers, ensuring that even if a malicious user bypasses the front-end UI, the database will physically reject unauthorized read or write requests.

> **Security Mandate:** Client-side hiding is not security. Hiding the "Gross Profit" tab in the React UI does not stop an agent from querying the database directly. True security happens at the Firestore Rules layer. If a request does not strictly match the logical conditions below, Firestore must return a 403 Permission Denied error.

---

## 🔑 1. Authentication & Custom Claims (The Keys)
Before any rule is evaluated, the database must know who is making the request. This system relies on Firebase Custom Claims injected into the user's secure authentication token.

*   **🚫 The Unauthenticated Block:** Any request lacking a valid authentication token is instantly rejected across the entire database.
*   **🎫 The Role Tokens:** Every user token will contain a specific custom claim injected by the backend during their first login:
    *   `role: 'organizer'` (God-mode access)
    *   `role: 'manager'` (Branch-level access)
    *   `role: 'agent'` (Self-level access)
    *   `role: 'l_and_d'` (Training-level access)

---

## 📂 2. Collection-Level Security Logic
Your backend developers must implement the following logical conditions for each specific Firestore collection.

### 👤 Collection: crm_users (Personnel Profiles)
*   **Read Access:**
    *   **Organizers & L&D:** Can read all documents.
    *   **Managers:** Can only read documents where the `branch_name` field matches their own token's branch assignment.
    *   **Agents:** Can strictly only read the single document where the Document ID matches their own Auth ID.
*   **Write Access:**
    *   **All Users:** Strictly Denied. This collection is read-only for end-users. It is only updated via the secure CRM webhook (Server-to-Server).

### 📅 Collection: events (Master Event Logistics)
*   **Read Access:**
    *   **All Authenticated Users:** Can read basic event documents (to see event names, dates, and locations).
*   **Write Access:**
    *   **Organizers:** Full create, update, and delete privileges.
    *   **Managers & Agents:** Strictly Denied.

### 👥 Sub-Collection: events/{event_id}/attendees (The Approval Queue)
*   **Read Access:**
    *   **Organizers:** Can read all attendees.
    *   **Managers:** Can read attendees where the agent's `branch_name` matches the manager's branch.
    *   **Agents:** Can only read their own specific attendee document.
*   **Write Access (Creation/Survey Submit):**
    *   **Agents:** Can create a document, but the Document ID must exactly match their Auth ID, and they cannot alter the `manager_approval_status` field (must default to "Pending").
*   **Write Access (Updates/Approvals):**
    *   **Managers:** Can update an attendee document (changing status to "Approved" or "Rejected") only if the agent belongs to their branch.
    *   **Organizers:** Can update the `documents_verified` fields.

### 💰 Sub-Collection: events/{event_id}/expenses (The Financial Ledger)
*   **Read & Write Access:**
    *   **Organizers:** Full access.
    *   **Managers, Agents, L&D:** Strictly Denied. This completely firewalls the event costs from the sales floor.

### 📊 Collection: analytics_snapshots (The Executive Dashboards)
*   **Read Access:**
    *   **Organizers:** Can read all branch and event snapshots.
    *   **Managers:** Can read the specific snapshot document tied to their `branch_name`.
    *   **Agents:** Strictly Denied. (Agents receive their personal performance metrics via their individual attendees document, keeping them completely blind to the macro Gross Profit and Sponsorship AED).
*   **Write Access:**
    *   **All Users:** Strictly Denied. These snapshots are exclusively calculated and written by the backend Firebase Cloud Functions.

---

## 🛡️ 3. Field-Level Validation (Data Integrity)
Beyond just who can write, the database must enforce what they can write to prevent corrupted financial math.

*   **🔒 The Package Lock:** If an Agent submits their survey, the database must verify that the `commission_package` field is strictly equal to "Gold", "Silver", or "Bronze". Any other string (or a typo) must trigger a database rejection.
*   **🔒 The Approval Lock:** If a Manager attempts to change an approval status, the database must verify the new status string is strictly "Approved", "Rejected", or "Pending".
*   **⏰ Timestamp Enforcement:** Any document creation must include a server-generated timestamp. The database must reject any payload where a client attempts to forge or manipulate a past date.
