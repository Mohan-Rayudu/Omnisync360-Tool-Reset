import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  UserCheck, 
  AlertCircle,
  Megaphone
} from 'lucide-react';
import { TimeTracking } from '../../types/database';
import { adminDb } from '../../lib/supabaseClient';

interface TeamAttendanceTabProps {
  isPhoneView: boolean;
}

export const TeamAttendanceTab: React.FC<TeamAttendanceTabProps> = ({ isPhoneView }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [tLogs, aList] = await Promise.all([
        adminDb.getTimeTracking(),
        adminDb.getAnnouncements()
      ]);
      setLogs(tLogs);
      setAnnouncements(aList);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Team Attendance & Announcements Hub</h3>
          <p className="text-xs text-slate-400">Schema tables: public.attendance & public.announcement_control</p>
        </div>
      </div>

      {/* Announcements Bar */}
      <div className="p-3.5 rounded-2xl bg-[#002f6c]/30 border border-[#002f6c]/60 text-xs space-y-2">
        <div className="font-bold text-white flex items-center gap-1.5 text-xs">
          <Megaphone className="w-4 h-4 text-[#f58220]" />
          <span>Active Company Announcements</span>
        </div>
        <div className="space-y-1.5">
          {announcements.map(ann => (
            <div key={ann.id} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-200">{ann.title}</div>
                <div className="text-[10px] text-slate-400 font-mono">{ann.file_name}</div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                BROADCASTING
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Team Attendance Logs */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-300 uppercase px-1">Recent Team Punches</div>
        {logs.map(log => (
          <div
            key={log.id}
            className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0b2545] border border-blue-900/50 flex items-center justify-center text-blue-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>{log.date}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {log.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Punch In: {log.punch_in ? new Date(log.punch_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  {' · '}
                  Punch Out: {log.punch_out ? new Date(log.punch_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In Shift'}
                </div>
                {log.notes && (
                  <div className="text-[10px] text-slate-400 italic mt-0.5 line-clamp-1">
                    {log.notes}
                  </div>
                )}
              </div>
            </div>

            <div className="text-right font-mono">
              <div className="text-sm font-bold text-emerald-400">{log.total_hours}h</div>
              <div className="text-[10px] text-slate-400">Hours Logged</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
