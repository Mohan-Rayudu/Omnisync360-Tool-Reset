import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Send, 
  CornerUpLeft, 
  AlertTriangle, 
  ShieldCheck, 
  TrendingUp, 
  RefreshCw 
} from 'lucide-react';
import { MailHealthDaily } from '../../types/database';
import { adminDb } from '../../lib/supabaseClient';

interface MailHealthTabProps {
  isPhoneView: boolean;
}

export const MailHealthTab: React.FC<MailHealthTabProps> = ({ isPhoneView }) => {
  const [healthData, setHealthData] = useState<MailHealthDaily[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHealth();
  }, []);

  const loadHealth = async () => {
    setLoading(true);
    const list = await adminDb.getMailHealth();
    setHealthData(list);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Mail Health & Deliverability Monitor</h3>
          <p className="text-xs text-slate-400">Schema table: public.mail_health_daily</p>
        </div>

        <button
          onClick={loadHealth}
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className={`grid gap-3 ${isPhoneView ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {healthData.map(item => (
          <div
            key={item.id}
            className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-white text-xs font-mono truncate max-w-[200px]">
                  {item.email_account}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Date: {item.health_date}
                </div>
              </div>

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                item.risk_level === 'good' 
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                  : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}>
                {item.risk_level} Risk
              </span>
            </div>

            {/* Health Score Pill */}
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Reputation Score:</span>
              <span className="text-base font-extrabold font-mono text-emerald-400">
                {item.health_score} / 100
              </span>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[10px] text-slate-400">Sent</div>
                <div className="font-bold font-mono text-white mt-0.5">{item.sent_count}</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[10px] text-slate-400">Replies</div>
                <div className="font-bold font-mono text-emerald-400 mt-0.5">{item.reply_count}</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="text-[10px] text-slate-400">Bounce</div>
                <div className="font-bold font-mono text-rose-400 mt-0.5">{item.bounce_count}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
