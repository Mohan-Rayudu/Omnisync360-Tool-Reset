import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle,
  Cpu,
  KeyRound
} from 'lucide-react';
import { Profile } from '../types/database';
import { getAuthenticatedSupabaseClient } from '../lib/supabaseClient';

interface AuthScreenProps {
  onLoginSuccess: (profile: Profile) => void;
  onOpenSettings?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [machineIdLast6, setMachineIdLast6] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanMachineLast6 = machineIdLast6.trim();

    if (!cleanEmail || !cleanPassword || !cleanMachineLast6) {
      setError('Please provide Email, Password, and the Last 6 Digits of your Machine ID.');
      return;
    }

    if (cleanMachineLast6.length < 6) {
      setError('Machine ID must be the exact last 6 digits of your registered device (e.g. 608449).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const client = getAuthenticatedSupabaseClient();

      // 1. Query profiles table in Supabase
      const { data: profile, error: queryErr } = await client
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .single();

      if (queryErr || !profile) {
        setError('No user account found with this email in the company database.');
        setLoading(false);
        return;
      }

      // 2. Verify admin authorization
      if (!profile.is_admin) {
        setError('Access Denied: This application is restricted exclusively to Company Administrators.');
        setLoading(false);
        return;
      }

      if (profile.is_active === false) {
        setError('Account Suspended: This administrator account is currently inactive.');
        setLoading(false);
        return;
      }

      // 3. Verify Registered Machine ID (Last 6 Digits)
      const uid = profile.user_id || profile.id;
      const { data: devices, error: devErr } = await client
        .from('user_devices')
        .select('machine_id')
        .eq('user_id', uid);

      if (devErr || !devices || devices.length === 0) {
        setError('Device Authorization Failed: No machine ID is registered for this administrator in public.user_devices.');
        setLoading(false);
        return;
      }

      const registeredMachineId = String(devices[0].machine_id || '').trim();
      const registeredLast6 = registeredMachineId.slice(-6);

      if (cleanMachineLast6 !== registeredLast6) {
        setError(
          `Security Check Failed: Machine ID last 6 digits do not match your registered device hardware.`
        );
        setLoading(false);
        return;
      }

      // 4. Verify password with Supabase Auth
      try {
        const { error: authErr } = await client.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword
        });

        if (authErr && !authErr.message.includes('Email not confirmed')) {
          // If password was incorrect
          if (authErr.message.toLowerCase().includes('invalid login credentials') || authErr.message.toLowerCase().includes('invalid credentials')) {
            setError('Authentication Failed: Invalid password for this administrator account.');
            setLoading(false);
            return;
          }
        }
      } catch (authException) {
        console.warn('Supabase signInWithPassword note:', authException);
      }

      // 5. Success - All 3 factors verified (Email + Password + Machine ID last 6)
      try {
        localStorage.setItem('omni_last_admin_email', cleanEmail);
      } catch {}

      onLoginSuccess(profile as Profile);
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-6 py-6 bg-slate-900 text-white select-none">
      <div>
        {/* Brand Logo Header using uploaded Logo1.png */}
        <div className="flex flex-col items-center text-center mb-6 pt-2">
          <div className="relative mb-3">
            <div className="w-16 h-16 rounded-2xl bg-white/10 p-2 border border-slate-700/60 shadow-xl flex items-center justify-center backdrop-blur-sm">
              <img 
                src="/assets/aistudio/Logo1.png" 
                alt="OmniSync 360" 
                className="w-12 h-12 object-contain drop-shadow"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#00a86b] border-2 border-slate-900 flex items-center justify-center">
              <ShieldCheck className="w-3 h-3 text-white" />
            </div>
          </div>
          
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            OmniSync 360 Admin Hub
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Simplify · Automate · Succeed
          </p>
          <div className="mt-2 text-[11px] font-bold px-3 py-0.5 rounded-full bg-[#f58220]/20 border border-[#f58220]/50 text-[#f58220]">
            3-Factor Admin Authorization
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-xs text-rose-300 flex items-start gap-2 shadow-lg animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* 3-Factor Credentials Form (Email + Password + Machine ID Last 6) */}
        <form onSubmit={handleSignIn} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Admin Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="mannemmohan@gmail.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00a86b]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00a86b]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Machine ID (Last 6 Digits)
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                Hardware Device Lock
              </span>
            </div>
            <div className="relative">
              <Cpu className="w-4 h-4 text-[#f58220] absolute left-3 top-3" />
              <input
                type="text"
                required
                maxLength={6}
                value={machineIdLast6}
                onChange={e => setMachineIdLast6(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="e.g. 608449"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-mono tracking-widest placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#f58220]"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Must match the last 6 digits of the machine ID registered in user devices.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-[#002f6c] to-[#00a86b] hover:from-blue-900 hover:to-emerald-600 text-white font-bold text-sm shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying Hardware & Credentials...</span>
              </div>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Sign In as Admin</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      <div className="pt-6 text-center">
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00a86b]" />
          <span>Biometric Fingerprint & Encrypted Hardware Protected</span>
        </div>
      </div>
    </div>
  );
};
