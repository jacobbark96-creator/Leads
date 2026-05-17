import React, { useEffect, useState } from 'react';
import { GlassCard } from './GlassCard';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useAuthStore } from '../../../../store/authStore';
import { format, isToday } from 'date-fns';

export const TasksPanel = () => {
  const { profile } = useAuthStore();
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;
    
    const fetchTasks = async () => {
      // Fetch tasks for today for the current user
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('lead_reminders')
        .select(`
          *,
          leads:lead_id (
            id,
            name,
            company
          )
        `)
        .eq('user_id', profile.id)
        .gte('reminder_at', todayStart.toISOString())
        .lte('reminder_at', todayEnd.toISOString())
        .order('reminder_at', { ascending: true });

      if (!error && data) {
        setTasks(data.map(task => ({
          time: format(new Date(task.reminder_at), 'HH:mm'),
          title: `${task.content} - ${task.leads?.company || task.leads?.name || 'Unknown Lead'}`,
          priority: 'Medium', // Defaulting priority as it might not be in DB
          id: task.id,
          isCompleted: task.is_completed
        })));
      }
    };

    fetchTasks();
  }, [profile]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-400 border-red-400/20 bg-red-400/10';
      case 'Medium': return 'text-amber-400 border-amber-400/20 bg-amber-400/10';
      case 'Low': return 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10';
      default: return 'text-gray-400 border-gray-400/20 bg-gray-400/10';
    }
  };

  return (
    <GlassCard delay={0.2} className="p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Tasks for Today</h2>
          <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">{tasks.length}</span>
        </div>
      </div>
      
      {tasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-xs text-gray-400 font-medium">No tasks scheduled</p>
          <p className="text-[10px] text-gray-500 mt-1">Connect Tasks API</p>
        </div>
      ) : (
        <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar">
          {tasks.map((task, i) => (
            <div key={i} className="flex items-center gap-3 group cursor-pointer">
              <span className="text-xs font-medium text-gray-400 w-10">{task.time}</span>
              <div className="flex-1 text-xs text-gray-200 group-hover:text-white transition-colors truncate">
                {task.title}
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between cursor-pointer group">
        <span className="text-[11px] font-medium text-blue-400 group-hover:text-blue-300 transition-colors">View all tasks</span>
        <ChevronRight className="w-3 h-3 text-blue-400 group-hover:text-blue-300 transition-colors" />
      </div>
    </GlassCard>
  );
};