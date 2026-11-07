import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  BatteryMedium, 
  Smartphone, 
  Monitor, 
  Lock, 
  Database,
  ShieldCheck
} from 'lucide-react';

interface AndroidDeviceFrameProps {
  children: React.ReactNode;
  isPhoneFrame: boolean;
  onToggleFrame: () => void;
  onLockApp: () => void;
  onOpenSettings: () => void;
  isBiometricActive: boolean;
}

export const AndroidDeviceFrame: React.FC<AndroidDeviceFrameProps> = ({
  children,
  isPhoneFrame,
  onToggleFrame,
  onLockApp,
  onOpenSettings,
  isBiometricActive
}) => {
  const [currentTime, setCurrentTime] = useState('09:41');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`w-full flex justify-center ${isPhoneFrame ? 'py-2 md:py-6' : 'p-0'}`}>
      <div 
        className={
          isPhoneFrame 
            ? "w-full max-w-[420px] h-[100dvh] md:h-[880px] bg-slate-950 md:rounded-[46px] shadow-[0_25px_80px_rgba(0,0,0,0.95)] border-0 md:border-[10px] md:border-slate-800/95 relative flex flex-col overflow-hidden ring-1 ring-slate-700/50 transition-all"
            : "w-full max-w-7xl min-h-[92vh] bg-slate-950 flex flex-col overflow-hidden"
        }
      >
        {/* Android Punch-hole Camera & Status Bar (Only in Phone Frame mode) */}
        {isPhoneFrame && (
          <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-7 pt-2.5 pb-1 select-none pointer-events-none text-white bg-slate-950/80 backdrop-blur-sm">
            <span className="text-[12px] font-semibold tracking-tight tabular-nums pl-1 font-mono">
              {currentTime}
            </span>
            {/* Center Punch-hole Camera */}
            <div className="w-4 h-4 rounded-full bg-black ring-2 ring-slate-900 shadow-inner flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
            </div>
            {/* Android 5G + Battery */}
            <div className="flex items-center gap-1.5 text-slate-200 pr-1">
              <span className="text-[10px] font-extrabold text-[#f58220]">5G</span>
              <Wifi className="w-3.5 h-3.5 text-slate-300" />
              <div className="flex items-center gap-0.5">
                <span className="text-[11px] font-medium tabular-nums font-mono">98%</span>
                <BatteryMedium className="w-4 h-4 text-[#00a86b]" />
              </div>
            </div>
          </div>
        )}

        {/* Viewport Content */}
        <div className={`flex-1 flex flex-col overflow-y-auto ${isPhoneFrame ? 'pt-8 pb-3 px-3' : 'p-4 sm:p-6'}`}>
          {children}
        </div>

        {/* Android Gesture Bar */}
        {isPhoneFrame && (
          <div className="h-5 bg-slate-950 flex items-center justify-center shrink-0 z-40 select-none pointer-events-none">
            <div className="w-32 h-1 bg-slate-600/70 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
};
