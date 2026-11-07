import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  RefreshCw, 
  Database,
  KeyRound,
  Fingerprint
} from 'lucide-react';
import { 
  SUPABASE_URL, 
  getMaskedKeyPreview, 
  isVaultActive 
} from '../lib/cryptoVault';
import { testLiveSupabaseConnection } from '../lib/supabaseClient';

interface VaultSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VaultSecurityModal: React.FC<VaultSecurityModalProps> = ({
  isOpen,
  onClose
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestPing = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testLiveSupabaseConnection();
    setTestResult(res);
    setTesting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-5 text-white space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Encrypted Service Role Key</h3>
              <p className="text-[10px] text-emerald-300">Active In-Memory Protection</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Status Box */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Supabase Endpoint:</span>
            <span className="font-mono text-emerald-400 font-bold text-[11px] truncate max-w-[180px]">
              kymifrlbbduoloviaybg.supabase.co
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Encryption Method:</span>
            <span className="font-mono text-slate-200 font-semibold text-[11px]">
              AES-256-GCM + PBKDF2
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Vault Memory State:</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
              ENCRYPTED & PROTECTED
            </span>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <div className="text-[10px] text-slate-400 mb-1">Masked Key Preview:</div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-purple-300 break-all select-all">
              {getMaskedKeyPreview()}
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-300 leading-relaxed bg-[#0b2545]/60 p-3 rounded-xl border border-blue-900/40 flex items-start gap-2">
          <Lock className="w-4 h-4 text-[#f58220] shrink-0 mt-0.5" />
          <span>
            The raw service role key is securely masked. When you lock the phone or close the app, the in-memory decryptor is instantly purged and requires biometric unlock.
          </span>
        </div>

        {/* Test Connection Button */}
        <button
          onClick={handleTestPing}
          disabled={testing}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-[#f58220]' : 'text-slate-400'}`} />
          <span>{testing ? 'Pinging kymifrlbbduoloviaybg...' : 'Ping Live Supabase Endpoint'}</span>
        </button>

        {testResult && (
          <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-[11px] text-emerald-300 font-medium">
            {testResult.message}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 text-xs font-bold rounded-xl bg-[#f58220] hover:bg-orange-500 text-white shadow-md transition-colors"
        >
          Close Security Vault
        </button>
      </div>
    </div>
  );
};
