"use client";

import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isWeekend, lastDayOfMonth, subDays, isFriday } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon, Clock, MapPin, ExternalLink, CalendarDays, Plus, Banknote, Scissors } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
}

export const GoogleCalendar = () => {
  const { profile } = useAuthStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [apiDisabled, setApiDisabled] = useState(false);

  const fetchEvents = async () => {
    if (!profile?.id) return;
    
    try {
      setLoading(true);
      const timeMin = startOfMonth(currentDate).toISOString();
      const timeMax = endOfMonth(currentDate).toISOString();
      
      const res = await fetch(`/api/google/calendar/events?userId=${profile.id}&timeMin=${timeMin}&timeMax=${timeMax}`);
      const data = await res.json();

      if (!res.ok) {
        // Handle specific "API not enabled" error from Google
        if (data.error?.includes('Google Calendar API has not been used') || data.error?.includes('disabled')) {
          setApiDisabled(true);
          return;
        }
        throw new Error(data.error || 'Failed to fetch events');
      }
      
      setEvents(data);
      setApiDisabled(false);
    } catch (error: any) {
      console.error('Calendar error:', error);
      // Don't toast on initial load if not connected, let the UI handle it
      if (error.message !== 'No Google connection found') {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentDate, profile?.id]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Filter out weekends for a 5-day work week
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })
    .filter(day => !isWeekend(day));
  
  const rowCount = Math.ceil(calendarDays.length / 5);

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = event.start.dateTime ? parseISO(event.start.dateTime) : (event.start.date ? parseISO(event.start.date) : null);
      return eventDate && isSameDay(eventDate, day);
    });
  };

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  const getLastFridayOfMonth = (date: Date) => {
    let lastDay = lastDayOfMonth(date);
    while (!isFriday(lastDay)) {
      lastDay = subDays(lastDay, 1);
    }
    return lastDay;
  };

  const payDay = getLastFridayOfMonth(currentDate);
  const cutOffDay = subDays(payDay, 14);

  const getEventStyles = (event: CalendarEvent) => {
    const summary = (event.summary || '').toLowerCase();
    const startTime = event.start.dateTime ? parseISO(event.start.dateTime) : null;
    
    // 1. Lead Tasks (Green)
    if (summary.includes('lead:') || summary.includes('callback:') || summary.includes('task:')) {
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-100/50',
        dot: 'bg-emerald-400',
        iconColor: 'text-emerald-500'
      };
    }
    
    // 2. Morning Meetings (Blue) 
    // - Explicitly labeled "morning" 
    // - OR scheduled before 12:00 PM in the user's local timezone
    if (summary.includes('morning') || (startTime && startTime.getHours() < 12)) {
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-100/50',
        dot: 'bg-blue-400',
        iconColor: 'text-blue-500'
      };
    }
    
    // 3. Other Events (Red)
    return {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-100/50',
      dot: 'bg-rose-400',
      iconColor: 'text-rose-500'
    };
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
      <div className="flex flex-1 min-h-0 relative">
        <AnimatePresence>
          {apiDisabled && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 text-center"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-sm bg-white p-6 rounded-[1.5rem] shadow-2xl border border-white/20"
              >
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3 hover:rotate-0 transition-transform duration-500">
                  <CalendarIcon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Activate Calendar</h3>
                <p className="text-slate-500 text-xs mb-6 font-medium leading-relaxed">
                  Enable the Google Calendar API to start syncing your appointments.
                </p>
                <a 
                  href={`https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=568102707400`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full px-5 py-3 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 active:scale-[0.98]"
                >
                  Enable Calendar API
                  <ExternalLink className="w-3.5 h-3.5 ml-2" />
                </a>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Calendar Grid */}
        <div className="flex-1 flex flex-col">
          {/* Days of week */}
          <div className="grid grid-cols-5 border-b border-slate-200 bg-white">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
              <div key={day} className="py-2 text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div 
            className="flex-1 grid grid-cols-5 bg-slate-200/50 gap-[1px]"
            style={{ gridTemplateRows: `repeat(${rowCount}, 1fr)` }}
          >
            {calendarDays.map((day, i) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isTodayDay = isSameDay(day, new Date());
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const isPayDay = isSameDay(day, payDay);
              const isCutOffDay = isSameDay(day, cutOffDay);

              return (
                <div 
                  key={i}
                  onClick={() => setSelectedDay(day)}
                  className={`relative p-2 transition-all cursor-pointer group flex flex-col h-full ${
                    !isCurrentMonth ? 'bg-slate-50/50 opacity-60' : 'bg-white hover:bg-slate-50'
                  } ${isSelected ? 'z-10 ring-2 ring-inset ring-blue-500/20 bg-blue-50/30' : ''} ${
                    isPayDay ? 'z-10 shadow-[0_0_25px_-5px_rgba(59,130,246,0.6)] ring-2 ring-blue-500/40 bg-blue-50/20' : ''
                  } ${
                    isCutOffDay ? 'ring-2 ring-emerald-500/30 bg-emerald-50/10' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`inline-flex items-center justify-center w-6 h-6 text-[10px] font-black rounded-lg transition-all ${
                      isTodayDay 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                        : isPayDay
                          ? 'bg-blue-100 text-blue-700'
                          : isCutOffDay
                            ? 'bg-emerald-100 text-emerald-700'
                            : isSelected
                              ? 'text-blue-600'
                              : 'text-slate-400 group-hover:text-slate-900'
                    }`}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex flex-col items-end gap-1">
                      {isPayDay && <Banknote className="w-3 h-3 text-blue-500 animate-pulse" />}
                      {isCutOffDay && <Scissors className="w-3 h-3 text-emerald-500" />}
                      {dayEvents.length > 0 && (
                      <div className="flex -space-x-1">
                        {dayEvents.slice(0, 3).map((event, idx) => {
                          const styles = getEventStyles(event);
                          return (
                            <div key={idx} className={`w-1 h-1 rounded-full ${styles.dot} ring-1 ring-white`} />
                          );
                        })}
                      </div>
                    )}
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((event, idx) => {
                      const styles = getEventStyles(event);
                      return (
                        <div 
                          key={idx}
                          className={`text-[9px] px-1.5 py-0.5 rounded-md ${styles.bg} ${styles.text} font-bold truncate border ${styles.border} shadow-sm`}
                        >
                          {event.summary}
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <div className="text-[8px] text-slate-400 font-black uppercase tracking-wider pl-1">
                        + {dayEvents.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side Panel: Selected Day Events */}
        <div className="w-80 flex flex-col bg-white border-l border-slate-200 shadow-2xl relative z-10">
          <div className="p-5 border-b border-slate-100 bg-white sticky top-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                {selectedDay ? format(selectedDay, 'EEEE') : 'Select day'}
              </h3>
              <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">
              {selectedDay ? format(selectedDay, 'MMM do, yyyy') : ''}
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/30">
            <AnimatePresence mode="wait">
              {selectedDayEvents.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center justify-center h-full text-center py-8"
                >
                  <div className="w-12 h-12 rounded-[1.5rem] bg-white shadow-lg flex items-center justify-center mb-4 text-slate-200">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-black text-slate-900 mb-0.5">Clear Schedule</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">No appointments</p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {selectedDayEvents.map((event, idx) => {
                    const startTime = event.start.dateTime ? format(parseISO(event.start.dateTime), 'HH:mm') : 'All day';
                    const endTime = event.end.dateTime ? format(parseISO(event.end.dateTime), 'HH:mm') : '';
                    const styles = getEventStyles(event);
                    
                    return (
                      <motion.div 
                        key={event.id || idx}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0, transition: { delay: idx * 0.1 } }}
                        className={`p-4 rounded-xl border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all group ${styles.bg} ${styles.border}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h4 className={`text-xs font-black transition-colors leading-tight ${styles.text}`}>
                            {event.summary}
                          </h4>
                          {event.htmlLink && (
                            <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white/50 rounded-lg text-slate-400 hover:text-blue-600 transition-all">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/50 rounded-lg border border-slate-100">
                            <Clock className={`w-3 h-3 ${styles.iconColor}`} />
                            <span className="text-[10px] font-bold text-slate-700">{startTime} {endTime && `→ ${endTime}`}</span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/50 rounded-lg border border-slate-100">
                              <MapPin className="w-3 h-3 text-rose-400" />
                              <span className="text-[10px] font-bold text-slate-700 truncate">{event.location}</span>
                            </div>
                          )}
                        </div>

                        {event.description && (
                          <div className="mt-3 pt-3 border-t border-slate-50">
                            <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic line-clamp-2">
                              "{event.description}"
                            </p>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Calendar Legend */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Calendar Legend</h4>
            <div className="flex items-center gap-3 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                <Banknote className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-900 leading-none">Payday</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Last Friday</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Scissors className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-900 leading-none">Cut-off</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">2 Weeks Prior</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border-t border-slate-100">
            <button className="w-full py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-blue-600 transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2">
              <Plus className="w-3.5 h-3.5" />
              New Appointment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
