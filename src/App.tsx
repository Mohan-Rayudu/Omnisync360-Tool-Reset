/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  Mail, 
  SlidersHorizontal,
  Clock,
  Activity,
  Lock
} from 'lucide-react';
import { PhoneAppHeader } from './components/PhoneAppHeader';
import { AndroidDeviceFrame } from './components/AndroidDeviceFrame';
import { PhonePeBiometricPrompt } from './components/PhonePeBiometricPrompt';
import { AuthScreen } from './components/AuthScreen';
import { UsersDevicesTab } from './components/tabs/UsersDevicesTab';
import { TeamLeadsTab } from './components/tabs/TeamLeadsTab';
import { OutlookExplorerTab } from './components/tabs/OutlookExplorerTab';
import { TeamAttendanceTab } from './components/tabs/TeamAttendanceTab';
import { MailHealthTab } from './components/tabs/MailHealthTab';
import { Profile } from './types/database';
import { mockAdminProfile } from './lib/mockDatabase';
import { getBiometricStatus } from './lib/biometricAuth';

const STORAGE_SESSION_PROFILE = 'omnisync_admin_profile';

type PhoneBottomTab = 'users' | 'leads' | 'outlook' | 'more';
type MoreSubTab = 'attendance' | 'mailhealth';

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  // Prompt: "it should ask for authentation like finger print or pin everytime i open the app"
  const [isLocked, setIsLocked] = useState<boolean>(true);
  
  // Primary Mobile Phone Navigation (M365 tab completely removed as requested)
  const [currentTab, setCurrentTab] = useState<PhoneBottomTab>('users');
  const [moreSubTab, setMoreSubTab] = useState<MoreSubTab>('attendance');

  useEffect(() => {
    // Clear any previous mock caches
    localStorage.removeItem('omni_phone_users');
    localStorage.removeItem('omni_phone_leads');
    localStorage.removeItem('omni_phone_accounts');
    localStorage.removeItem('omni_phone_subs');

    const saved = localStorage.getItem(STORAGE_SESSION_PROFILE);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Profile;
        if (parsed && parsed.email && parsed.is_admin) {
          setProfile(parsed);
          setIsLocked(true);
        } else {
          setProfile(null);
          setIsLocked(false);
        }
      } catch {
        setProfile(null);
        setIsLocked(false);
      }
    } else {
      setProfile(null);
      setIsLocked(false);
    }

    // Always require biometric / PIN unlock on app launch
    setIsLocked(true);
  }, []);

  const handleLoginSuccess = (loggedInProfile: Profile) => {
    setProfile(loggedInProfile);
    localStorage.setItem(STORAGE_SESSION_PROFILE, JSON.stringify(loggedInProfile));
    // Immediately unlock upon fresh successful credential authentication
    setIsLocked(false);
  };

  const handleUnlockSuccess = () => {
    setIsLocked(false);
  };

  const handleSignOut = () => {
    localStorage.removeItem(STORAGE_SESSION_PROFILE);
    setProfile(null);
    setIsLocked(false);
  };

  const bioStatus = getBiometricStatus();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* 1. PhonePe-Style Biometric / PIN Lock Overlay on Every App Launch */}
      {profile && isLocked ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950">
          <div className="w-full max-w-[430px] h-[100dvh] sm:h-[860px] flex flex-col rounded-none sm:rounded-[44px] overflow-hidden shadow-2xl border-0 sm:border-8 sm:border-slate-800">
            <PhonePeBiometricPrompt
              profile={profile}
              onSuccess={handleUnlockSuccess}
              onSwitchAccount={handleSignOut}
            />
          </div>
        </div>
      ) : !profile ? (
        /* 2. Admin Login Screen */
        <div className="flex-1 flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-[420px] h-[660px] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
            <AuthScreen
              onLoginSuccess={handleLoginSuccess}
            />
          </div>
        </div>
      ) : (
        /* 3. Main Android Phone App Container */
        <div className="flex-1 flex items-center justify-center py-0 lg:py-6 px-0 lg:px-6 max-w-lg mx-auto w-full">
          <div className="w-full max-w-[430px] flex flex-col h-[100dvh] sm:h-[890px]">
            <AndroidDeviceFrame
              isPhoneFrame={true}
              onToggleFrame={() => {}}
              onLockApp={() => setIsLocked(true)}
              onOpenSettings={() => {}}
              isBiometricActive={bioStatus.isRegistered}
            >
              {/* Clean Phone App Header (Supabase URL, key, and lock buttons removed) */}
              <PhoneAppHeader
                profile={profile}
                onSignOut={handleSignOut}
              />

              {/* Sub-Header Tabs only for More (Attendance vs Mail Health) */}
              {currentTab === 'more' && (
                <div className="bg-[#081b33] p-1.5 border-b border-slate-800 flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setMoreSubTab('attendance')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      moreSubTab === 'attendance'
                        ? 'bg-[#00a86b] text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Attendance</span>
                  </button>
                  <button
                    onClick={() => setMoreSubTab('mailhealth')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      moreSubTab === 'mailhealth'
                        ? 'bg-[#00a86b] text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Mail Health</span>
                  </button>
                </div>
              )}

              {/* Main Content Area */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 sm:p-3 space-y-3">
                {currentTab === 'users' && (
                  <UsersDevicesTab isPhoneView={true} />
                )}

                {currentTab === 'leads' && (
                  <TeamLeadsTab isPhoneView={true} />
                )}

                {currentTab === 'outlook' && (
                  <OutlookExplorerTab isPhoneView={true} />
                )}

                {currentTab === 'more' && moreSubTab === 'attendance' && (
                  <TeamAttendanceTab isPhoneView={true} />
                )}

                {currentTab === 'more' && moreSubTab === 'mailhealth' && (
                  <MailHealthTab isPhoneView={true} />
                )}
              </div>

              {/* Native Android Bottom Navigation Bar (M365 tab completely removed) */}
              <div className="bg-[#071629] border-t border-[#133e87]/40 px-3 py-1.5 flex items-center justify-around shrink-0 z-40 shadow-lg">
                <button
                  onClick={() => {
                    setCurrentTab('users');
                    if ('vibrate' in navigator) navigator.vibrate(15);
                  }}
                  className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                    currentTab === 'users'
                      ? 'text-[#f58220] font-bold scale-105'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] tracking-tight">Users</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentTab('leads');
                    if ('vibrate' in navigator) navigator.vibrate(15);
                  }}
                  className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                    currentTab === 'leads'
                      ? 'text-[#f58220] font-bold scale-105'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Calendar className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] tracking-tight">Follow Up</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentTab('outlook');
                    if ('vibrate' in navigator) navigator.vibrate(15);
                  }}
                  className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                    currentTab === 'outlook'
                      ? 'text-[#f58220] font-bold scale-105'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Mail className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] tracking-tight">Outlook</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentTab('more');
                    if ('vibrate' in navigator) navigator.vibrate(15);
                  }}
                  className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                    currentTab === 'more'
                      ? 'text-[#f58220] font-bold scale-105'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <SlidersHorizontal className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] tracking-tight">More</span>
                </button>
              </div>
            </AndroidDeviceFrame>
          </div>
        </div>
      )}
    </div>
  );
}
