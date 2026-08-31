'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  startOfWeek, 
  endOfWeek,
  parseISO
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function SurveysPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuthStore();

  useEffect(() => {
    if (profile?.id) {
      fetchSurveys();
    }
  }, [profile?.id, currentDate]);

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(monthStart);
      const gridStart = startOfWeek(monthStart, { weekStarts: 1 });
      const gridEnd = endOfWeek(monthEnd, { weekStarts: 1 });

      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', profile?.id)
        .single();

      if (!clientData) return;

      const { data, error } = await supabase
        .from('lead_purchases')
        .select(`
          id,
          status,
          metadata,
          lead:leads (
            company,
            name,
            location
          )
        `)
        .eq('client_id', clientData.id)
        .eq('status', 'sat');

      if (error) throw error;
      
      const parsedSurveys = (data || []).map(p => {
        const surveyDate = p.metadata?.sat?.date;
        return {
          ...p,
          survey_date: surveyDate
        };
      }).filter(s => {
        if (!s.survey_date) return false;
        const d = parseISO(s.survey_date);
        return d >= gridStart && d <= gridEnd;
      });

      setSurveys(parsedSurveys);
    } catch (err) {
      console.error('Error fetching surveys:', err);
    } finally {
      setLoading(false);
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStarts: 1 });
  const endDate = endOfWeek(monthEnd, { weekStarts: 1 });

  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        
        <div className="flex items-center gap-4 bg-white px-2 py-1 rounded-xl shadow-sm border border-gray-200">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-sm font-bold text-gray-900 w-32 text-center">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-white">
          {weekDays.map(day => (
            <div key={day} className="py-3 text-center text-[10px] font-black text-gray-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        
        <div className="flex-1 grid grid-cols-7 grid-rows-5 bg-gray-100 gap-[1px]">
          {days.map((day, i) => {
            const daySurveys = surveys.filter(s => s.survey_date && isSameDay(parseISO(s.survey_date), day));
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());

            return (
              <div 
                key={day.toString()} 
                className={`bg-white p-2 flex flex-col ${!isCurrentMonth ? 'bg-gray-50/50' : ''} ${isToday ? 'bg-blue-50/10' : ''}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-blue-600 text-white shadow-sm' : 
                    !isCurrentMonth ? 'text-gray-400' : 'text-gray-700'
                  }`}>
                    {format(day, dateFormat)}
                  </span>
                  {daySurveys.length > 0 && (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-md">
                      {daySurveys.length}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                  {daySurveys.map((survey, i) => (
                    <div key={i} className="bg-blue-50 border border-blue-100 rounded-lg p-1.5 shadow-sm hover:shadow transition-all cursor-pointer">
                      <div className="font-bold text-[10px] text-blue-900 truncate leading-tight">
                        {survey.lead?.company || survey.lead?.name}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[9px] text-blue-700 font-medium truncate">
                        <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                        <span className="truncate">{survey.lead?.location || 'No location'}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-[9px] text-blue-700 font-medium">
                        <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                        <span>{survey.metadata?.sat?.method || 'Survey'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
