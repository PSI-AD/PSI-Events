import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, '../../data.db'));

export function initDb() {
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Users Table (CRM Integration - Read Only fields marked)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      crm_id TEXT UNIQUE, -- ID from CRM
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL, -- 'Agent', 'Manager', 'Organizer', 'BD', 'HR', 'Marketing'
      manager_id TEXT,
      branch TEXT,
      department TEXT,
      languages TEXT,
      nationality TEXT,
      is_penalized BOOLEAN DEFAULT FALSE, -- Native to Portal
      FOREIGN KEY (manager_id) REFERENCES users(id)
    )
  `);

  // Events Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      country TEXT NOT NULL,
      city TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      website TEXT,
      stand_size TEXT,
      weather TEXT,
      expected_visitors INTEGER,
      organizer_id TEXT NOT NULL,
      branch_target_leads INTEGER DEFAULT 0, -- Total leads committed by branch
      organizer_commission_share_pct REAL DEFAULT 10, -- Default 10%
      status TEXT DEFAULT 'Draft', -- 'Draft', 'Proposal', 'Active', 'Completed'
      is_sponsored BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organizer_id) REFERENCES users(id)
    )
  `);

  // Event Participants & Packages
  db.exec(`
    CREATE TABLE IF NOT EXISTS event_participants (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      package_type TEXT, -- 'Gold', 'Silver', 'Bronze'
      participation_status TEXT DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
      manager_approval_status TEXT DEFAULT 'Pending', -- 'Approve', 'Reject', 'Pending'
      visa_required BOOLEAN DEFAULT FALSE,
      visa_start_date TEXT,
      visa_end_date TEXT,
      visa_verified BOOLEAN DEFAULT FALSE,
      flight_ticket_url TEXT,
      flight_verified BOOLEAN DEFAULT FALSE,
      assessment_passed BOOLEAN DEFAULT FALSE,
      attended BOOLEAN DEFAULT TRUE,
      confirmed_status BOOLEAN DEFAULT FALSE, -- Approved + Documents Verified
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Projects & Assessments
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      crm_project_id TEXT UNIQUE,
      name TEXT NOT NULL,
      developer_name TEXT,
      tier TEXT, -- 'Luxury', 'Medium', 'Average'
      expected_avg_deal REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      min_pass_score REAL DEFAULT 80,
      content_url TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Sponsorships (Scenario A)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sponsorships (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      sponsor_type TEXT NOT NULL, -- 'Developer', 'Branch'
      sponsor_name TEXT NOT NULL,
      amount REAL NOT NULL,
      source_agent_id TEXT,
      source_agent_reward REAL DEFAULT 0,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (source_agent_id) REFERENCES users(id)
    )
  `);

  // Expenses
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      category TEXT NOT NULL, -- 'Venue', 'Hospitality', 'Marketing', 'Travel'
      sub_category TEXT, -- 'Booking', 'Branding', 'Catering', 'Flights', etc.
      amount REAL NOT NULL,
      description TEXT,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    )
  `);

  // KPIs & Performance
  db.exec(`
    CREATE TABLE IF NOT EXISTS event_kpis (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      user_id TEXT, -- NULL for event-wide KPIs
      metric_type TEXT NOT NULL, -- 'MarketingLeads', 'WalkInLeads', 'QualifiedLeads', 'Meetings', 'Deals'
      target_value INTEGER DEFAULT 0,
      actual_value INTEGER DEFAULT 0,
      tracking_period TEXT, -- 'EventDay', '1Month', '3Months', '6Months'
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Seed some initial data if empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, role, branch, department)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertUser.run('admin-1', 'System Admin', 'admin@realestate.com', 'Organizer', 'Head Office', 'Events');
    insertUser.run('manager-1', 'John Manager', 'john@realestate.com', 'Manager', 'Dubai Marina', 'Sales');
    insertUser.run('agent-1', 'Alice Agent', 'alice@realestate.com', 'Agent', 'Dubai Marina', 'Sales');
    insertUser.run('agent-2', 'Bob Agent', 'bob@realestate.com', 'Agent', 'Downtown', 'Sales');
  }
}

export default db;
