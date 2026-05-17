import React, { useEffect, useState } from 'react';
import { GlassCard } from './GlassCard';
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
          users:user_id (name)
        `)
        .in('activity_type', ['qualified', 'marketed', 'sold'])
        .order('created_at', { ascending: false })
        .limit(15);

      if (!error && data) {
        setEvents(data.map(act => {
          let statusLabel = 'New';
          if (act.activity_type === 'qualified') statusLabel = 'Qualified';
          if (act.activity_type === 'marketed') statusLabel = 'Marketed';
          if (act.activity_type === 'sold') statusLabel = 'Sold';

          let title = act.description;
          if (act.users?.name && act.activity_type !== 'sold') {
            title += ` - ${act.users.name}`;
          }

          return {
            time: formatDistanceToNow(new Date(act.created_at), { addSuffix: true }),
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
          if (['qualified', 'marketed', 'sold'].includes(payload.new.activity_type)) {
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
      default: return 'text-gray-400 border-gray-400/20';
    }
  };

  return (
    <GlassCard delay={0.6} className="p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-blue-400" />
        <h2 className="text-sm font-semibold text-white">Live Lead Feed</h2>
      </div>
      
      {events.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
            <Activity className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-xs text-gray-400 font-medium">No live events</p>
          <p className="text-[10px] text-gray-500 mt-1">Connect Feed API</p>
        </div>
      ) : (
        <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar">
          {events.map((e, i) => (
            <div key={i} className="flex items-center gap-3 group cursor-pointer">
              <span className="text-[11px] font-medium text-gray-500 w-10">{e.time}</span>
              <div className="flex-1 text-[11px] text-gray-300 group-hover:text-white transition-colors truncate">
                {e.title}
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${getStatusStyle(e.status)}`}>
                {e.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between cursor-pointer group">
        <span className="text-[11px] font-medium text-blue-400 group-hover:text-blue-300 transition-colors">View full live feed</span>
        <ChevronRight className="w-3 h-3 text-blue-400 group-hover:text-blue-300 transition-colors" />
      </div>
    </GlassCard>
  );
};