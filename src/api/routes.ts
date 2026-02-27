import { Router } from "express";
import db from "../db/schema.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// Events
router.get("/events", (req, res) => {
  const events = db.prepare("SELECT * FROM events ORDER BY created_at DESC").all();
  res.json(events);
});

router.post("/events", (req, res) => {
  const { name, type, country, city, start_date, end_date, organizer_id } = req.body;
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO events (id, name, type, country, city, start_date, end_date, organizer_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, name, type, country, city, start_date, end_date, organizer_id);
  res.json({ id });
});

router.get("/events/:id", (req, res) => {
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  
  const participants = db.prepare(`
    SELECT ep.*, u.name, u.role, u.branch 
    FROM event_participants ep 
    JOIN users u ON ep.user_id = u.id 
    WHERE ep.event_id = ?
  `).all(req.params.id);

  const expenses = db.prepare("SELECT * FROM expenses WHERE event_id = ?").all(req.params.id);
  const sponsorships = db.prepare("SELECT * FROM sponsorships WHERE event_id = ?").all(req.params.id);
  const kpis = db.prepare("SELECT * FROM event_kpis WHERE event_id = ?").all(req.params.id);

  res.json({ ...event, participants, expenses, sponsorships, kpis });
});

// Users
router.get("/users", (req, res) => {
  const users = db.prepare("SELECT * FROM users").all();
  res.json(users);
});

// Expenses
router.post("/expenses", (req, res) => {
  const { event_id, category, sub_category, amount, description } = req.body;
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO expenses (id, event_id, category, sub_category, amount, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, event_id, category, sub_category, amount, description);
  res.json({ id });
});

// ROI & P&L Calculation
router.get("/events/:id/financials", (req, res) => {
  const eventId = req.params.id;
  const event = db.prepare("SELECT * FROM events WHERE id = ?").get(eventId) as any;
  if (!event) return res.status(404).json({ error: "Event not found" });

  const expenses = db.prepare("SELECT SUM(amount) as total FROM expenses WHERE event_id = ?").get(eventId) as { total: number };
  const sponsorships = db.prepare("SELECT * FROM sponsorships WHERE event_id = ?").all(eventId) as any[];
  
  const totalExpenses = expenses.total || 0;
  const totalSponsorship = sponsorships.reduce((acc, s) => acc + s.amount, 0);
  const totalSourceAgentRewards = sponsorships.reduce((acc, s) => acc + (s.source_agent_reward || 0), 0);

  // Participants count for dynamic lead funnel
  const attendees = db.prepare("SELECT COUNT(*) as count FROM event_participants WHERE event_id = ? AND participation_status = 'Approved'").get(eventId) as { count: number };
  const attendeeCount = attendees.count || 1;

  const perAgentTarget = event.branch_target_leads / attendeeCount;

  // Branch Gross Revenue (Mocked for now, would come from CRM deals)
  const branchGrossRevenue = 1000000; // Example AED 1M
  const travelCosts = db.prepare("SELECT SUM(amount) as total FROM expenses WHERE event_id = ? AND category = 'Travel'").get(eventId) as { total: number };
  const totalTravelCosts = travelCosts.total || 0;

  let grossProfit = 0;
  let sponsorshipProfit = 0;

  if (event.is_sponsored) {
    // Scenario A: Sponsored
    sponsorshipProfit = totalSponsorship - totalExpenses - totalSourceAgentRewards;
    grossProfit = branchGrossRevenue - totalTravelCosts + sponsorshipProfit;
  } else {
    // Scenario B: Non-Sponsored
    grossProfit = branchGrossRevenue - totalExpenses - totalTravelCosts;
  }

  const organizerCommission = (grossProfit * (event.organizer_commission_share_pct / 100));
  const branchNetProfit = grossProfit - organizerCommission;

  res.json({
    attendee_count: attendeeCount,
    per_agent_target: perAgentTarget,
    total_expenses: totalExpenses,
    total_sponsorship: totalSponsorship,
    sponsorship_profit: sponsorshipProfit,
    gross_profit: grossProfit,
    organizer_commission: organizerCommission,
    branch_net_profit: branchNetProfit,
    is_sponsored: event.is_sponsored
  });
});

// Operational Workflows
router.post("/participants/:id/approve-manager", (req, res) => {
  const { status } = req.body; // 'Approve', 'Reject', 'Pending'
  const stmt = db.prepare("UPDATE event_participants SET manager_approval_status = ? WHERE id = ?");
  stmt.run(status, req.params.id);
  res.json({ success: true });
});

router.post("/participants/:id/verify-docs", (req, res) => {
  const { visa_verified, flight_verified } = req.body;
  const stmt = db.prepare(`
    UPDATE event_participants 
    SET visa_verified = ?, flight_verified = ?, confirmed_status = (participation_status = 'Approved' AND ? AND ?)
    WHERE id = ?
  `);
  stmt.run(visa_verified ? 1 : 0, flight_verified ? 1 : 0, visa_verified ? 1 : 0, flight_verified ? 1 : 0, req.params.id);
  res.json({ success: true });
});

export default router;
