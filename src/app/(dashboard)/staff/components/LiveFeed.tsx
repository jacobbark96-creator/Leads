import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { Activity, ChevronRight } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';

export const LiveFeed = () => {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchActivities = async () => {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          lead_id,
          leads:lead_id(name, company, lead_purchases(status))
        `)
        .in('activity_type', ['qualified', 'marketed', 'sold', 'requested'])
        .order('created_at', { ascending: false })
        .limit(15);

      if (!error && data) {
        setEvents(data.map(act => {
          let statusLabel = 'New';
          if (act.activity_type === 'qualified') statusLabel = 'Qualified';
          if (act.activity_type === 'marketed') statusLabel = 'Marketed';
          if (act.activity_type === 'requested') statusLabel = 'Requested';
          
          if (act.activity_type === 'sold') {
            statusLabel = 'Sold';
            // Check if there's a more recent status in lead_purchases
            if (act.leads?.lead_purchases && act.leads.lead_purchases.length > 0) {
              // Get the most advanced status if multiple exist, or just the first one
              const statuses = act.leads.lead_purchases.map((p: any) => p.status);
              if (statuses.includes('won')) statusLabel = 'Won';
              else if (statuses.includes('archive')) statusLabel = 'Archive';
              else if (statuses.includes('proposal')) statusLabel = 'Proposal';
              else if (statuses.includes('sat')) statusLabel = 'Surveyed';
              else if (statuses.includes('contacted')) statusLabel = 'Contacted';
              else if (statuses.includes('new')) statusLabel = 'Sold';
            }
          }

          let title = '';
          if (act.leads) {
            title = act.leads.company || act.leads.name || 'Unknown Lead';
          } else {
            // Fallback parsing just in case
            title = act.description.split(' - ')[0] || act.description;
          }

          // Format time: remove "about " from "about 1 hour ago"
          let formattedTime = formatDistanceToNow(new Date(act.created_at), { addSuffix: true });
          formattedTime = formattedTime.replace(/^about /i, '');

          return {
            lead_id: act.lead_id,
            time: formattedTime,
            title: title,
            status: statusLabel
          };
        }));
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
      case 'Qualified': return 'text-amber-400 border-amber-400/20';
      case 'Marketed': return 'text-blue-400 border-blue-400/20 bg-blue-400/10';
      case 'Sold': return 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10';
      case 'Requested': return 'text-purple-400 border-purple-400/20 bg-purple-400/10';
      case 'Contacted': return 'text-indigo-400 border-indigo-400/20 bg-indigo-400/10';
      case 'Surveyed': return 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10';
      case 'Proposal': return 'text-orange-400 border-orange-400/20 bg-orange-400/10';
      case 'Won': return 'text-green-400 border-green-400/20 bg-green-400/10';
      case 'Archive': return 'text-slate-400 border-slate-400/20 bg-slate-400/10';
      default: return 'text-gray-400 border-gray-400/20';
    }
  };

  return (
    <GlassCard delay={0.6} className="p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-blue-400" />
        <h2 className="text-base font-semibold text-white">Live Lead Feed</h2>
      </div>
      
      {events.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
            <Activity className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-sm text-gray-400 font-medium">No live events</p>
          <p className="text-[11px] text-gray-500 mt-1">Connect Feed API</p>
        </div>
      ) : (
        <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar">
          {events.map((e, i) => (
            <div key={i} className="flex items-center gap-2 sm:gap-3 group">
              <span className="text-[10px] sm:text-xs font-medium text-gray-500 w-12 sm:w-16 shrink-0">{e.time}</span>
              <div className="flex-1 text-center text-[11px] sm:text-xs font-bold truncate">
                {e.lead_id ? (
                  <a 
                    href={`/sales-crm/lead-v2?id=${e.lead_id}&tab=pipeline`} 
                    className="text-gray-200 hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    {e.title}
                  </a>
                ) : (
                  <span className="text-gray-200">{e.title}</span>
                )}
              </div>
              <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border shrink-0 ${getStatusStyle(e.status)}`}>
                {e.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between cursor-pointer group">
        <span className="text-xs font-medium text-blue-400 group-hover:text-blue-300 transition-colors">View full live feed</span>
        <ChevronRight className="w-3 h-3 text-blue-400 group-hover:text-blue-300 transition-colors" />
      </div>
    </GlassCard>
  );
};