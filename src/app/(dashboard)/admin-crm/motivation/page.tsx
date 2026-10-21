"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { addDays, isWeekend, format, parseISO } from 'date-fns';
import { Edit2, Check, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Quote {
  quote: string;
  author: string;
}

export default function MotivationPage() {
  const { profile } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quotesData, setQuotesData] = useState<Record<string, Quote>>({});
  const [workingDays, setWorkingDays] = useState<Date[]>([]);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editQuote, setEditQuote] = useState('');
  const [editAuthor, setEditAuthor] = useState('');

  useEffect(() => {
    if (profile?.email && profile.email.toLowerCase() !== 'jake@openlead.co.uk') {
      router.push('/admin-crm');
      return;
    }

    const generateDays = () => {
      const days: Date[] = [];
      let current = new Date();
      while (days.length < 23) { // Today + 22 working days
        if (!isWeekend(current)) {
          days.push(new Date(current));
        }
        current = addDays(current, 1);
      }
      setWorkingDays(days);
      return days;
    };

    const fetchQuotes = async (days: Date[]) => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'daily_quotes')
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        let parsed: Record<string, Quote> = {};
        if (data?.value) {
          parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        }
        setQuotesData(parsed);

        // Check for missing quotes
        let blankCount = 0;
        days.forEach(d => {
          const dStr = format(d, 'yyyy-MM-dd');
          if (!parsed[dStr] || !parsed[dStr].quote) {
            blankCount++;
          }
        });

        if (blankCount > 15 && profile?.id) {
          // Add to Google Tasks
          const taskReq = await fetch('/api/google/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: profile.id,
              title: `Action Required: Add Quotes of the Day (${blankCount} missing)`,
              notes: `You have ${blankCount} blank days in the next 23 working days for the Quote of the Day. Please update them in the Admin CRM -> Motivation tab.`
            })
          });
          
          if (taskReq.ok) {
            toast.success('Task added to Google Tasks for missing quotes');
          }
        }
      } catch (err: any) {
        console.error('Error fetching quotes:', err);
        toast.error('Failed to load quotes');
      } finally {
        setLoading(false);
      }
    };

    if (profile) {
      const days = generateDays();
      fetchQuotes(days);
    }
  }, [profile, router]);

  const handleSave = async (dateStr: string) => {
    try {
      const newData = {
        ...quotesData,
        [dateStr]: { quote: editQuote, author: editAuthor }
      };

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'daily_quotes',
          value: JSON.stringify(newData)
        }, { onConflict: 'key' });

      if (error) throw error;

      setQuotesData(newData);
      setEditingDate(null);
      toast.success('Quote saved');
    } catch (err: any) {
      console.error('Error saving quote:', err);
      toast.error('Failed to save quote');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Motivation Center</h1>
        <p className="text-sm text-gray-500">Manage Quote of the Day for the next 22 working days</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Quote</th>
              <th className="px-6 py-4">Author</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {workingDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const displayDate = format(day, 'EEE, MMM d, yyyy');
              const q = quotesData[dateStr];
              const isEditing = editingDate === dateStr;

              return (
                <tr key={dateStr} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                    {displayDate}
                    {format(new Date(), 'yyyy-MM-dd') === dateStr && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800">
                        Today
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <textarea
                        value={editQuote}
                        onChange={(e) => setEditQuote(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        rows={2}
                        placeholder="Enter quote..."
                      />
                    ) : (
                      <span className={q?.quote ? 'text-gray-900' : 'text-gray-400 italic'}>
                        {q?.quote || 'No quote set'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editAuthor}
                        onChange={(e) => setEditAuthor(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Author name..."
                      />
                    ) : (
                      <span className="text-gray-600">{q?.author || '-'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSave(dateStr)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingDate(null)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditQuote(q?.quote || '');
                          setEditAuthor(q?.author || '');
                          setEditingDate(dateStr);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
