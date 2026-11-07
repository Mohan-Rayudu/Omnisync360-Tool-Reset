import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  CalendarDays, 
  UserCheck, 
  Clock, 
  MapPin, 
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { TeamLead } from '../../types/database';
import { adminDb } from '../../lib/supabaseClient';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface TeamLeadsTabProps {
  isPhoneView: boolean;
}

export const TeamLeadsTab: React.FC<TeamLeadsTabProps> = () => {
  const [leads, setLeads] = useState<TeamLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [ownerFilter, setOwnerFilter] = useState('All Owners');

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    const data = await adminDb.getTeamLeads();
    setLeads(data);
    setLoading(false);
  };

  const uniqueOwners = Array.from(new Set(leads.map(l => l.lead_owner).filter(Boolean))).sort();

  const getEffectiveStatus = (lead: TeamLead): string => {
    if (lead.lead_status && lead.lead_status.trim()) return lead.lead_status.trim();
    if (lead.client_status && lead.client_status.trim()) return lead.client_status.trim();
    return 'New Lead';
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Interested':
        return 'bg-emerald-950/90 text-emerald-300 border-emerald-600/80 shadow-[0_0_8px_rgba(16,185,129,0.25)]';
      case 'Deal Closed':
        return 'bg-green-950/90 text-green-300 border-green-600/80 shadow-[0_0_8px_rgba(34,197,94,0.25)]';
      case 'New Lead':
        return 'bg-sky-950/90 text-sky-300 border-sky-600/80';
      case 'Not Interested':
        return 'bg-rose-950/90 text-rose-300 border-rose-700/80';
      case 'No Response':
        return 'bg-amber-950/90 text-amber-300 border-amber-600/80';
      case 'Sample Requested':
        return 'bg-purple-950/90 text-purple-300 border-purple-600/80';
      case 'Meeting Scheduled':
        return 'bg-indigo-950/90 text-indigo-300 border-indigo-600/80';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const filteredLeads = leads.filter(lead => {
    const effectiveStatus = getEffectiveStatus(lead);

    if (search) {
      const q = search.toLowerCase();
      const match = 
        (lead.client_name || '').toLowerCase().includes(q) ||
        (lead.event_name || '').toLowerCase().includes(q) ||
        (lead.lead_owner || '').toLowerCase().includes(q) ||
        (lead.country || '').toLowerCase().includes(q) ||
        (lead.Remarks || '').toLowerCase().includes(q);
      if (!match) return false;
    }

    if (statusFilter !== 'All Statuses' && effectiveStatus !== statusFilter) return false;
    if (ownerFilter !== 'All Owners' && lead.lead_owner !== ownerFilter) return false;

    return true;
  });

  const formatEventDates = (start?: string | null, end?: string | null) => {
    if (!start && !end) return 'Event Dates TBA';
    if (start && end) return `${start} – ${end}`;
    return start || end || 'Event Dates TBA';
  };

  return (
    <div className="space-y-3.5 select-none pb-8">
      {/* Search & Refresh Bar (Strictly Read-Only, no Add button) */}
      <div className="flex items-center justify-between gap-2 bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800 shadow-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search client, event, owner, country..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#f58220]"
          />
        </div>

        <button
          onClick={loadLeads}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors shrink-0"
          title="Refresh Follow Ups"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#f58220]' : ''}`} />
        </button>
      </div>

      {/* Filter Selectors (Status & Lead Owner) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-slate-300 focus:outline-none shrink-0"
        >
          <option value="All Statuses">All Statuses ({leads.length})</option>
          <option value="New Lead">New Lead</option>
          <option value="Interested">Interested</option>
          <option value="Deal Closed">Deal Closed</option>
          <option value="Not Interested">Not Interested</option>
          <option value="No Response">No Response</option>
          <option value="Sample Requested">Sample Requested</option>
        </select>

        <select
          value={ownerFilter}
          onChange={e => setOwnerFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-slate-300 focus:outline-none shrink-0"
        >
          <option value="All Owners">All Owners</option>
          {uniqueOwners.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>

        <div className="text-[11px] text-slate-400 font-medium px-2 py-1 shrink-0">
          Showing: <span className="text-white font-bold">{filteredLeads.length}</span> leads
        </div>
      </div>

      {loading && leads.length === 0 ? (
        <LoadingSpinner message="Fetching Live Follow Up Leads from Supabase..." size="md" />
      ) : (
        <div className="space-y-2.5">
          {filteredLeads.map(lead => {
            const status = getEffectiveStatus(lead);
            const badgeStyle = getStatusBadgeStyle(status);

            return (
              <div
                key={lead.id}
                className="p-3.5 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-md space-y-2 hover:border-slate-700 transition-colors"
              >
                {/* Line 1: Client Name & Country on Left, Real Status Badge on Right (READ-ONLY) */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                      <span className="truncate">{lead.client_name || 'Anonymous Client'}</span>
                      {lead.country && (
                        <span className="text-[10px] text-slate-400 font-medium shrink-0 flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5 text-slate-400" />
                          <span>{lead.country}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Read-Only Colored Status Badge (Not editable) */}
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 tracking-wide ${badgeStyle}`}
                  >
                    {status}
                  </span>
                </div>

                {/* Line 2: Event Name & Event Dates (Single convenient line) */}
                <div className="text-xs text-slate-300 flex items-center gap-1.5 flex-wrap">
                  <span className="font-medium text-slate-200 truncate max-w-[200px]">
                    {lead.event_name || 'Event Unspecified'}
                  </span>
                  <span className="text-slate-500">·</span>
                  <div className="flex items-center gap-1 text-[11px] text-[#f58220] font-semibold bg-[#f58220]/10 px-2 py-0.5 rounded-lg border border-[#f58220]/30">
                    <CalendarDays className="w-3 h-3 text-[#f58220]" />
                    <span>{formatEventDates(lead.event_start_date, lead.event_end_date)}</span>
                  </div>
                </div>

                {/* Optional Remarks Note (Clean 1-line or preview) */}
                {lead.Remarks && lead.Remarks.trim() && (
                  <div className="text-[11px] text-slate-300 bg-slate-800/60 p-2 rounded-xl border border-slate-700/50 flex items-start gap-1.5">
                    <MessageSquare className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 italic text-slate-300">"{lead.Remarks.trim()}"</span>
                  </div>
                )}

                {/* Line 3: Read-Only Lead Owner & Follow-Up Schedule (No edit / delete buttons) */}
                <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Assigned: <strong className="text-slate-200 font-semibold">{lead.lead_owner || lead.sales_person || 'Unassigned'}</strong></span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-300">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    <span className="text-slate-400">Follow-up:</span>
                    <span className="font-semibold text-slate-200">
                      {lead.follow_up_date || 'TBD'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredLeads.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-xs">
              No follow-up leads match your filter.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
