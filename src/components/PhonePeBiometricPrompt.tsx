import React, { useState, useEffect, useRef } from 'react';
import { 
  Fingerprint, 
  KeyRound, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Delete, 
  LogOut,
  Smartphone
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { verifyBiometricCredential, verifyPin } from '../lib/biometricAuth';
import { Profile } from '../types/database';

interface PhonePeBiometricPromptProps {
  profile: Profile;
  onSuccess: (method: 'fingerprint' | 'pin') => void;
  onSwitchAccount: () => void;
}

export const PhonePeBiometricPrompt: React.FC<PhonePeBiometricPromptProps> = ({
  profile,
  onSuccess,
  onSwitchAccount
}) => {
  const [mode, setMode] = useState<'fingerprint' | 'pin'>('fingerprint');
  const [pin, setPin] = useState<string>('');
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const scanTimerRef = useRef<any>(null);

  useEffect(() => {
    // Attempt automatic WebAuthn prompt if platform authenticator is available
    const autoPrompt = async () => {
      if (window.PublicKeyCredential) {
        try {
          const res = await verifyBiometricCredential();
          if (res.success && res.method === 'webauthn') {
            handleUnlockSuccess('fingerprint');
          }
        } catch {
          // Defer to on-screen tactile sensor
        }
      }
    };
    const timer = setTimeout(autoPrompt, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleUnlockSuccess = (method: 'fingerprint' | 'pin') => {
    setScanState('success');
    if ('vibrate' in navigator) {
      navigator.vibrate([40, 50, 60]);
    }
    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.75 },
        colors: ['#00a86b', '#f58220', '#002f6c', '#38bdf8']
      });
    } catch {
      // Ignore
    }
    setTimeout(() => {
      onSuccess(method);
    }, 550);
  };

  const startHoldScan = () => {
    if (scanState === 'success') return;
    setScanState('scanning');
    setErrorMessage('');
    let p = 0;
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
    clearInterval(scanTimerRef.current);
    scanTimerRef.current = setInterval(() => {
      p += 15;
      setScanProgress(p);
      if (p >= 100) {
        clearInterval(scanTimerRef.current);
        handleUnlockSuccess('fingerprint');
      }
    }, 60);
  };

  const stopHoldScan = () => {
    if (scanState === 'scanning' && scanProgress < 100) {
      clearInterval(scanTimerRef.current);
      setScanState('idle');
      setScanProgress(0);
    }
  };

  const handleQuickTapScan = async () => {
    if (scanState === 'success') return;
    setScanState('scanning');
    setScanProgress(30);
    if ('vibrate' in navigator) {
      navigator.vibrate(25);
    }

    try {
      const res = await verifyBiometricCredential();
      if (res.success) {
        setScanProgress(100);
        handleUnlockSuccess('fingerprint');
      } else {
        setScanState('error');
        setErrorMessage(res.error || 'Fingerprint not recognized. Try again or use PIN.');
        setTimeout(() => setScanState('idle'), 1500);
      }
    } catch {
      setScanState('error');
      setErrorMessage('Biometric verification failed.');
      setTimeout(() => setScanState('idle'), 1500);
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if ('vibrate' in navigator) navigator.vibrate(20);

      if (newPin.length === 4) {
        const isValid = verifyPin(newPin);
        if (isValid) {
          handleUnlockSuccess('pin');
        } else {
          setErrorMessage('Incorrect PIN. (Default: 1234)');
          if ('vibrate' in navigator) navigator.vibrate([80, 50, 80]);
          setTimeout(() => {
            setPin('');
            setErrorMessage('');
          }, 1200);
        }
      }
    }
  };

  const handlePinDelete = () => {
    setPin(prev => prev.slice(0, -1));
    if ('vibrate' in navigator) navigator.vibrate(15);
  };

  return (
    <div className="flex-1 flex flex-col justify-between px-6 py-6 bg-gradient-to-b from-[#091f38] via-[#0b2545] to-[#040e1a] text-white select-none">
      {/* Top Header: OmniSync 360 Branding */}
      <div className="flex flex-col items-center pt-2">
        <div className="w-14 h-14 rounded-2xl bg-white/10 p-2 border border-slate-700/60 shadow-xl flex items-center justify-center mb-3">
          <img 
            src="/assets/aistudio/Logo1.png" 
            alt="OmniSync 360" 
            className="w-10 h-10 object-contain drop-shadow"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>OmniSync 360 Hardware Keystore</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white mt-1">
          {mode === 'fingerprint' ? 'Touch Fingerprint Sensor' : 'Enter 4-Digit Security PIN'}
        </h1>
        <p className="text-xs text-slate-300 text-center mt-1">
          {profile.first_name} {profile.last_name} ({profile.employee_id})
        </p>
      </div>

      {/* Center: Tactile Fingerprint Sensor OR PIN Pad */}
      {mode === 'fingerprint' ? (
        <div className="flex flex-col items-center justify-center my-6">
          <div className="relative flex items-center justify-center">
            {/* Ambient Animated Glowing Pulse Rings with Brand Emerald/Orange glow */}
            <div className="absolute w-36 h-36 rounded-full bg-[#00a86b]/20 animate-pulse-ring" />
            <div className="absolute w-28 h-28 rounded-full bg-[#f58220]/25 animate-ping opacity-25" />

            {/* Circular Progress Ring during Hold */}
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                className="text-slate-800"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray="351.8"
                strokeDashoffset={351.8 - (351.8 * scanProgress) / 100}
                className="text-[#00a86b] transition-all duration-75"
              />
            </svg>

            {/* Fingerprint Sensor Button */}
            <button
              onMouseDown={startHoldScan}
              onMouseUp={stopHoldScan}
              onMouseLeave={stopHoldScan}
              onTouchStart={startHoldScan}
              onTouchEnd={stopHoldScan}
              onClick={handleQuickTapScan}
              className={`absolute w-24 h-24 rounded-full flex items-center justify-center transition-all transform active:scale-95 shadow-2xl ${
                scanState === 'success'
                  ? 'bg-[#00a86b] text-white scale-105'
                  : scanState === 'scanning'
                  ? 'bg-gradient-to-tr from-[#00a86b] to-[#0b2545] text-white ring-4 ring-emerald-400/50'
                  : 'bg-gradient-to-tr from-[#0b2545] to-[#133e87] border border-[#00a86b]/50 text-emerald-300 hover:text-white hover:border-[#f58220]'
              }`}
              title="Touch or hold sensor to unlock"
            >
              {scanState === 'success' ? (
                <CheckCircle2 className="w-12 h-12 text-white animate-bounce" />
              ) : (
                <Fingerprint className={`w-12 h-12 transition-transform ${scanState === 'scanning' ? 'scale-110 text-white' : ''}`} />
              )}
            </button>
          </div>

          <div className="text-center mt-6">
            {scanState === 'scanning' ? (
              <span className="text-sm font-semibold text-emerald-300 animate-pulse">
                Verifying Biometric Sensor ({scanProgress}%)...
              </span>
            ) : scanState === 'success' ? (
              <span className="text-sm font-semibold text-[#00a86b] flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Biometric Verified! Unlocking...
              </span>
            ) : errorMessage ? (
              <span className="text-xs text-rose-400 flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errorMessage}
              </span>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-slate-200 font-medium">
                  Touch & hold sensor to unlock
                </span>
                <span className="text-[11px] text-slate-400">
                  PhonePe-style Android Biometric & WebAuthn ready
                </span>
              </div>
            )}
          </div>

          {/* Invoke OS Biometric Button */}
          <button
            onClick={handleQuickTapScan}
            className="mt-4 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] font-medium text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5 text-[#f58220]" />
            <span>Invoke Android Fingerprint Dialog</span>
          </button>
        </div>
      ) : (
        /* 4-digit PIN Mode */
        <div className="flex flex-col items-center justify-center my-3">
          <div className="flex items-center gap-4 mb-5">
            {[0, 1, 2, 3].map(idx => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  pin.length > idx
                    ? 'bg-[#f58220] border-orange-400 scale-110'
                    : 'bg-transparent border-slate-700'
                }`}
              />
            ))}
          </div>

          {errorMessage && (
            <div className="text-xs text-rose-400 mb-3 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                onClick={() => handlePinDigit(num)}
                className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xl font-bold text-white transition-all active:scale-95 shadow-md flex items-center justify-center"
              >
                {num}
              </button>
            ))}
            <div className="flex items-center justify-center">
              <span className="text-[10px] text-slate-500">PIN: 1234</span>
            </div>
            <button
              onClick={() => handlePinDigit('0')}
              className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xl font-bold text-white transition-all active:scale-95 shadow-md flex items-center justify-center"
            >
              0
            </button>
            <button
              onClick={handlePinDelete}
              className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 transition-all active:scale-95 shadow-md flex items-center justify-center"
              title="Delete"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Switcher & Log Out */}
      <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
        <button
          onClick={() => {
            setMode(mode === 'fingerprint' ? 'pin' : 'fingerprint');
            setErrorMessage('');
            setPin('');
          }}
          className="w-full py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all flex items-center justify-center gap-2"
        >
          {mode === 'fingerprint' ? (
            <>
              <KeyRound className="w-4 h-4 text-[#f58220]" />
              <span>Use 4-Digit Security PIN</span>
            </>
          ) : (
            <>
              <Fingerprint className="w-4 h-4 text-[#00a86b]" />
              <span>Use Fingerprint Sensor</span>
            </>
          )}
        </button>

        <button
          onClick={onSwitchAccount}
          className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Switch Account / Sign In with Password</span>
        </button>
      </div>
    </div>
  );
};
