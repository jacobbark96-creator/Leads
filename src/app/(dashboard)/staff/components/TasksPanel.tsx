import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useAuthStore } from '../../../../store/authStore';
import { format, isToday } from 'date-fns';
import Link from 'next/link';

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

      // Tasks assigned BY the user (they created the reminder)
      const { data: tasksByMe, error: errByMe } = await supabase
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

      // Tasks assigned TO the user (lead is assigned to them)
      const { data: tasksToMe, error: errToMe } = await supabase
        .from('lead_reminders')
        .select(`
          *,
          leads!inner (
            id,
            name,
            company,
            assigned_to
          )
        `)
        .eq('leads.assigned_to', profile.id)
        .gte('reminder_at', todayStart.toISOString())
        .lte('reminder_at', todayEnd.toISOString())
        .order('reminder_at', { ascending: true });

      let allTasks: any[] = [];
      const seenTaskIds = new Set<string>();

      const processTasks = (tasksList: any[]) => {
        if (!tasksList) return;
        tasksList.forEach(task => {
          if (!seenTaskIds.has(task.id)) {
            seenTaskIds.add(task.id);
            allTasks.push({
              time: format(new Date(task.reminder_at), 'HH:mm'),
              title: `${task.content} - ${task.leads?.company || task.leads?.name || 'Unknown Lead'}`,
              priority: 'Medium', // Defaulting priority
              id: task.id,
              isCompleted: task.is_completed,
              link: `/sales-crm/lead-v2?id=${task.lead_id}&tab=pipeline`
            });
          }
        });
      };

      if (!errByMe) processTasks(tasksByMe);
      if (!errToMe) processTasks(tasksToMe);

      // Fetch leads assigned to user, qualified, but missing bills
      const { data: missingBillsData, error: missingBillsError } = await supabase
        .from('leads')
        .select('id, name, company')
        .eq('assigned_to', profile.id)
        .eq('status', 'qualified')
        .or('bills_url.is.null,bills_url.eq.');

      if (!missingBillsError && missingBillsData) {
        missingBillsData.forEach(lead => {
          allTasks.push({
            time: 'Action',
            title: `Missing Bills - ${lead.company || lead.name || 'Unknown Lead'}`,
            priority: 'High',
            id: `missing-bills-${lead.id}`,
            isCompleted: false,
            link: `/sales-crm/lead-v2?id=${lead.id}&tab=pipeline`
          });
        });
      }

      // Fetch Google Calendar Events
      const fetchCalendarEvents = async () => {
        try {
          const res = await fetch('/api/google/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: profile.id })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.has_token === false) return;
            
            const token = data.access_token;
            
            const timeMin = todayStart.toISOString();
            const timeMax = todayEnd.toISOString();
            
            const calRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (calRes.ok) {
              const calData = await calRes.json();
              const events = calData.items || [];
              
              events.forEach((event: any) => {
                let timeStr = 'All Day';
                if (event.start?.dateTime) {
                  timeStr = format(new Date(event.start.dateTime), 'HH:mm');
                }
                
                allTasks.push({
                  time: timeStr,
                  title: `📅 ${event.summary || 'Meeting'}`,
                  priority: 'Medium',
                  id: event.id,
                  isCompleted: false,
                  link: event.htmlLink || null
                });
              });
            }
          }
        } catch (error) {
          console.error('Error fetching calendar events', error);
        }
      };

      await fetchCalendarEvents();

      // Sort allTasks by time/priority
      allTasks.sort((a, b) => {
        if (a.priority === 'High' && b.priority !== 'High') return -1;
        if (b.priority === 'High' && a.priority !== 'High') return 1;
        return a.time.localeCompare(b.time);
      });

      setTasks(allTasks);
    };

    fetchTasks();
  }, [profile?.id]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-400 border-red-400/20 bg-red-400/10';
      case 'Medium': return 'text-amber-400 border-amber-400/20 bg-amber-400/10';
      case 'Low': return 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10';
      default: return 'text-gray-400 border-gray-400/20 bg-gray-400/10';
    }
  };

  if (!profile?.permissions?.includes('staff/tasks') && profile?.role !== 'super_admin') return null;

  return (
    <GlassCard delay={0.2} className="p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-400" />
          <h2 className="text-base font-semibold text-white">Tasks for Today</h2>
          <span className="bg-blue-600 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full ml-1">{tasks.length}</span>
        </div>
      </div>
      
      {tasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-sm text-gray-400 font-medium">No tasks scheduled</p>
          <p className="text-[11px] text-gray-500 mt-1">Connect Tasks API</p>
        </div>
      ) : (
        <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar">
          {tasks.map((task, i) => (
            <div key={i} className="flex items-center gap-3 group cursor-pointer">
              <span className="text-sm font-medium text-gray-400 w-10">{task.time}</span>
              <div className="flex-1 text-sm text-gray-200 group-hover:text-white transition-colors truncate">
                  {task.link ? (
                    <Link href={task.link} target={task.link.startsWith('http') ? '_blank' : undefined} className="hover:underline text-blue-400">
                      {task.title}
                    </Link>
                  ) : (
                    task.title
                  )}
                </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between cursor-pointer group">
        <span className="text-xs font-medium text-blue-400 group-hover:text-blue-300 transition-colors">View all tasks</span>
        <ChevronRight className="w-3 h-3 text-blue-400 group-hover:text-blue-300 transition-colors" />
      </div>
    </GlassCard>
  );
};