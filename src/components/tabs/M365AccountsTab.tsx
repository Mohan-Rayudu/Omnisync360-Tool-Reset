import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Copy, 
  Plus, 
  Key, 
  RotateCcw, 
  Unlock, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink,
  Edit,
  Check,
  Smartphone
} from 'lucide-react';
import { M365Account, M365Subscription, AdminUserListItem } from '../../types/database';
import { adminDb } from '../../lib/supabaseClient';

interface M365AccountsTabProps {
  isPhoneView: boolean;
  filterAdminCode?: string | null;
}

export const M365AccountsTab: React.FC<M365AccountsTabProps> = ({ 
  isPhoneView,
  filterAdminCode 
}) => {
  const [accounts, setAccounts] = useState<M365Account[]>([]);
  const [subscriptions, setSubscriptions] = useState<M365Subscription[]>([]);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [search, setSearch] = useState(filterAdminCode || '');
  const [loading, setLoading] = useState(false);

  // Form toggle
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [selectedSubId, setSelectedSubId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  // Pending Reset state for the 2-step Copy -> Save automation flow
  const [pendingReset, setPendingReset] = useState<{
    id: string;
    email: string;
    newPw: string;
    version: number;
  } | null>(null);

  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [accs, subs, usrs] = await Promise.all([
      adminDb.getM365Accounts(),
      adminDb.getM365Subscriptions(),
      adminDb.getUsers()
    ]);
    setAccounts(accs);
    setSubscriptions(subs);
    setUsers(usrs);
    if (subs.length > 0 && !selectedSubId) setSelectedSubId(subs[0].id);
    if (usrs.length > 0 && !selectedUserId) setSelectedUserId(usrs[0].id);
    setLoading(false);
  };

  const adminMap = new Map(subscriptions.map(s => [s.id, s.owner_code]));
  const userMap = new Map(users.map(u => [u.id, `${u.first_name} ${u.last_name} (${u.employee_id})`]));

  const showCopyMessage = (msg: string) => {
    setCopiedNotice(msg);
    if ('vibrate' in navigator) navigator.vibrate(25);
    setTimeout(() => setCopiedNotice(null), 2500);
  };

  /**
   * 1. COPY CREDENTIALS & GENERATE NEXT PASSWORD (matching Python copy_all logic)
   * Formula: Omni360{emp_id}V{v}
   */
  const handleGenerateAndCopy = (acc: M365Account) => {
    const user = users.find(u => u.id === acc.user_id);
    const empId = user?.employee_id.replace(/[^a-zA-Z0-9]/g, '') || 'EMP00';
    const nextVer = (acc.password_version || 0) + 1;
    const newPw = `Omni360${empId}V${nextVer}`;

    const textToCopy = `${acc.email}\n${acc.password || ''}\n${newPw}`;
    navigator.clipboard.writeText(textToCopy);

    setPendingReset({
      id: acc.id,
      email: acc.email,
      newPw,
      version: nextVer
    });

    showCopyMessage(`Reset credentials copied! New PW: ${newPw}`);
  };

  /**
   * 2. SAVE PASSWORD & CONFIRM AUTOMATION (matching Python save_password logic)
   */
  const handleSaveAndConfirm = async (accId: string) => {
    if (!pendingReset || pendingReset.id !== accId) {
      alert('Please click the Copy (📋) button first to generate the new password.');
      return;
    }

    const confirmed = window.confirm(
      `Confirm password reset for ${pendingReset.email}?\n\nNew Password: ${pendingReset.newPw}\n\nThis updates the database and logs a security audit entry.`
    );
    if (!confirmed) return;

    await adminDb.updateM365Password(accId, pendingReset.newPw, pendingReset.version);
    setPendingReset(null);
    showCopyMessage('Password updated successfully in database.');
    loadData();
  };

  const handleRelease = async (accId: string) => {
    if (window.confirm('Release this M365 account from the employee? Status will become Free.')) {
      await adminDb.releaseM365Account(accId);
      loadData();
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !selectedSubId) return;

    await adminDb.addM365Account({
      email: newEmail,
      subscription_id: selectedSubId,
      user_id: selectedUserId || null,
      status: selectedUserId ? 'assigned' : 'free',
      password: newPassword || 'Omni360InitialV1'
    });

    setNewEmail('');
    setNewPassword('');
    setShowAddForm(false);
    loadData();
  };

  const copyTableAsText = () => {
    const lines = filtered.map(a => 
      `${a.email}\t${adminMap.get(a.subscription_id || '') || '-'}\t${userMap.get(a.user_id || '') || 'Unassigned'}\t${a.status}\t${a.password || ''}`
    );
    navigator.clipboard.writeText(lines.join('\n'));
    showCopyMessage(`Copied ${filtered.length} account rows!`);
  };

  const filtered = accounts.filter(acc => {
    if (!search) return true;
    const q = search.toLowerCase();
    const adminCode = (adminMap.get(acc.subscription_id || '') || '').toLowerCase();
    const userName = (userMap.get(acc.user_id || '') || '').toLowerCase();
    return (
      acc.email.toLowerCase().includes(q) ||
      adminCode.includes(q) ||
      userName.includes(q) ||
      acc.status.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Copied Notice Banner */}
      {copiedNotice && (
        <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-xs font-semibold text-emerald-300 flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{copiedNotice}</span>
        </div>
      )}

      {/* Top Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 shadow-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by email, admin code, employee, status..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#f58220]"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyTableAsText}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy All</span>
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f58220] hover:bg-orange-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Add Account Expandable Form */}
      {showAddForm && (
        <form onSubmit={handleAddAccount} className="p-4 rounded-2xl bg-slate-900 border border-purple-500/30 space-y-3 animate-fadeIn">
          <div className="font-bold text-xs text-white">Add M365 Family Account</div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Admin Code</label>
              <select
                value={selectedSubId}
                onChange={e => setSelectedSubId(e.target.value)}
                className="w-full px-2 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              >
                {subscriptions.map(s => (
                  <option key={s.id} value={s.id}>{s.owner_code} ({s.owner_email})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Assign Employee</label>
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="w-full px-2 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              >
                <option value="">-- Unassigned (Free) --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.employee_id})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">M365 Email</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="family.id@outlook.com"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Initial Password</label>
              <input
                type="text"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Leave blank for auto"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-[#00a86b] text-xs font-bold text-white shadow-md"
            >
              Save Account
            </button>
          </div>
        </form>
      )}

      {/* PC Table View OR Mobile Cards */}
      {!isPhoneView ? (
        /* PC Desktop View */
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0b2545] text-slate-200 border-b border-slate-800 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">M365 Email</th>
                  <th className="py-3 px-3">Admin</th>
                  <th className="py-3 px-3">Assigned Employee</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Current Password</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map(acc => {
                  const hasPending = pendingReset?.id === acc.id;
                  return (
                    <tr key={acc.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-white font-mono">
                        {acc.email}
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-mono text-xs font-bold text-purple-300">
                          {adminMap.get(acc.subscription_id || '') || '—'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-300">
                        {userMap.get(acc.user_id || '') || (
                          <span className="text-slate-500 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          acc.status === 'assigned' 
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}>
                          {acc.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                        {hasPending ? (
                          <span className="text-emerald-400 font-bold">{pendingReset.newPw}</span>
                        ) : (
                          <span>{acc.password || '••••••••'}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 📋 Copy & Generate Reset Password button */}
                          <button
                            onClick={() => handleGenerateAndCopy(acc)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
                            title="Generate Next Password & Copy Credentials (📋)"
                          >
                            <Copy className="w-3.5 h-3.5 text-purple-400" />
                          </button>

                          {/* ✅ Save & Confirm Password button */}
                          <button
                            onClick={() => handleSaveAndConfirm(acc.id)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              hasPending
                                ? 'bg-emerald-950 border-emerald-500 text-emerald-300 animate-pulse'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}
                            title="Confirm & Save New Password (✅)"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>

                          {/* 🔓 Release Account */}
                          <button
                            onClick={() => handleRelease(acc.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-amber-400 transition-colors"
                            title="Release Account (🔓)"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Mobile Convenient Card View */
        <div className="space-y-3">
          {filtered.map(acc => {
            const hasPending = pendingReset?.id === acc.id;
            return (
              <div
                key={acc.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-white text-sm font-mono">{acc.email}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Admin: <span className="text-purple-300 font-bold">{adminMap.get(acc.subscription_id || '') || '—'}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                    acc.status === 'assigned' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                  }`}>
                    {acc.status}
                  </span>
                </div>

                <div className="text-xs text-slate-300">
                  Assigned to: <span className="font-semibold text-white">{userMap.get(acc.user_id || '') || 'Unassigned'}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 font-mono text-xs flex items-center justify-between">
                  <span className="text-slate-400">Password:</span>
                  <span className={hasPending ? 'text-emerald-400 font-bold' : 'text-slate-200'}>
                    {hasPending ? pendingReset.newPw : (acc.password || '••••••••')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleGenerateAndCopy(acc)}
                    className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-purple-300 flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Generate & Copy</span>
                  </button>

                  <button
                    onClick={() => handleSaveAndConfirm(acc.id)}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 ${
                      hasPending
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Password</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
