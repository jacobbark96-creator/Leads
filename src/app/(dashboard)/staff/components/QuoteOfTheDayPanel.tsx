"use client";
import React, { useEffect, useState } from 'react';
import { Quote } from 'lucide-react';
import { format } from 'date-fns';

export const QuoteOfTheDayPanel = () => {
  const [quote, setQuote] = useState<{ quote: string; author: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const res = await fetch('/api/quotes');
        const data = await res.json();
        if (data?.quotes) {
          const today = format(new Date(), 'yyyy-MM-dd');
          if (data.quotes[today] && data.quotes[today].quote) {
            setQuote(data.quotes[today]);
          }
        }
      } catch (err) {
        console.error('Error fetching quote of the day', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuote();
  }, []);

  return (
    <div className="h-full bg-white/5 border border-white/10 rounded-2xl flex flex-col p-4 relative overflow-hidden backdrop-blur-md shadow-xl">
      <div className="absolute -top-10 -right-10 text-white/5 pointer-events-none">
        <Quote className="w-40 h-40" />
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Quote className="w-3 h-3 text-white" />
        </div>
        <h3 className="text-sm font-bold text-white tracking-wide">Quote of the Day</h3>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center text-center z-10 px-2">
        {loading ? (
          <div className="animate-pulse w-3/4 h-4 bg-white/10 rounded"></div>
        ) : quote ? (
          <>
            <p className="text-sm md:text-base lg:text-lg font-medium text-gray-200 italic mb-3 leading-relaxed">
              "{quote.quote}"
            </p>
            <p className="text-[10px] md:text-xs font-bold text-purple-400 uppercase tracking-widest">
              — {quote.author || 'Unknown'}
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-500 italic">No quote set for today.</p>
        )}
      </div>
    </div>
  );
};
