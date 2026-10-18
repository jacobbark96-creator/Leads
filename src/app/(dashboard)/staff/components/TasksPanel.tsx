import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { CheckCircle2, ChevronRight, Layout } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useAuthStore } from '../../../../store/authStore';
import { format, isToday } from 'date-fns';
import Link from 'next/link';

export const TasksPanel = () => {
  const { profile } = useAuthStore();
  const [tasks, setTasks] = useState<any[]>([]);
  const [googleTasks, setGoogleTasks] = useState<any[]>([]);
  const [googleListId, setGoogleListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const fetchGoogleTasks = async () => {
    if (!isAdmin || !profile?.id) return;
    try {
      const res = await fetch(`/api/google/tasks?userId=${profile.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.connected) {
          setGoogleTasks(data.tasks.map((task: any) => ({
            time: task.due ? format(new Date(task.due), 'HH:mm') : 'All Day',
            date: task.due ? format(new Date(task.due), 'dd/MM') : '',
            title: task.title,
            priority: 'Medium',
            id: task.id,
            isCompleted: task.status === 'completed',
            isGoogle: true,
            notes: task.notes
          })));
          setGoogleListId(data.listId);
        }
      }
    } catch (err) {
      console.error('Error fetching Google Tasks:', err);
    }
  };

  const fetchTasks = async () => {
    if (!profile) return;
    
    // Fetch local tasks
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const { data: allReminders, error: err } = await supabase
      .from('lead_reminders')
      .select(`
        *,
        leads:lead_id (
          id,
          name,
          company,
          assigned_to
        )
      `)
      .eq('is_completed', false)
      .gte('reminder_at', yesterdayStart.toISOString())
      .lte('reminder_at', todayEnd.toISOString())
      .order('reminder_at', { ascending: true });

    if (!err && allReminders) {
      const processed = allReminders
        .filter(task => {
          return task.user_id === profile.id || 
                 task.leads?.assigned_to === profile.id || 
                 profile.role === 'super_admin' || 
                 profile.role === 'admin';
        })
        .map(task => ({
          time: format(new Date(task.reminder_at), 'HH:mm'),
          date: format(new Date(task.reminder_at), 'dd/MM'),
          title: `${task.content} - ${task.leads?.company || task.leads?.name || 'Unknown Lead'}`,
          priority: isToday(new Date(task.reminder_at)) ? 'Medium' : 'High',
          id: task.id,
          isCompleted: task.is_completed,
          link: `/sales-crm/lead-v2?id=${task.lead_id}&tab=pipeline`
        }));
      
      setTasks(processed);
    } else {
      setTasks([]);
    }
  };

  useEffect(() => {
    if (!profile) return;
    
    fetchTasks();
    if (isAdmin) {
      fetchGoogleTasks();
    }

    const channel = supabase.channel('lead-reminders-panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_reminders' }, fetchTasks)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, isAdmin]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'Medium': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'Low': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const handleTaskToggle = async (e: React.MouseEvent, task: any) => {
    e.stopPropagation();
    
    if (task.isGoogle) {
      if (!googleListId || !profile?.id) return;
      
      // Optimistic update
      setGoogleTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t
      ));

      try {
        const res = await fetch('/api/google/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: profile.id,
            taskId: task.id,
            listId: googleListId,
            completed: !task.isCompleted
          })
        });
        if (!res.ok) throw new Error('Failed to update Google Task');
      } catch (err) {
        // Rollback
        setGoogleTasks(prev => prev.map(t => 
          t.id === task.id ? { ...t, isCompleted: task.isCompleted } : t
        ));
        console.error(err);
      }
    } else {
      // Local task toggle
      const { error } = await supabase
        .from('lead_reminders')
        .update({ is_completed: !task.isCompleted })
        .eq('id', task.id);

      if (error) {
        console.error('Error toggling task', error);
      }
    }
  };

  const allTasks = [...tasks, ...googleTasks].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    return 0;
  });

  return (
    <GlassCard delay={0.2} className="p-3 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div>
          <h2 className="text-[10px] font-semibold text-white tracking-wide flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-blue-400" />
            TASKS FOR TODAY
            <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[8px] font-bold px-1.5 py-0.5 rounded-full ml-1">
              {allTasks.length}
            </span>
          </h2>
        </div>
      </div>
      
      {allTasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-[11px] text-gray-400 font-medium">No tasks</p>
        </div>
      ) : (
        <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1">
          {allTasks.map((task, i) => (
            <div key={task.id || i} className="flex items-center p-1.5 rounded-lg bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.01] transition-all group">
              <button 
                onClick={(e) => handleTaskToggle(e, task)}
                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center mr-2 transition-colors shrink-0 ${
                  task.isCompleted 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : 'border-white/10 hover:border-blue-400/50 text-transparent'
                }`}
              >
                <CheckCircle2 className="w-2 h-2" />
              </button>
              
              <div className="flex-1 min-w-0 mr-2">
                <div className={`text-[11px] font-medium transition-colors truncate ${task.isCompleted ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                  {task.link ? (
                    <Link href={task.link} target={task.link.startsWith('http') ? '_blank' : undefined} className="hover:text-blue-400 transition-colors">
                      {task.title}
                    </Link>
                  ) : (
                    task.title
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[9px] text-gray-500 truncate">{task.time}</span>
                  {task.isGoogle && (
                    <span className="text-[8px] text-blue-400/70 font-bold ml-1 flex items-center gap-0.5">
                      <Layout className="w-2 h-2" /> GOOGLE
                    </span>
                  )}
                </div>
              </div>
              
              {!task.isGoogle && (
                <span className={`text-[7px] font-bold px-1 py-0.5 rounded-md border shrink-0 uppercase tracking-wider ${getPriorityColor(task.priority)} ${task.isCompleted ? 'opacity-30' : ''}`}>
                  {task.priority.substring(0, 1)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-1.5 pt-1.5 border-t border-white/5 flex items-center justify-between cursor-pointer group shrink-0">
        <Link href="/sales-crm/pipeline" className="text-[9px] font-medium text-gray-500 group-hover:text-white transition-colors w-full">
          View all →
        </Link>
      </div>
    </GlassCard>
  );
};