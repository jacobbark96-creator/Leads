import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { Activity, ChevronRight } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';

export const LiveFeed = () => {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchActivities = async () => {
      // 1. Try to fetch from activities table
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          lead_id,
          leads:lead_id(name, company, location, status, lead_purchases(status))
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data && data.length > 0) {
        setEvents(data.map(act => {
          let statusLabel = act.activity_type?.toUpperCase() || 'ACTIVITY';
          
          if (act.activity_type === 'sold' || act.activity_type === 'won') {
            statusLabel = 'WON';
            if (act.leads?.lead_purchases && act.leads.lead_purchases.length > 0) {
              const statuses = act.leads.lead_purchases.map((p: any) => p.status);
              if (statuses.includes('won')) statusLabel = 'WON';
              else if (statuses.includes('archive')) statusLabel = 'ARCHIVED';
              else if (statuses.includes('proposal')) statusLabel = 'PROPOSAL';
              else if (statuses.includes('sat')) statusLabel = 'SURVEYED';
              else if (statuses.includes('contacted')) statusLabel = 'CONTACTED';
            }
          }

          let title = '';
          if (act.leads) {
            title = act.leads.company || act.leads.name || 'Unknown Lead';
          } else {
            title = act.description || 'System Activity';
          }

          const location = act.leads?.location || 'Global';

          let formattedTime = formatDistanceToNow(new Date(act.created_at), { addSuffix: true });
          formattedTime = formattedTime.replace(/^about /i, '');

          return {
            lead_id: act.lead_id,
            time: formattedTime,
            title: title,
            location: location,
            status: statusLabel
          };
        }));
      } else {
        // 2. Fallback: Fetch latest updated leads if activities table is empty
        const { data: latestLeads } = await supabase
          .from('leads')
          .select('id, name, company, location, status, updated_at')
          .order('updated_at', { ascending: false })
          .limit(10);
        
        if (latestLeads) {
          setEvents(latestLeads.map(l => ({
            lead_id: l.id,
            time: formatDistanceToNow(new Date(l.updated_at), { addSuffix: true }).replace('about ', ''),
            title: l.company || l.name || 'Unknown Lead',
            location: l.location || 'Global',
            status: (l.status || 'NEW').toUpperCase()
          })));
        }
      }
    };

    fetchActivities();

    // Subscribe to new activities
    const channel = supabase
      .channel('activities_feed')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'activities' }, 
        payload => {
          if (['qualified', 'marketed', 'sold', 'requested'].includes(payload.new.activity_type)) {
            fetchActivities(); // Refresh to get relations properly
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'QUALIFIED': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'MARKETED': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'SOLD': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'REQUESTED': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'CALL': return 'text-sky-400 bg-sky-400/10 border-sky-400/20';
      case 'EMAIL': return 'text-pink-400 bg-pink-400/10 border-pink-400/20';
      case 'WHATSAPP': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'CONTACTED': return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20';
      case 'SURVEYED': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'PROPOSAL': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'WON': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'ARCHIVED': return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  return (
    <GlassCard delay={0.6} className="p-3 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="relative flex items-center justify-center">
              <span className="absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 opacity-75 animate-ping"></span>
              <span className="relative inline-flex rounded-full h-1 w-1 bg-emerald-500"></span>
            </div>
            <h2 className="text-[10px] font-semibold text-white tracking-wide">LIVE</h2>
          </div>
          <p className="text-[8px] text-gray-500 font-medium">Recent leads entering</p>
        </div>
      </div>
      
      {events.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-2">
            <Activity className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-[11px] text-gray-400 font-medium">No events</p>
        </div>
      ) : (
        <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1">
          {events.map((e, i) => (
            <div key={i} className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.01] transition-all group">
              <div className="flex flex-col min-w-0 flex-1 mr-2">
                {e.lead_id ? (
                  <a 
                    href={`/sales-crm/lead-v2?id=${e.lead_id}&tab=pipeline`} 
                    className="text-[11px] font-medium text-gray-300 group-hover:text-blue-400 transition-colors truncate"
                  >
                    {e.title}
                  </a>
                ) : (
                  <span className="text-[11px] font-medium text-gray-300 truncate">{e.title}</span>
                )}
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[9px] text-gray-500 truncate">{e.location}</span>
                  <span className="text-[8px] text-gray-600">•</span>
                  <span className="text-[9px] text-gray-500 whitespace-nowrap">{e.time}</span>
                </div>
              </div>
              <span className={`text-[7px] font-bold px-1 py-0.5 rounded-md border shrink-0 uppercase tracking-wider ${getStatusStyle(e.status)}`}>
                {e.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-1.5 pt-1.5 border-t border-white/5 flex items-center justify-between cursor-pointer group shrink-0">
        <a href="/sales-crm/all-leads" className="text-[9px] font-medium text-gray-500 group-hover:text-white transition-colors w-full">
          View all →
        </a>
      </div>
    </GlassCard>
  );
};