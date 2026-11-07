import {
  Profile,
  AdminUserListItem,
  M365Subscription,
  M365Account,
  TeamLead,
  EmployeeReply,
  MailHealthDaily,
  TimeTracking,
  SecurityAuditLog
} from '../types/database';

export const ADMIN_USER_ID = '64907396-a22d-4011-b2d0-9e709f9cf7d0';

export const mockAdminProfile: Profile = {
  id: '603a68f2-c219-40a0-9ae6-f5cd74e7c78f',
  user_id: ADMIN_USER_ID,
  employee_id: 'EMP1038',
  first_name: 'Mohan',
  last_name: 'Rayudu',
  email: 'mannemmohan@gmail.com',
  phone: '+91 98765 43210',
  department: 'Administration',
  designation: 'System Administrator',
  date_of_joining: '2025-09-28',
  is_active: true,
  is_admin: true,
  created_at: '2025-09-28T18:35:48.940944+00:00',
  updated_at: '2025-09-29T05:57:06.89473+00:00'
};

export const mockAdminUsers: AdminUserListItem[] = [
  {
    id: 'u-1',
    email: 'admin@omnisync360.com',
    employee_id: 'EMP-001',
    first_name: 'Super',
    last_name: 'Admin',
    department: 'Leadership',
    is_admin: true,
    is_active: true,
    machine_id: 'OMNI_SECURE_PC_4019',
    mails_today: 42,
    mails_month: 850
  },
  {
    id: 'u-2',
    email: 'mohan.rayudu@omnisync360.com',
    employee_id: 'EMP-104',
    first_name: 'Mohan',
    last_name: 'Rayudu',
    department: 'Sales & Events',
    is_admin: false,
    is_active: true,
    machine_id: 'WIN11_DELL_5582A',
    mails_today: 18,
    mails_month: 420
  },
  {
    id: 'u-3',
    email: 'jyothi.priya@omnisync360.com',
    employee_id: 'EMP-108',
    first_name: 'Jyothi',
    last_name: 'Priya',
    department: 'Business Development',
    is_admin: false,
    is_active: true,
    machine_id: 'LENOVO_THINKPAD_9041',
    mails_today: 31,
    mails_month: 610
  },
  {
    id: 'u-4',
    email: 'pavithra.s@omnisync360.com',
    employee_id: 'EMP-112',
    first_name: 'Pavithra',
    last_name: 'S',
    department: 'Lead Generation',
    is_admin: false,
    is_active: true,
    machine_id: 'HP_ELITEBOOK_7712',
    mails_today: 24,
    mails_month: 512
  },
  {
    id: 'u-5',
    email: 'sushma.k@omnisync360.com',
    employee_id: 'EMP-115',
    first_name: 'Sushma',
    last_name: 'K',
    department: 'Sales Outreach',
    is_admin: false,
    is_active: true,
    machine_id: 'Not set',
    mails_today: 0,
    mails_month: 120
  }
];

export const mockM365Subscriptions: M365Subscription[] = [
  {
    id: 'sub-1',
    owner_code: 'ADM-01',
    owner_email: 'microsoft.admin1@omnisync360.com',
    billing_cycle: 'monthly',
    renewal_date: '2026-11-20',
    card_last4: '4821',
    status: 'active',
    used: 4
  },
  {
    id: 'sub-2',
    owner_code: 'ADM-02',
    owner_email: 'microsoft.admin2@omnisync360.com',
    billing_cycle: 'yearly',
    renewal_date: '2027-04-15',
    card_last4: '9012',
    status: 'active',
    used: 5
  },
  {
    id: 'sub-3',
    owner_code: 'ADM-03',
    owner_email: 'microsoft.admin3@omnisync360.com',
    billing_cycle: 'monthly',
    renewal_date: '2026-12-05',
    card_last4: '3341',
    status: 'active',
    used: 2
  }
];

export const mockM365Accounts: M365Account[] = [
  {
    id: 'acc-1',
    email: 'steven.kingexpo@gmail.com',
    subscription_id: 'sub-1',
    user_id: 'u-2',
    status: 'assigned',
    password: 'Omni360EMP104V3',
    password_version: 3,
    last_password_reset: '2026-11-01T10:00:00Z'
  },
  {
    id: 'acc-2',
    email: 'susan.millerinfohub@gmail.com',
    subscription_id: 'sub-1',
    user_id: 'u-3',
    status: 'assigned',
    password: 'Omni360EMP108V2',
    password_version: 2,
    last_password_reset: '2026-10-28T14:20:00Z'
  },
  {
    id: 'acc-3',
    email: 'sophia.myhub@gmail.com',
    subscription_id: 'sub-1',
    user_id: 'u-4',
    status: 'assigned',
    password: 'Omni360EMP112V4',
    password_version: 4,
    last_password_reset: '2026-11-03T09:15:00Z'
  },
  {
    id: 'acc-4',
    email: 'blaze.datahub@gmail.com',
    subscription_id: 'sub-2',
    user_id: 'u-2',
    status: 'assigned',
    password: 'Omni360EMP104V1',
    password_version: 1,
    last_password_reset: '2026-10-15T11:00:00Z'
  },
  {
    id: 'acc-5',
    email: 'zenith.hub.growth@gmail.com',
    subscription_id: 'sub-3',
    user_id: null,
    status: 'free',
    password: 'Omni360FreeV1',
    password_version: 1
  }
];

export const mockTeamLeads: TeamLead[] = [
  {
    id: 26,
    lead_date: '2026-10-24',
    client_name: 'sales@sowopanels.com',
    client_email: 'sales@sowopanels.com',
    country: 'Dubai, UAE',
    event_name: 'Big 5 Global Dubai 2026',
    event_start_date: '2026-11-23',
    event_end_date: '2026-11-26',
    follow_up_date: '2026-11-11',
    sales_person: 'Eva West',
    sender_email: 'steven.kingexpo@gmail.com',
    lead_owner: 'Pavithra',
    lead_status: 'New Lead',
    Remarks: 'Interested in acoustic and architectural facade panels'
  },
  {
    id: 27,
    lead_date: '2026-10-26',
    client_name: 'Tanya Grinberg',
    client_email: 'tanya@symbiokinetics.com',
    country: 'California, USA',
    event_name: 'Humanoids 2026',
    event_start_date: '2026-12-06',
    event_end_date: '2026-12-09',
    follow_up_date: '2026-11-17',
    sales_person: 'Michael',
    sender_email: 'susan.millerinfohub@gmail.com',
    lead_owner: 'Jyothi',
    lead_status: 'New Lead',
    Remarks: 'Looking for bipedal actuator supply schedule'
  },
  {
    id: 28,
    lead_date: '2026-10-26',
    client_name: 'Saideep Keshri',
    client_email: 'sai@sentrixrobotics.com',
    country: 'Bengaluru, India',
    event_name: 'Bengaluru Tech Summit 2026',
    event_start_date: '2026-11-17',
    event_end_date: '2026-11-19',
    follow_up_date: '2026-11-12',
    sales_person: 'Eva West',
    sender_email: 'sophia.myhub@gmail.com',
    lead_owner: 'Mohan',
    lead_status: 'Interested',
    Remarks: 'Requested NDA and enterprise cloud integration pilot'
  },
  {
    id: 29,
    lead_date: '2026-10-26',
    client_name: 'Xavier Logette',
    client_email: 'xavier.logette@ares-wines.com',
    country: 'Amsterdam, NL',
    event_name: 'World Bulk Wine Exhibition',
    event_start_date: '2026-11-30',
    event_end_date: '2026-12-01',
    follow_up_date: '2026-11-17',
    sales_person: 'Eva West',
    sender_email: 'gina.gottsch@gmail.com',
    lead_owner: 'Jyothi',
    lead_status: 'Interested',
    Remarks: 'Demo meeting requested for bulk supply chain telemetry'
  },
  {
    id: 30,
    lead_date: '2026-10-26',
    client_name: 'Mohit Rampal',
    client_email: 'mrampal@rapifuzz.com',
    country: 'Bengaluru, India',
    event_name: 'Bengaluru Tech Summit 2026',
    event_start_date: '2026-11-17',
    event_end_date: '2026-11-19',
    follow_up_date: '2026-11-04',
    sales_person: 'Eva West',
    sender_email: 'blaze.datahub@gmail.com',
    lead_owner: 'Mohan',
    lead_status: 'Not Interested',
    Remarks: 'Already procured competing hardware for 2026'
  },
  {
    id: 32,
    lead_date: '2026-10-30',
    client_name: 'Cristiano Anderson',
    client_email: 'cristiano@novasulis.com',
    country: 'Milan, Italy',
    event_name: 'Making Cosmetics 2026',
    event_start_date: '2026-11-29',
    event_end_date: '2026-11-30',
    follow_up_date: '2026-11-11',
    sales_person: 'Eva West',
    sender_email: 'henry.morrisdata@gmail.com',
    lead_owner: 'Jyothi',
    lead_status: 'Deal Closed',
    Remarks: 'Signed annual subscription agreement for 500 licenses'
  },
  {
    id: 36,
    lead_date: '2026-11-02',
    client_name: 'Xiaotian Lin',
    client_email: 'xiaotian.lin@kedoubc.com',
    country: 'Washington DC, USA',
    event_name: 'Neuroscience 2026',
    event_start_date: '2026-11-14',
    event_end_date: '2026-11-18',
    follow_up_date: '2026-11-12',
    sales_person: 'Michael',
    sender_email: 'zenith.hub.growth@gmail.com',
    lead_owner: 'Mohan',
    lead_status: 'Sample Requested',
    Remarks: 'Requested physical test sensor kit by Nov 10'
  }
];

export const mockEmployeeReplies: EmployeeReply[] = [
  {
    id: 'rep-1',
    employee_email: 'mohan.rayudu@omnisync360.com',
    mailbox: 'steven.kingexpo@gmail.com',
    sender_name: 'Cristiano Anderson',
    sender_email: 'cristiano@novasulis.com',
    subject: 'Re: Finalizing OmniSync 360 Enterprise Agreement for Milan Summit',
    received_at: '2026-11-06 17:35:10',
    reply_body: `Dear Mohan,

We have reviewed the contract with our legal department in Milan. Everything looks solid!
The SLA terms and biometric multi-device security provisions meet our EU compliance requirements.

Please send over the final DocuSign envelope and banking coordinates. Looking forward to our launch meeting next week.

Best regards,
Cristiano Anderson
VP of Infrastructure | Nova Sulis S.p.A.`
  },
  {
    id: 'rep-2',
    employee_email: 'jyothi.priya@omnisync360.com',
    mailbox: 'susan.millerinfohub@gmail.com',
    sender_name: 'Tanya Grinberg',
    sender_email: 'tanya@symbiokinetics.com',
    subject: 'Meeting Confirmation - Humanoids 2026 Exhibit Booth',
    received_at: '2026-11-06 14:12:05',
    reply_body: `Hi Jyothi,

Confirming our calendar invite for Dec 7th at 2:00 PM PST.
Our CTO and engineering leads will attend to test the Supabase Edge Functions sync live on our hardware rigs.

Warm regards,
Tanya Grinberg`
  },
  {
    id: 'rep-3',
    employee_email: 'pavithra.s@omnisync360.com',
    mailbox: 'sophia.myhub@gmail.com',
    sender_name: 'Xavier Logette',
    sender_email: 'xavier.logette@ares-wines.com',
    subject: 'Technical Questions on Machine ID & Supabase Security',
    received_at: '2026-11-05 11:20:44',
    reply_body: `Hello Pavithra,

We loved the live demonstration yesterday. Could you confirm whether the Machine ID reset can be handled via server-side Edge Functions without exposing service role keys to client devices?

This is our primary prerequisite before deploying across our 40 warehouses.

Kind regards,
Xavier Logette`
  }
];

export const mockMailHealth: MailHealthDaily[] = [
  {
    id: 'mh-1',
    email_account: 'steven.kingexpo@gmail.com',
    health_date: '2026-11-06',
    sent_count: 245,
    reply_count: 38,
    bounce_count: 2,
    reply_rate: 15.5,
    bounce_rate: 0.8,
    health_score: 98,
    risk_level: 'good'
  },
  {
    id: 'mh-2',
    email_account: 'susan.millerinfohub@gmail.com',
    health_date: '2026-11-06',
    sent_count: 180,
    reply_count: 24,
    bounce_count: 1,
    reply_rate: 13.3,
    bounce_rate: 0.5,
    health_score: 99,
    risk_level: 'good'
  },
  {
    id: 'mh-3',
    email_account: 'blaze.datahub@gmail.com',
    health_date: '2026-11-06',
    sent_count: 310,
    reply_count: 12,
    bounce_count: 18,
    reply_rate: 3.8,
    bounce_rate: 5.8,
    health_score: 72,
    risk_level: 'warning'
  }
];

export const mockTimeTracking: TimeTracking[] = [
  {
    id: 'tt-1',
    user_id: 'u-1',
    date: '2026-11-06',
    punch_in: '2026-11-06T09:15:00Z',
    punch_out: null,
    total_hours: 5.2,
    status: 'present',
    notes: 'Bangalore HQ - Biometric Hardware Login Verified',
    created_at: '2026-11-06T09:15:00Z',
    updated_at: '2026-11-06T09:15:00Z'
  },
  {
    id: 'tt-2',
    user_id: 'u-2',
    date: '2026-11-06',
    punch_in: '2026-11-06T09:30:00Z',
    punch_out: null,
    total_hours: 4.8,
    status: 'present',
    notes: 'Sales Office - Geofence Verified',
    created_at: '2026-11-06T09:30:00Z',
    updated_at: '2026-11-06T09:30:00Z'
  },
  {
    id: 'tt-3',
    user_id: 'u-3',
    date: '2026-11-05',
    punch_in: '2026-11-05T09:00:00Z',
    punch_out: '2026-11-05T18:00:00Z',
    total_hours: 9.0,
    status: 'present',
    notes: 'Follow up batch processing',
    created_at: '2026-11-05T09:00:00Z',
    updated_at: '2026-11-05T18:00:00Z'
  }
];
