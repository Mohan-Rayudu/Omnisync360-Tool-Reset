import React, { useState } from 'react';
import { Fingerprint, ShieldCheck, Check, Sparkles, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { registerBiometricCredential } from '../lib/biometricAuth';
import { Profile } from '../types/database';

interface BiometricEnrollModalProps {
  profile: Profile;
  onEnrolled: () => void;
  onSkip: () => void;
}

export const BiometricEnrollModal: React.FC<BiometricEnrollModalProps> = ({
  profile,
  onEnrolled,
  onSkip
}) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleEnroll = async () => {
    setLoading(true);
    try {
      const res = await registerBiometricCredential(profile.user_id, profile.email);
      if (res.success) {
        setSuccess(true);
        try {
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.7 },
            colors: ['#5f259f', '#a855f7', '#10b981']
          });
        } catch {
          // Ignore
        }
        setTimeout(() => {
          onEnrolled();
        }, 800);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-[#150a24] border border-purple-500/30 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative text-white">
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Skip for now"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          {/* Animated Biometric Emblem */}
          <div className="relative my-3 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-purple-600/20 animate-pulse-ring" />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#5f259f] to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-950/80">
              {success ? (
                <Check className="w-9 h-9 text-emerald-400 animate-scaleIn" />
              ) : (
                <Fingerprint className="w-9 h-9 text-white" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-purple-400 font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PhonePe Fast Unlock</span>
          </div>

          <h2 className="text-lg font-bold text-white tracking-tight">
            Enable Fingerprint Unlock?
          </h2>

          <p className="text-xs text-slate-300 mt-2 leading-relaxed px-2">
            Just like PhonePe login, use your device’s fingerprint sensor to authenticate seamlessly next time you open the app.
          </p>

          <div className="w-full my-4 p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 flex items-center gap-2.5 text-left text-xs text-purple-200">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Biometric keys never leave your secure hardware enclave.</span>
          </div>

          <div className="flex flex-col w-full gap-2.5 mt-2">
            <button
              onClick={handleEnroll}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#5f259f] to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-900/50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="text-xs">Connecting Biometric Hardware...</span>
              ) : success ? (
                <span className="text-xs text-emerald-300 font-bold">Fingerprint Registered!</span>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4 text-purple-200" />
                  <span>Enable Fingerprint Sensor</span>
                </>
              )}
            </button>

            <button
              onClick={onSkip}
              className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Maybe Later (Keep Password / PIN)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
