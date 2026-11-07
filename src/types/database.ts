/**
 * OmniSync 360 Database Types matching Supabase schema and Python Admin Suite
 */

export interface Profile {
  id: string;
  user_id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department?: string;
  designation?: string;
  date_of_joining: string;
  reporting_manager_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_admin: boolean;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'employee' | 'admin' | 'manager' | 'hr';
  assigned_by?: string;
  created_at: string;
}

export interface UserDevice {
  id: string;
  user_id: string;
  machine_id: string;
  device_name?: string;
  biometric_enabled?: boolean;
  biometric_registered_at?: string;
  created_at: string;
}

export interface SecurityAuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface TimeTracking {
  id: string;
  user_id: string;
  date: string;
  punch_in: string | null;
  punch_out: string | null;
  total_hours: number | null;
  status: 'present' | 'absent' | 'half_day' | 'leave';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  punch_in: string | null;
  punch_out: string | null;
  created_at: string;
}

export interface M365Subscription {
  id: string;
  owner_code: string;
  owner_email: string;
  billing_cycle: 'monthly' | 'yearly';
  renewal_date?: string;
  payment_type?: string;
  card_last4?: string;
  status: 'active' | 'inactive';
  last_checked_at?: string;
  created_at?: string;
  used?: number;
}

export interface M365Account {
  id: string;
  email: string;
  subscription_id?: string | null;
  user_id?: string | null;
  status: 'free' | 'assigned' | 'released';
  password?: string;
  password_version?: number;
  last_password_reset?: string;
  created_at?: string;
}

export interface TeamLead {
  id: number | string;
  lead_date: string;
  client_name: string;
  client_email: string;
  country: string;
  event_name: string;
  event_start_date: string;
  event_end_date: string;
  follow_up_date: string | null;
  sales_person: string;
  sender_email: string;
  lead_owner: string;
  lead_owner_id?: string | null;
  client_status?: string;
  lead_status: 'New Lead' | 'Interested' | 'Sample Requested' | 'Deal Closed' | 'No Response' | 'Not Interested';
  Remarks?: string;
  last_follow_up_date?: string | null;
  best_time?: string;
  created_at?: string;
}

export interface EmployeeReply {
  id: string;
  employee_email: string;
  mailbox: string;
  sender_name?: string;
  sender_email: string;
  subject?: string;
  reply_body?: string;
  received_at: string;
  created_at?: string;
}

export interface MailHealthDaily {
  id: string;
  email_account: string;
  health_date: string;
  sent_count: number;
  reply_count: number;
  bounce_count: number;
  reply_rate: number;
  bounce_rate: number;
  health_score: number;
  risk_level: 'good' | 'warning' | 'critical';
}

export interface AnnouncementControl {
  id: string;
  file_name: string;
  active: boolean;
  created_at?: string;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  department: string;
  is_admin: boolean;
  is_active: boolean;
  machine_id: string;
  mails_today: number;
  mails_month: number;
}
