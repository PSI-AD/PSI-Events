export type UserRole = 'Agent' | 'Manager' | 'Organizer' | 'BD' | 'HR' | 'Marketing';

export interface User {
  id: string;
  crm_id?: string;
  name: string;
  email: string;
  role: UserRole;
  manager_id?: string;
  branch?: string;
  department?: string;
  languages?: string;
  nationality?: string;
  is_penalized: boolean;
}

export type EventStatus = 'Draft' | 'Proposal' | 'Active' | 'Completed';

export interface Event {
  id: string;
  name: string;
  type: string;
  country: string;
  city: string;
  start_date: string;
  end_date: string;
  website?: string;
  stand_size?: string;
  weather?: string;
  expected_visitors?: number;
  organizer_id: string;
  branch_target_leads: number;
  organizer_commission_share_pct: number;
  status: EventStatus;
  is_sponsored: boolean;
  created_at: string;
}

export type PackageType = 'Gold' | 'Silver' | 'Bronze';

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  package_type?: PackageType;
  participation_status: 'Pending' | 'Approved' | 'Rejected';
  manager_approval_status: 'Approve' | 'Reject' | 'Pending';
  visa_required: boolean;
  visa_start_date?: string;
  visa_end_date?: string;
  visa_verified: boolean;
  flight_ticket_url?: string;
  flight_verified: boolean;
  assessment_passed: boolean;
  attended: boolean;
  confirmed_status: boolean;
}

export interface Project {
  id: string;
  name: string;
  developer_name?: string;
  tier: 'Luxury' | 'Medium' | 'Average';
  expected_avg_deal: number;
  training_material_url?: string;
  assessment_score?: number;
}

export interface Expense {
  id: string;
  event_id: string;
  category: 'Venue' | 'Hospitality' | 'Marketing' | 'Travel';
  sub_category?: string;
  amount: number;
  description?: string;
}

export interface KPI {
  id: string;
  event_id: string;
  user_id?: string;
  metric_type: 'MarketingLeads' | 'WalkInLeads' | 'QualifiedLeads' | 'Meetings' | 'Deals';
  target_value: number;
  actual_value: number;
  tracking_period: 'EventDay' | '1Month' | '3Months' | '6Months';
}

export interface Sponsorship {
  id: string;
  event_id: string;
  sponsor_type: 'Developer' | 'Branch';
  sponsor_name: string;
  amount: number;
  source_agent_id?: string;
  source_agent_reward?: number;
}
