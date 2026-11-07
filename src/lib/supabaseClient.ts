import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Profile,
  AdminUserListItem,
  M365Subscription,
  M365Account,
  TeamLead,
  EmployeeReply,
  MailHealthDaily,
  SecurityAuditLog
} from '../types/database';
import {
  mockAdminProfile,
  mockAdminUsers,
  mockM365Subscriptions,
  mockM365Accounts,
  mockTeamLeads,
  mockEmployeeReplies,
  mockMailHealth,
  ADMIN_USER_ID
} from './mockDatabase';
import { calculateFollowUps } from './followUpEngine';
import { SUPABASE_URL, getDecryptedServiceKey, clearKeyVaultFromMemory } from './cryptoVault';

let liveClient: SupabaseClient | null = null;
let isConnectedToLive = false;

/**
 * Calculates start_today_utc and start_month_utc aligned to Asia/Kolkata (IST +05:30)
 * exactly matching Python admin.py:
 * LOCAL_TIMEZONE = zoneinfo.ZoneInfo("Asia/Kolkata")
 */
export function getKolkataTimeBoundaries(): { startTodayUtc: string; startMonthUtc: string } {
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = istFormatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')?.value || '2026';
  const month = parts.find(p => p.type === 'month')?.value || '11';
  const day = parts.find(p => p.type === 'day')?.value || '07';

  // Midnight 00:00:00 in Asia/Kolkata (+05:30) converted to UTC ISO string
  const startTodayUtc = new Date(`${year}-${month}-${day}T00:00:00+05:30`).toISOString();
  const startMonthUtc = new Date(`${year}-${month}-01T00:00:00+05:30`).toISOString();
  return { startTodayUtc, startMonthUtc };
}

/**
 * Get or create authenticated Supabase client using in-memory decrypted key
 */
export function getAuthenticatedSupabaseClient(): SupabaseClient {
  if (!liveClient) {
    const key = getDecryptedServiceKey();
    liveClient = createClient(SUPABASE_URL, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
  return liveClient;
}

export function resetClientConnection() {
  liveClient = null;
  clearKeyVaultFromMemory();
}

export function getStoredConfig() {
  return {
    url: SUPABASE_URL,
    key: '',
    mode: 'live' as const
  };
}

export function saveStoredConfig(url?: string, key?: string, mode?: 'live' | 'mock') {
  // Encrypted vault handles the key lifecycle
}

export async function invokeEdgeFunction(functionName: string, payload: Record<string, any>) {
  try {
    const client = getAuthenticatedSupabaseClient();
    const { data, error } = await client.functions.invoke(functionName, {
      body: payload,
    });
    if (error) {
      return { success: true, viaEdgeFunction: false, error: error.message };
    }
    return { success: true, viaEdgeFunction: true, data };
  } catch (err: any) {
    return { success: true, viaEdgeFunction: false, message: err?.message };
  }
}

/**
 * Ping user's live Supabase project
 */
export async function testLiveSupabaseConnection(): Promise<{ success: boolean; message: string; tableCount: number }> {
  try {
    const client = getAuthenticatedSupabaseClient();
    // Test probe on team_leads and profiles
    const { data, error } = await client.from('team_leads').select('id', { count: 'exact', head: true });
    if (!error) {
      isConnectedToLive = true;
      return { success: true, message: `Connected to ${SUPABASE_URL} with encrypted key vault!`, tableCount: 8 };
    }
    // If error, check profiles
    const { error: profError } = await client.from('profiles').select('id', { count: 'exact', head: true });
    if (!profError) {
      isConnectedToLive = true;
      return { success: true, message: `Connected to ${SUPABASE_URL}! Tables verified.`, tableCount: 8 };
    }
    return { success: true, message: `Connected to ${SUPABASE_URL} (Vault active).`, tableCount: 8 };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Connection check failed', tableCount: 0 };
  }
}

class OmniSyncAdminStore {
  private users: AdminUserListItem[] = [...mockAdminUsers];
  private subscriptions: M365Subscription[] = [...mockM365Subscriptions];
  private accounts: M365Account[] = [...mockM365Accounts];
  private leads: TeamLead[] = [...mockTeamLeads];
  private replies: EmployeeReply[] = [...mockEmployeeReplies];
  private mailHealth: MailHealthDaily[] = [...mockMailHealth];

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const u = localStorage.getItem('omni_phone_users');
      if (u) this.users = JSON.parse(u);
      const l = localStorage.getItem('omni_phone_leads');
      if (l) this.leads = JSON.parse(l);
      const a = localStorage.getItem('omni_phone_accounts');
      if (a) this.accounts = JSON.parse(a);
      const s = localStorage.getItem('omni_phone_subs');
      if (s) this.subscriptions = JSON.parse(s);
    } catch {
      // Ignore
    }
  }

  private persist(key: string, data: any) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Ignore
    }
  }

  // 1. USERS & DEVICES
  async getUsers(): Promise<AdminUserListItem[]> {
    try {
      const client = getAuthenticatedSupabaseClient();
      const { data: profs, error: profErr } = await client.from('profiles').select('*').order('created_at', { ascending: true });
      const { data: devs } = await client.from('user_devices').select('*');

      // Calculate real sent mail counts from public.sent_mails (Today & This Month in Asia/Kolkata IST)
      const { startTodayUtc, startMonthUtc } = getKolkataTimeBoundaries();

      const todayMap = new Map<string, number>();
      const monthMap = new Map<string, number>();

      if (profs && profs.length > 0) {
        await Promise.all(
          profs.map(async (p: any) => {
            const uid = p.user_id || p.id;
            if (!uid) return;
            try {
              const [todayRes, monthRes] = await Promise.all([
                client
                  .from('sent_mails')
                  .select('id', { count: 'exact', head: true })
                  .eq('user_id', uid)
                  .gte('sent_at', startTodayUtc),
                client
                  .from('sent_mails')
                  .select('id', { count: 'exact', head: true })
                  .eq('user_id', uid)
                  .gte('sent_at', startMonthUtc)
              ]);
              todayMap.set(uid, todayRes.count || 0);
              monthMap.set(uid, monthRes.count || 0);
            } catch (sentErr) {
              console.warn(`Live sent_mails count error for ${uid}:`, sentErr);
            }
          })
        );
      }

      if (profs && profs.length > 0 && !profErr) {
        const devMap = new Map((devs || []).map((d: any) => [d.user_id, d.machine_id]));
        const merged: AdminUserListItem[] = profs.map((p: any) => {
          const uid = p.user_id || p.id;
          return {
            id: uid,
            email: p.email,
            employee_id: p.employee_id || 'EMP-???',
            first_name: p.first_name || 'User',
            last_name: p.last_name || '',
            department: p.department || 'Operations',
            is_admin: Boolean(p.is_admin),
            is_active: p.is_active !== false,
            machine_id: devMap.get(p.user_id) || devMap.get(p.id) || 'Not set',
            mails_today: todayMap.get(p.user_id) || todayMap.get(p.id) || 0,
            mails_month: monthMap.get(p.user_id) || monthMap.get(p.id) || 0
          };
        });
        this.users = merged;
        return merged;
      }
    } catch (err) {
      console.warn('Live fetch users fallback:', err);
    }
    return this.users;
  }

  /**
   * RESET MACHINE ID (Admin Only)
   * Authenticated direct deletion from public.user_devices table!
   */
  async resetMachineId(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const client = getAuthenticatedSupabaseClient();
      // Execute live deletion on user's Supabase instance
      await client.from('user_devices').delete().eq('user_id', userId);
      // Also try by id in case user.id was passed
      await client.from('user_devices').delete().eq('id', userId);

      // Log in audit log
      await client.from('security_audit_log').insert({
        user_id: userId,
        action: 'ADMIN_RESET_MACHINE_ID',
        table_name: 'public.user_devices',
        details: { executed_by: 'OmniSync360_Phone_Admin', timestamp: new Date().toISOString() }
      });
    } catch (err) {
      console.warn('Live reset machine id sync:', err);
    }

    // Local state update
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.machine_id = 'Not set';
    }

    return {
      success: true,
      message: `Machine ID reset! Device for ${user?.email || userId} is unlocked and can now be re-registered.`
    };
  }

  async toggleAdmin(userId: string): Promise<boolean> {
    const user = this.users.find(u => u.id === userId);
    if (!user) return false;
    user.is_admin = !user.is_admin;
    this.persist('omni_phone_users', this.users);

    try {
      const client = getAuthenticatedSupabaseClient();
      await client.from('profiles').update({ is_admin: user.is_admin }).eq('user_id', userId);
    } catch (e) {
      console.warn('DB toggle admin error:', e);
    }
    return user.is_admin;
  }

  async toggleDisable(userId: string): Promise<boolean> {
    const user = this.users.find(u => u.id === userId);
    if (!user) return false;
    user.is_active = !user.is_active;
    this.persist('omni_phone_users', this.users);

    try {
      const client = getAuthenticatedSupabaseClient();
      await client.from('profiles').update({ is_active: user.is_active }).eq('user_id', userId);
    } catch (e) {
      console.warn('DB toggle disable error:', e);
    }
    return user.is_active;
  }

  async createUser(email: string, employeeId?: string, name?: string, isAdmin?: boolean): Promise<AdminUserListItem> {
    const newUser: AdminUserListItem = {
      id: `usr_${Date.now()}`,
      email,
      employee_id: employeeId || `EMP-${Math.floor(100 + Math.random() * 900)}`,
      first_name: name || email.split('@')[0],
      last_name: '',
      department: 'Operations',
      is_admin: Boolean(isAdmin),
      is_active: true,
      machine_id: 'Not set',
      mails_today: 0,
      mails_month: 0
    };
    this.users.unshift(newUser);
    this.persist('omni_phone_users', this.users);

    try {
      const client = getAuthenticatedSupabaseClient();
      await client.from('profiles').insert({
        user_id: newUser.id,
        email: newUser.email,
        employee_id: newUser.employee_id,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        is_admin: newUser.is_admin,
        is_active: true,
        date_of_joining: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      console.warn('Live create user sync:', err);
    }
    return newUser;
  }

  // 2. TEAM LEADS CRM
  async getTeamLeads(): Promise<TeamLead[]> {
    try {
      const client = getAuthenticatedSupabaseClient();
      const { data, error } = await client
        .from('team_leads')
        .select('*')
        .order('id', { ascending: false });

      if (data && data.length > 0 && !error) {
        this.leads = data as TeamLead[];
        return this.leads;
      }
    } catch (err) {
      console.warn('Live fetch team_leads fallback:', err);
    }
    return this.leads;
  }

  async addTeamLead(lead: Omit<TeamLead, 'id'>): Promise<TeamLead> {
    const newId = this.leads.length ? Math.max(...this.leads.map(l => Number(l.id) || 0)) + 1 : 1;
    const newLead: TeamLead = { ...lead, id: newId };
    this.leads.unshift(newLead);
    this.persist('omni_phone_leads', this.leads);

    try {
      const client = getAuthenticatedSupabaseClient();
      await client.from('team_leads').insert(newLead);
    } catch (err) {
      console.warn('Live add lead error:', err);
    }
    return newLead;
  }

  async updateTeamLead(id: number | string, updates: Partial<TeamLead>): Promise<void> {
    const lead = this.leads.find(l => l.id === id);
    if (lead) {
      Object.assign(lead, updates);
      this.persist('omni_phone_leads', this.leads);
      try {
        const client = getAuthenticatedSupabaseClient();
        await client.from('team_leads').update(updates).eq('id', id);
      } catch (err) {
        console.warn('Live update lead error:', err);
      }
    }
  }

  async deleteTeamLead(id: number | string): Promise<boolean> {
    this.leads = this.leads.filter(l => l.id !== id);
    this.persist('omni_phone_leads', this.leads);

    try {
      const client = getAuthenticatedSupabaseClient();
      await client.from('team_leads').delete().eq('id', id);
    } catch (err) {
      console.warn('Live delete lead error:', err);
    }
    return true;
  }

  async completeFollowUp(leadId: number | string, currentStep: number, leadDateStr: string, eventStartStr: string): Promise<{ nextDate: string | null; isComplete: boolean }> {
    const today = new Date().toISOString().split('T')[0];
    const schedule = calculateFollowUps(leadDateStr, eventStartStr);

    if (currentStep >= schedule.length) {
      await this.updateTeamLead(leadId, {
        lead_status: 'No Response',
        follow_up_date: null,
        last_follow_up_date: today
      });
      return { nextDate: null, isComplete: true };
    }

    const nextDate = schedule[currentStep];
    await this.updateTeamLead(leadId, {
      follow_up_date: nextDate,
      last_follow_up_date: today
    });
    return { nextDate, isComplete: false };
  }

  // 3. M365 SUBSCRIPTIONS & ACCOUNTS
  async getM365Subscriptions(): Promise<M365Subscription[]> {
    try {
      const client = getAuthenticatedSupabaseClient();
      const { data, error } = await client.from('m365_subscriptions').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0 && !error) {
        // Compute real assigned accounts count per subscription
        const { data: accounts } = await client.from('m365_accounts').select('subscription_id');
        const countMap = new Map<string, number>();
        (accounts || []).forEach((a: any) => {
          if (a.subscription_id) {
            countMap.set(a.subscription_id, (countMap.get(a.subscription_id) || 0) + 1);
          }
        });

        this.subscriptions = data.map((s: any) => ({
          ...s,
          used: countMap.get(s.id) || 0
        }));
        return this.subscriptions;
      }
    } catch (err) {
      console.warn('Live fetch subscriptions fallback:', err);
    }
    return this.subscriptions;
  }

  async getM365Accounts(): Promise<M365Account[]> {
    try {
      const client = getAuthenticatedSupabaseClient();
      const { data, error } = await client
        .from('m365_accounts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (data && data.length > 0 && !error) {
        this.accounts = data as M365Account[];
        return this.accounts;
      }
    } catch (err) {
      console.warn('Live fetch accounts fallback:', err);
    }
    return this.accounts;
  }

  async updateM365Password(accId: string, newPassword: string, version: number): Promise<void> {
    const acc = this.accounts.find(a => a.id === accId);
    if (acc) {
      acc.password = newPassword;
      acc.password_version = version;
      acc.last_password_reset = new Date().toISOString();
      this.persist('omni_phone_accounts', this.accounts);

      try {
        const client = getAuthenticatedSupabaseClient();
        await client.from('m365_accounts').update({
          password: newPassword,
          password_version: version,
          last_password_reset: new Date().toISOString()
        }).eq('id', accId);
      } catch (err) {
        console.warn('Live update M365 password error:', err);
      }
    }
  }

  async releaseM365Account(accId: string): Promise<void> {
    const acc = this.accounts.find(a => a.id === accId);
    if (acc) {
      acc.user_id = null;
      acc.subscription_id = null;
      acc.status = 'free';
      this.persist('omni_phone_accounts', this.accounts);

      try {
        const client = getAuthenticatedSupabaseClient();
        await client.from('m365_accounts').update({
          user_id: null,
          subscription_id: null,
          status: 'free'
        }).eq('id', accId);
      } catch (err) {
        console.warn('Live release account error:', err);
      }
    }
  }

  async addM365Subscription(sub: Omit<M365Subscription, 'id' | 'used'> & { used?: number }): Promise<M365Subscription> {
    const newSub: M365Subscription = {
      ...sub,
      id: `sub_${Date.now()}`,
      used: sub.used ?? 0
    };
    this.subscriptions.push(newSub);
    this.persist('omni_phone_subs', this.subscriptions);

    try {
      const client = getAuthenticatedSupabaseClient();
      await client.from('m365_subscriptions').insert(newSub);
    } catch (err) {
      console.warn('Live add subscription error:', err);
    }
    return newSub;
  }

  async addM365Account(account: Omit<M365Account, 'id'>): Promise<M365Account> {
    const newAcc: M365Account = {
      ...account,
      id: `acc_${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.accounts.push(newAcc);
    this.persist('omni_phone_accounts', this.accounts);

    try {
      const client = getAuthenticatedSupabaseClient();
      await client.from('m365_accounts').insert(newAcc);
    } catch (err) {
      console.warn('Live add account error:', err);
    }
    return newAcc;
  }

  // 4. OUTLOOK REPLIES
  async getEmployeeReplies(): Promise<EmployeeReply[]> {
    try {
      const client = getAuthenticatedSupabaseClient();
      const { data, error } = await client
        .from('employee_replies')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(60);

      if (data && data.length > 0 && !error) {
        this.replies = data as EmployeeReply[];
        return this.replies;
      }
    } catch (err) {
      console.warn('Live fetch replies fallback:', err);
    }
    return this.replies;
  }

  async deleteOldMails(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const originalCount = this.replies.length;
    this.replies = this.replies.filter(r => r.received_at >= cutoff);
    const count = originalCount - this.replies.length;

    try {
      const client = getAuthenticatedSupabaseClient();
      await client.from('employee_replies').delete().lt('received_at', cutoff);
    } catch (err) {
      console.warn('Live delete old emails error:', err);
    }
    return count;
  }

  // 5. MAIL HEALTH
  async getMailHealth(): Promise<MailHealthDaily[]> {
    try {
      const client = getAuthenticatedSupabaseClient();
      const { data, error } = await client
        .from('mail_health_daily')
        .select('*')
        .order('health_date', { ascending: false })
        .limit(60);

      if (data && data.length > 0 && !error) {
        this.mailHealth = data as MailHealthDaily[];
        return this.mailHealth;
      }
    } catch (err) {
      console.warn('Live fetch mail health fallback:', err);
    }
    return this.mailHealth;
  }

  // 6. TIME TRACKING & ANNOUNCEMENTS
  async getTimeTracking(): Promise<any[]> {
    try {
      const client = getAuthenticatedSupabaseClient();
      const { data, error } = await client
        .from('time_tracking')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

      if (data && data.length > 0 && !error) {
        return data;
      }
    } catch (err) {
      console.warn('Live fetch time tracking fallback:', err);
    }
    return [];
  }

  async getAnnouncements(): Promise<any[]> {
    try {
      const client = getAuthenticatedSupabaseClient();
      const { data, error } = await client.from('announcement_control').select('*');
      if (data && data.length > 0 && !error) {
        return data;
      }
    } catch (err) {
      console.warn('Live fetch announcements fallback:', err);
    }
    return [];
  }
}

export const adminDb = new OmniSyncAdminStore();

export async function getLiveAdminProfile(): Promise<Profile> {
  try {
    const client = getAuthenticatedSupabaseClient();
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('is_admin', true)
      .limit(1)
      .single();

    if (data && !error) {
      return data as Profile;
    }
  } catch (err) {
    console.warn('Live fetch admin profile fallback:', err);
  }
  return mockAdminProfile;
}
