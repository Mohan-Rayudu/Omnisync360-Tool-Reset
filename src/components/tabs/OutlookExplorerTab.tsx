import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mail, 
  Trash2, 
  RefreshCw, 
  Search, 
  Clock, 
  ArrowLeft, 
  Copy, 
  Check, 
  Bell, 
  X,
  Radio,
  Sparkles
} from 'lucide-react';
import { EmployeeReply } from '../../types/database';
import { adminDb, getAuthenticatedSupabaseClient } from '../../lib/supabaseClient';
import { cleanEmailHtml } from '../../lib/htmlSanitizer';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface OutlookExplorerTabProps {
  isPhoneView: boolean;
}

interface EmployeeGroup {
  email: string;
  displayName: string;
  initials: string;
  avatarColor: string;
  latestReceivedAt: string;
  replies: EmployeeReply[];
}

export const OutlookExplorerTab: React.FC<OutlookExplorerTabProps> = () => {
  const [replies, setReplies] = useState<EmployeeReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmpEmail, setSelectedEmpEmail] = useState<string>('');
  const [selectedReply, setSelectedReply] = useState<EmployeeReply | null>(null);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [newMailAlert, setNewMailAlert] = useState<{
    mail: EmployeeReply;
    staffName: string;
  } | null>(null);

  // Keep a ref of known IDs to prevent duplicate alerts
  const knownIdsRef = useRef<Set<number | string>>(new Set());

  // Web Audio Synth Chime for notifications
  const playChime = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // Audio not permitted or user hasn't interacted
    }
  }, []);

  const getCleanName = (email?: string | null): string => {
    if (!email) return 'General';
    const prefix = email.split('@')[0];
    const parts = prefix.split('.');
    const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    return first;
  };

  const handleIncomingNewMail = useCallback((newMail: EmployeeReply) => {
    if (knownIdsRef.current.has(newMail.id)) return;
    knownIdsRef.current.add(newMail.id);

    // Prepend to state
    setReplies(prev => {
      const exists = prev.some(r => r.id === newMail.id);
      if (exists) return prev;
      return [newMail, ...prev];
    });

    const staff = getCleanName(newMail.employee_email);
    setNewMailAlert({ mail: newMail, staffName: staff });
    playChime();
    if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);

    // Auto-dismiss alert after 6 seconds
    setTimeout(() => {
      setNewMailAlert(curr => (curr?.mail.id === newMail.id ? null : curr));
    }, 6000);
  }, [playChime]);

  const loadData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const list = await adminDb.getEmployeeReplies();
      // Sort newest on top
      const sorted = [...list].sort(
        (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
      );

      // Check for new arrivals if background poll
      if (isBackground && knownIdsRef.current.size > 0) {
        sorted.forEach(mail => {
          if (!knownIdsRef.current.has(mail.id)) {
            handleIncomingNewMail(mail);
          }
        });
      } else {
        sorted.forEach(m => knownIdsRef.current.add(m.id));
        setReplies(sorted);
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // Initial load + Realtime Channel + Polling get function
  useEffect(() => {
    loadData();

    // 1. Supabase Realtime Subscription
    let channel: any = null;
    try {
      const client = getAuthenticatedSupabaseClient();
      channel = client
        .channel('realtime_outlook_replies')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'employee_replies' },
          payload => {
            const newRecord = payload.new as EmployeeReply;
            if (newRecord) {
              handleIncomingNewMail(newRecord);
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription error:', e);
    }

    // 2. Periodic GET function polling every 12 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 12000);

    return () => {
      if (channel) {
        const client = getAuthenticatedSupabaseClient();
        client.removeChannel(channel);
      }
      clearInterval(interval);
    };
  }, [handleIncomingNewMail]);

  const getColorForName = (name: string): string => {
    const colors = [
      'bg-purple-600 text-white',
      'bg-blue-600 text-white',
      'bg-emerald-600 text-white',
      'bg-orange-600 text-white',
      'bg-pink-600 text-white',
      'bg-teal-600 text-white',
      'bg-indigo-600 text-white'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return colors[Math.abs(hash) % colors.length];
  };

  // Group all mails by employee with:
  // 1. Staff with newest received email at the TOP
  // 2. Emails within each group sorted newest first
  const getEmployeeGroups = (allReplies: EmployeeReply[]): EmployeeGroup[] => {
    const map = new Map<string, EmployeeReply[]>();

    allReplies.forEach(rep => {
      const emp = rep.employee_email || 'jyothi.priya@omnisync360.com';
      if (!map.has(emp)) {
        map.set(emp, []);
      }
      map.get(emp)!.push(rep);
    });

    const groups: EmployeeGroup[] = [];
    map.forEach((reps, email) => {
      // Sort replies newest first
      reps.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());

      const name = getCleanName(email);
      const latestTime = reps[0]?.received_at || '';

      groups.push({
        email,
        displayName: name,
        initials: name.slice(0, 2).toUpperCase(),
        avatarColor: getColorForName(name),
        latestReceivedAt: latestTime,
        replies: reps
      });
    });

    // Requirement: "the new one should show top as well as staff"
    // Sort staff groups so whoever received the most recent email is at the VERY TOP!
    groups.sort((a, b) => {
      const timeA = new Date(a.latestReceivedAt).getTime() || 0;
      const timeB = new Date(b.latestReceivedAt).getTime() || 0;
      return timeB - timeA;
    });

    return groups;
  };

  const employeeGroups = getEmployeeGroups(replies);
  const currentGroup = employeeGroups.find(g => g.email === selectedEmpEmail) || employeeGroups[0];

  const filteredReplies = (currentGroup?.replies || []).filter(rep => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (rep.sender_name || '').toLowerCase().includes(q) ||
      (rep.sender_email || '').toLowerCase().includes(q) ||
      (rep.subject || '').toLowerCase().includes(q) ||
      (rep.reply_body || '').toLowerCase().includes(q)
    );
  });

  const handleCopyClearText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteOldMails = async () => {
    if (window.confirm('Delete email replies older than 14 days?')) {
      const deletedCount = await adminDb.deleteOldMails(14);
      alert(`Deleted ${deletedCount} archived replies.`);
      loadData();
    }
  };

  return (
    <div className="space-y-3 select-none flex flex-col h-full min-h-[580px] relative">
      {/* Real-time Notification Banner for Incoming Mails */}
      {newMailAlert && (
        <div 
          onClick={() => {
            setSelectedEmpEmail(newMailAlert.mail.employee_email);
            setSelectedReply(newMailAlert.mail);
            setNewMailAlert(null);
          }}
          className="p-3 rounded-2xl bg-gradient-to-r from-[#f58220] via-orange-600 to-[#00a86b] text-white shadow-2xl flex items-center justify-between gap-2.5 cursor-pointer animate-bounce hover:scale-[1.01] transition-all border border-white/30 z-30"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-white animate-spin" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-extrabold flex items-center gap-1.5 truncate">
                <span>New Email for {newMailAlert.staffName}!</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono">LIVE</span>
              </div>
              <div className="text-[11px] text-white/90 truncate">
                From: {newMailAlert.mail.sender_name || newMailAlert.mail.sender_email} · &quot;{newMailAlert.mail.subject || 'No Subject'}&quot;
              </div>
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setNewMailAlert(null);
            }} 
            className="p-1 rounded-full hover:bg-white/20 text-white/80 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Search & Controls with Live Real-time Indicator */}
      <div className="flex items-center justify-between gap-2 bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800 shadow-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search email text, sender, subject..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#f58220]"
          />
        </div>

        {/* Real-time Indicator */}
        <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-[10px] font-bold text-emerald-400">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>Realtime</span>
        </div>

        <button
          onClick={() => loadData()}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors shrink-0"
          title="Refresh Inbox"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#f58220]' : ''}`} />
        </button>

        <button
          onClick={handleDeleteOldMails}
          className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/50 text-rose-300 transition-colors shrink-0"
          title="Purge Old Archived Emails"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
        </button>
      </div>

      {loading && replies.length === 0 ? (
        <LoadingSpinner message="Connecting to Live Outlook Stream..." size="md" />
      ) : (
        /* Main Mail Viewport: Small Employee Icons at Left + Emails at Right */
        <div className="flex-1 flex gap-2 overflow-hidden rounded-2xl bg-slate-900/70 border border-slate-800 p-1.5">
          
          {/* Left Side: Staff List sorted by most recent received email on top */}
          <div className="w-14 sm:w-16 flex flex-col items-center py-2 px-1 gap-2.5 bg-slate-950 rounded-xl border border-slate-800/80 overflow-y-auto no-scrollbar shrink-0">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">
              Staff
            </span>

            {employeeGroups.map((group, idx) => {
              const isSelected = (selectedEmpEmail || employeeGroups[0]?.email) === group.email;
              const hasVeryRecent = idx === 0;

              return (
                <button
                  key={group.email}
                  onClick={() => {
                    setSelectedEmpEmail(group.email);
                    setSelectedReply(null);
                    if ('vibrate' in navigator) navigator.vibrate(15);
                  }}
                  className={`relative flex flex-col items-center justify-center p-1 rounded-xl transition-all w-full cursor-pointer ${
                    isSelected 
                      ? 'bg-[#f58220]/20 ring-2 ring-[#f58220] scale-105 shadow-md' 
                      : 'hover:bg-slate-800/60 opacity-80 hover:opacity-100'
                  }`}
                  title={`${group.displayName} (Latest: ${group.latestReceivedAt})`}
                >
                  {/* Small circular avatar with optional recent badge */}
                  <div className="relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md ${group.avatarColor}`}>
                      {group.displayName.slice(0, 1)}
                    </div>
                    {hasRecent(group.latestReceivedAt) && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950 animate-pulse" />
                    )}
                  </div>

                  {/* Name underneath */}
                  <span className={`text-[10px] mt-0.5 font-bold truncate max-w-full text-center ${
                    isSelected ? 'text-[#f58220]' : 'text-slate-300'
                  }`}>
                    {group.displayName}
                  </span>

                  {/* Reply count badge */}
                  <span className="text-[8px] font-mono px-1 py-0.1 rounded-full bg-slate-800 text-slate-300 mt-0.5">
                    {group.replies.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Side: Email List OR Clean Mail Reading Pane */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/60 rounded-xl border border-slate-800/60 p-2">
            
            {selectedReply ? (
              /* Clear Clean Mail Reading View (Clean body, no raw HTML tags) */
              <div className="flex-1 flex flex-col overflow-hidden animate-fadeIn space-y-2.5">
                {/* Back to list button & Copy Clear Text */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
                  <button
                    onClick={() => setSelectedReply(null)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-[#f58220]" />
                    <span>Back to {currentGroup?.displayName}&apos;s Inbox</span>
                  </button>

                  <button
                    onClick={() => handleCopyClearText(cleanEmailHtml(selectedReply.reply_body))}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
                    title="Copy Clean Text"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Text'}</span>
                  </button>
                </div>

                {/* Subject & Meta header */}
                <div className="space-y-1 shrink-0 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                  <h4 className="text-sm font-extrabold text-white leading-snug">
                    {selectedReply.subject || '(No Subject)'}
                  </h4>
                  <div className="flex items-center justify-between text-xs text-slate-300 flex-wrap gap-1">
                    <div>
                      <span className="font-semibold text-emerald-400">{selectedReply.sender_name || 'Sender'}</span>
                      <span className="text-slate-400 text-[11px] font-mono ml-1.5">&lt;{selectedReply.sender_email}&gt;</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{selectedReply.received_at}</span>
                    </div>
                  </div>
                </div>

                {/* Clear Clean Readable Text Body (Raw HTML tags stripped!) */}
                <div className="flex-1 overflow-y-auto p-3.5 rounded-xl bg-slate-900/95 border border-slate-800 text-xs text-slate-100 font-sans leading-relaxed whitespace-pre-wrap select-text selection:bg-[#f58220]/30 selection:text-white">
                  {cleanEmailHtml(selectedReply.reply_body)}
                </div>
              </div>
            ) : (
              /* Email List for Selected Employee (Newest on Top) */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Active Employee Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${currentGroup?.avatarColor}`}>
                      {currentGroup?.displayName.slice(0, 1)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{currentGroup?.displayName}&apos;s Replies</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-800 text-[#00a86b] font-mono">
                          NEWEST FIRST
                        </span>
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {currentGroup?.email}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-mono">
                    {filteredReplies.length} replies
                  </span>
                </div>

                {/* Scrollable Emails (Newest on Top) */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {filteredReplies.map((rep, idx) => (
                    <div
                      key={rep.id}
                      onClick={() => {
                        setSelectedReply(rep);
                        if ('vibrate' in navigator) navigator.vibrate(15);
                      }}
                      className={`p-3 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all active:scale-[0.99] space-y-1.5 shadow-sm ${
                        idx === 0 ? 'ring-1 ring-[#f58220]/30 bg-slate-900/90' : ''
                      }`}
                    >
                      {/* Sender and Date */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white truncate max-w-[180px] flex items-center gap-1">
                          <span>{rep.sender_name || rep.sender_email}</span>
                          {idx === 0 && (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#f58220]/20 text-[#f58220] border border-[#f58220]/40">
                              LATEST
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {rep.received_at?.split(' ')[0]}
                        </span>
                      </div>

                      {/* Subject */}
                      <div className="text-xs font-semibold text-[#f58220] truncate">
                        {rep.subject || '(No Subject)'}
                      </div>

                      {/* Clear Clean Text Preview */}
                      <div className="text-[11px] text-slate-400 line-clamp-2 leading-tight">
                        {cleanEmailHtml(rep.reply_body)}
                      </div>
                    </div>
                  ))}

                  {filteredReplies.length === 0 && (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      No emails found for {currentGroup?.displayName}.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function hasRecent(dateStr?: string): boolean {
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  const now = Date.now();
  // within last 48 hours
  return now - t < 48 * 3600 * 1000;
}
