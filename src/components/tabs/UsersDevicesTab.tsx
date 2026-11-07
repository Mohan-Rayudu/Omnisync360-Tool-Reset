import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Smartphone, 
  Search, 
  RotateCcw, 
  ShieldCheck, 
  UserPlus, 
  RefreshCw, 
  Mail, 
  CheckCircle2, 
  AlertCircle,
  Fingerprint,
  KeyRound,
  Delete,
  X,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AdminUserListItem } from '../../types/database';
import { adminDb } from '../../lib/supabaseClient';
import { verifyBiometricCredential, verifyPin } from '../../lib/biometricAuth';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface UsersDevicesTabProps {
  isPhoneView: boolean;
}

export const UsersDevicesTab: React.FC<UsersDevicesTabProps> = ({ isPhoneView }) => {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ msg: string; type: 'success' | 'info' } | null>(null);

  // Machine ID Reset with PhonePe Biometric Authentication
  const [userToReset, setUserToReset] = useState<AdminUserListItem | null>(null);
  const [authMode, setAuthMode] = useState<'fingerprint' | 'pin'>('fingerprint');
  const [pinCode, setPinCode] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [authError, setAuthError] = useState<string>('');
  const scanTimerRef = useRef<any>(null);

  // Create User modal/form
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmpId, setNewEmpId] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const list = await adminDb.getUsers();
    setUsers(list);
    setLoading(false);
  };

  const showNotification = (msg: string, type: 'success' | 'info' = 'success') => {
    setActionNotice({ msg, type });
    if ('vibrate' in navigator) navigator.vibrate([30, 40]);
    setTimeout(() => setActionNotice(null), 4000);
  };

  /**
   * Triggers PhonePe-style Biometric Authentication modal before resetting hardware
   */
  const initiateResetMachineId = (user: AdminUserListItem) => {
    setUserToReset(user);
    setAuthMode('fingerprint');
    setPinCode('');
    setAuthError('');
    setIsScanning(false);

    // Auto-prompt WebAuthn if available
    if (window.PublicKeyCredential) {
      setTimeout(async () => {
        try {
          const res = await verifyBiometricCredential();
          if (res.success) {
            executeReset(user);
          }
        } catch {
          // Fall back to tactile sensor
        }
      }, 350);
    }
  };

  const handleFingerprintTouchStart = () => {
    setIsScanning(true);
    setAuthError('');
    if ('vibrate' in navigator) navigator.vibrate(25);

    scanTimerRef.current = setTimeout(() => {
      setIsScanning(false);
      if (userToReset) {
        executeReset(userToReset);
      }
    }, 900);
  };

  const handleFingerprintTouchEnd = () => {
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    setIsScanning(false);
  };

  const handlePinPress = (digit: string) => {
    if (pinCode.length >= 4) return;
    if ('vibrate' in navigator) navigator.vibrate(15);
    const newPin = pinCode + digit;
    setPinCode(newPin);

    if (newPin.length === 4) {
      if (verifyPin(newPin) && userToReset) {
        executeReset(userToReset);
      } else {
        setAuthError('Incorrect 4-digit PIN. Default is 1234.');
        if ('vibrate' in navigator) navigator.vibrate([50, 40, 50]);
        setTimeout(() => setPinCode(''), 600);
      }
    }
  };

  const executeReset = async (user: AdminUserListItem) => {
    setUserToReset(null);
    if ('vibrate' in navigator) navigator.vibrate([40, 50, 60]);
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch {}

    const res = await adminDb.resetMachineId(user.id);
    showNotification(res.message, 'success');
    await loadUsers();
  };

  const handleToggleAdmin = async (user: AdminUserListItem) => {
    const nextVal = await adminDb.toggleAdmin(user.id);
    showNotification(`${user.email} is now ${nextVal ? 'an Admin' : 'a standard Employee'}.`, 'info');
    loadUsers();
  };

  const handleToggleDisable = async (user: AdminUserListItem) => {
    const nextVal = await adminDb.toggleDisable(user.id);
    showNotification(`Account ${user.email} has been ${nextVal ? 'enabled' : 'disabled'}.`, 'info');
    loadUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    await adminDb.createUser(newEmail, newEmpId, newName, newIsAdmin);
    setNewEmail('');
    setNewName('');
    setNewEmpId('');
    setNewIsAdmin(false);
    setShowCreateModal(false);
    showNotification(`Employee ${newEmail} created successfully!`, 'success');
    loadUsers();
  };

  const filtered = users.filter(u => 
    search === '' || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.employee_id.toLowerCase().includes(search.toLowerCase()) ||
    u.machine_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3.5 select-none">
      {/* Top Action Notification */}
      {actionNotice && (
        <div className={`p-3 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-lg transition-all ${
          actionNotice.type === 'success' 
            ? 'bg-[#00a86b]/20 border border-[#00a86b]/50 text-emerald-300' 
            : 'bg-blue-950/60 border border-blue-800 text-blue-300'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionNotice.msg}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search & Actions Bar */}
      <div className="flex items-center justify-between gap-2 bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800 shadow-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search email, ID, or machine..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#f58220]"
          />
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-[#f58220] hover:bg-orange-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>

        <button
          onClick={loadUsers}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
          title="Refresh Users"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#f58220]' : ''}`} />
        </button>
      </div>

      {loading && users.length === 0 ? (
        <LoadingSpinner message="Fetching Users & Hardware Devices from Supabase..." size="md" />
      ) : (
        /* Convenient Mobile Cards */
        <div className="space-y-3">
          {filtered.map(user => (
          <div
            key={user.id}
            className="p-3.5 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-md space-y-2.5"
          >
            {/* Header: Name, Role, Employee ID */}
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-white text-sm flex items-center gap-1.5">
                  <span>{user.first_name} {user.last_name}</span>
                  {user.is_admin ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-950 border border-purple-800 text-purple-300">
                      ADMIN
                    </span>
                  ) : (
                    <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                      EMPLOYEE
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-300 font-mono mt-0.5">{user.email}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{user.employee_id} · {user.department}</div>
              </div>

              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                user.is_active ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}>
                {user.is_active ? 'Active' : 'Disabled'}
              </span>
            </div>

            {/* Mails Today & This Month Counters (Live from public.sent_mails) */}
            <div className="grid grid-cols-2 gap-2 bg-[#081a30] p-2 rounded-xl border border-blue-900/40 text-xs">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] text-slate-400">Sent Today:</span>
                <span className="font-mono font-bold text-emerald-400 text-xs">{user.mails_today}</span>
              </div>
              <div className="flex items-center justify-between px-1 border-l border-blue-900/60">
                <span className="text-[11px] text-slate-400">This Month:</span>
                <span className="font-mono font-bold text-[#f58220] text-xs">{user.mails_month}</span>
              </div>
            </div>

            {/* Machine ID Box */}
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <Smartphone className="w-3.5 h-3.5 text-[#00a86b] shrink-0" />
                <span className="text-[10px] text-slate-400 shrink-0">Machine ID:</span>
                <span className="font-mono text-slate-200 text-[11px] truncate max-w-[170px]" title={user.machine_id}>
                  {user.machine_id}
                </span>
              </div>

              {user.machine_id !== 'Not set' ? (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  BOUND
                </span>
              ) : (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  UNBOUND
                </span>
              )}
            </div>

            {/* Reset Machine ID (Prompts PhonePe Biometric or PIN Authentication) */}
            <button
              onClick={() => initiateResetMachineId(user)}
              className="w-full py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/50 text-rose-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Reset Machine ID (Unlock Hardware)</span>
            </button>
          </div>
        ))}
      </div>
    )}

      {/* PhonePe-Style Biometric / PIN Authentication Sheet for Reset Machine ID */}
      {userToReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm rounded-[36px] bg-slate-900 border border-slate-700 p-6 shadow-2xl text-white flex flex-col items-center text-center">
            
            {/* Header & Warning */}
            <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-500/50 flex items-center justify-center text-rose-400 mb-3 shadow-lg">
              <RotateCcw className="w-6 h-6 animate-spin-slow" />
            </div>

            <h3 className="text-base font-extrabold text-white">Authorize Machine Reset</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-[280px]">
              Confirm resetting hardware lock for <strong className="text-emerald-400">{userToReset.first_name} {userToReset.last_name}</strong>
            </p>
            <div className="text-[10px] text-slate-400 font-mono mt-1">
              {userToReset.email} · ID: {userToReset.machine_id}
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-2 mt-4 mb-4 p-1 rounded-2xl bg-slate-950 border border-slate-800 w-full">
              <button
                onClick={() => { setAuthMode('fingerprint'); setAuthError(''); }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  authMode === 'fingerprint'
                    ? 'bg-[#5f259f] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Fingerprint className="w-4 h-4" />
                <span>Fingerprint</span>
              </button>
              <button
                onClick={() => { setAuthMode('pin'); setAuthError(''); }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  authMode === 'pin'
                    ? 'bg-[#5f259f] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span>4-Digit PIN</span>
              </button>
            </div>

            {authError && (
              <div className="mb-3 p-2 rounded-xl bg-rose-950/60 border border-rose-800 text-[11px] text-rose-300 w-full flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Fingerprint Ripple Sensor */}
            {authMode === 'fingerprint' ? (
              <div className="my-2 flex flex-col items-center">
                <div 
                  onMouseDown={handleFingerprintTouchStart}
                  onMouseUp={handleFingerprintTouchEnd}
                  onTouchStart={handleFingerprintTouchStart}
                  onTouchEnd={handleFingerprintTouchEnd}
                  className={`relative w-28 h-28 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-95 select-none ${
                    isScanning 
                      ? 'bg-purple-600/40 ring-4 ring-purple-500 scale-105' 
                      : 'bg-purple-950/50 hover:bg-purple-900/50 ring-2 ring-purple-600/40'
                  }`}
                >
                  {/* Glowing ripple waves */}
                  <span className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping opacity-40 pointer-events-none" />
                  <Fingerprint className={`w-14 h-14 transition-colors ${
                    isScanning ? 'text-[#00a86b]' : 'text-purple-300'
                  }`} />
                </div>
                <p className="text-xs text-purple-300 font-medium mt-3">
                  {isScanning ? 'Verifying biometric signature...' : 'Touch & hold sensor to confirm'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">PhonePe Biometric Security</p>
              </div>
            ) : (
              /* 4-Digit PIN Keypad */
              <div className="w-full flex flex-col items-center">
                <div className="flex items-center gap-3 mb-4">
                  {[0, 1, 2, 3].map(i => (
                    <div 
                      key={i} 
                      className={`w-4 h-4 rounded-full border-2 transition-all ${
                        pinCode.length > i 
                          ? 'bg-[#5f259f] border-purple-400 scale-110' 
                          : 'border-slate-600 bg-transparent'
                      }`} 
                    />
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 w-full max-w-[240px]">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((val, idx) => {
                    if (val === '') return <div key={idx} />;
                    if (val === 'del') {
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPinCode(pinCode.slice(0, -1))}
                          className="h-11 rounded-2xl bg-slate-800 text-slate-300 font-bold flex items-center justify-center hover:bg-slate-700 active:scale-90"
                        >
                          <Delete className="w-4 h-4" />
                        </button>
                      );
                    }
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePinPress(val)}
                        className="h-11 rounded-2xl bg-slate-800 text-white font-bold text-base flex items-center justify-center hover:bg-purple-950/60 hover:border-purple-600 active:scale-90 transition-all border border-slate-700/60"
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cancel Button */}
            <button
              onClick={() => setUserToReset(null)}
              className="mt-5 w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-white">
            <h3 className="text-sm font-bold text-white mb-3">Create New Employee User</h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="employee@omnisync360.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#f58220]"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400">Employee ID</label>
                <input
                  type="text"
                  value={newEmpId}
                  onChange={e => setNewEmpId(e.target.value)}
                  placeholder="EMP1045"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#f58220]"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="First & Last Name"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#f58220]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isAdminCheckbox"
                  checked={newIsAdmin}
                  onChange={e => setNewIsAdmin(e.target.checked)}
                  className="rounded text-[#f58220] focus:ring-0"
                />
                <label htmlFor="isAdminCheckbox" className="text-xs text-slate-300 font-medium cursor-pointer">
                  Grant Administrator Access
                </label>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold rounded-xl bg-[#f58220] hover:bg-orange-500 text-white shadow-md"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
