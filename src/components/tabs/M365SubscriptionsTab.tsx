import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  RefreshCw, 
  Calendar, 
  Mail, 
  CheckCircle2, 
  Users,
  Copy,
  ExternalLink
} from 'lucide-react';
import { M365Subscription } from '../../types/database';
import { adminDb } from '../../lib/supabaseClient';

interface M365SubscriptionsTabProps {
  isPhoneView: boolean;
  onFilterByAdmin?: (ownerCode: string) => void;
}

export const M365SubscriptionsTab: React.FC<M365SubscriptionsTabProps> = ({ 
  isPhoneView,
  onFilterByAdmin 
}) => {
  const [subscriptions, setSubscriptions] = useState<M365Subscription[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [adminCode, setAdminCode] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [cardLast4, setCardLast4] = useState('');

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    setLoading(true);
    const list = await adminDb.getM365Subscriptions();
    setSubscriptions(list);
    setLoading(false);
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminCode || !adminEmail) return;

    await adminDb.addM365Subscription({
      owner_code: adminCode.toUpperCase(),
      owner_email: adminEmail,
      billing_cycle: billingCycle,
      card_last4: cardLast4 || '4421',
      renewal_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'active'
    });

    setAdminCode('');
    setAdminEmail('');
    setCardLast4('');
    setShowAddModal(false);
    loadSubscriptions();
  };

  const MAX_SLOTS = 5;

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Microsoft 365 Family – Subscriptions Overview</h3>
          <p className="text-xs text-slate-400">Total active family subscriptions: {subscriptions.length}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f58220] hover:bg-orange-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Admin</span>
          </button>

          <button
            onClick={loadSubscriptions}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#f58220]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid of Admin Cards (matching AdminCard in Python) */}
      <div className={`grid gap-4 ${isPhoneView ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
        {subscriptions.map(admin => {
          const used = admin.used || 0;
          return (
            <div
              key={admin.id}
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3 relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-base font-black text-white tracking-tight">{admin.owner_code}</span>
                  <div className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[220px]">
                    {admin.owner_email}
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase">
                  Active
                </span>
              </div>

              {/* Usage Dots Bar (● ● ● ● ○) */}
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Family Slot Usage:</span>
                  <span className="font-bold text-white font-mono">{used} / {MAX_SLOTS}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  {Array.from({ length: MAX_SLOTS }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-2 flex-1 rounded-full transition-all ${
                        idx < used
                          ? 'bg-[#00a86b] shadow-sm shadow-emerald-900/50'
                          : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Billing Info */}
              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Billing Cycle:</span>
                  <span className="font-medium capitalize text-white">{admin.billing_cycle}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Renewal Date:</span>
                  <span className="font-mono text-purple-300">{admin.renewal_date || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Payment Card:</span>
                  <span className="font-mono text-slate-200">**** {admin.card_last4}</span>
                </div>
              </div>

              {onFilterByAdmin && (
                <button
                  onClick={() => onFilterByAdmin(admin.owner_code)}
                  className="w-full mt-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                >
                  View Assigned Accounts
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Admin Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-white">
            <h3 className="text-sm font-bold text-white mb-3">Add M365 Family Admin</h3>
            <form onSubmit={handleAddAdmin} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Admin Code</label>
                <input
                  type="text"
                  required
                  value={adminCode}
                  onChange={e => setAdminCode(e.target.value)}
                  placeholder="e.g. ADM-04"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white uppercase font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Admin Email</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  placeholder="admin.four@omnisync360.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">Billing Cycle</label>
                  <select
                    value={billingCycle}
                    onChange={e => setBillingCycle(e.target.value as any)}
                    className="w-full px-2 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">Card Last 4</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={cardLast4}
                    onChange={e => setCardLast4(e.target.value)}
                    placeholder="1234"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-[#f58220] text-white"
                >
                  Save Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
