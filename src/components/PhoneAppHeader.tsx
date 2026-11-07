import React from 'react';
import { 
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { Profile } from '../types/database';

interface PhoneAppHeaderProps {
  profile: Profile;
  onSignOut: () => void;
}

export const PhoneAppHeader: React.FC<PhoneAppHeaderProps> = ({
  profile,
  onSignOut
}) => {
  return (
    <header className="bg-[#0b2545] border-b border-[#133e87]/40 text-white px-3 py-2 flex items-center justify-between sticky top-0 z-40 select-none shadow-md">
      {/* Brand Logo & Admin Info (Clean, no URL or Key icons) */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-white/10 p-1 border border-slate-700/60 shadow-sm flex items-center justify-center shrink-0">
          <img 
            src="/assets/aistudio/Logo1.png" 
            alt="OmniSync 360" 
            className="w-6 h-6 object-contain"
          />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-extrabold tracking-tight text-white">OmniSync 360</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#f58220] text-white">
              ADMIN
            </span>
          </div>
          <div className="text-[11px] text-slate-300 font-medium">
            {profile.first_name} {profile.last_name}
          </div>
        </div>
      </div>

      {/* Sign Out Button */}
      <button
        onClick={onSignOut}
        className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
        title="Sign Out"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </header>
  );
};
