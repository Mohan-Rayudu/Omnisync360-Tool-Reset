import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Smartphone, 
  Monitor, 
  Database, 
  LogOut,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Profile } from '../types/database';

interface OmniSyncHeaderProps {
  profile: Profile;
  viewMode: 'desktop' | 'phone';
  onToggleViewMode: () => void;
  onLockApp: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
}

export const OmniSyncHeader: React.FC<OmniSyncHeaderProps> = ({
  profile,
  viewMode,
  onToggleViewMode,
  onLockApp,
  onOpenSettings,
  onSignOut
}) => {
  return (
    <header className="bg-[#0b2545] border-b border-[#133e87]/40 text-white shadow-lg sticky top-0 z-40 select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <img 
              src="/assets/aistudio/Logo_cd80aebc.png" 
              alt="OmniSync 360" 
              className="h-9 sm:h-10 w-auto object-contain bg-white/95 rounded-lg p-1 shadow-md"
            />
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight text-white">OmniSync 360</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#f58220] text-white uppercase tracking-wider shadow-sm">
                  Admin Hub
                </span>
              </div>
              <p className="text-[10px] text-slate-300 font-medium">Simplify · Automate · Succeed</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* PC vs Phone View Toggle ("all apps i provided is compatible and eazy for viewing in pc... phone app should be very convenient") */}
          <button
            onClick={onToggleViewMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-sm border ${
              viewMode === 'desktop'
                ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                : 'bg-[#f58220] text-white border-orange-400 hover:bg-orange-500'
            }`}
            title="Toggle between PC Desktop layout and Mobile Phone chassis view"
          >
            {viewMode === 'desktop' ? (
              <>
                <Smartphone className="w-3.5 h-3.5 text-[#f58220]" />
                <span className="hidden md:inline">Phone View</span>
              </>
            ) : (
              <>
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden md:inline">PC Desktop View</span>
              </>
            )}
          </button>

          {/* Biometric PhonePe Lock Screen Test */}
          <button
            onClick={onLockApp}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#00a86b]/20 hover:bg-[#00a86b]/30 border border-[#00a86b]/50 text-xs font-semibold text-emerald-300 transition-all active:scale-95"
            title="Lock screen immediately to test PhonePe Fingerprint Unlock"
          >
            <Lock className="w-3.5 h-3.5 text-[#00a86b]" />
            <span className="hidden lg:inline">Fingerprint Lock</span>
          </button>

          {/* Supabase Edge Functions & Settings */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 transition-colors"
            title="Edge Functions & Supabase Settings"
          >
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Edge Functions</span>
          </button>

          {/* Sign Out */}
          <button
            onClick={onSignOut}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Switch User / Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
