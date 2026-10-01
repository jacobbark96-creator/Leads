import React, { useState, useEffect } from 'react';
import { PieChart, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export const LeadSourcesPanel = () => {
  const [sources, setSources] = useState<any[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);

  useEffect(() => {
    const fetchSources = async () => {
      // Fetch last 200 leads to get a better distribution
      const { data } = await supabase
        .from('leads')
        .select('lead_source')
        .order('created_at', { ascending: false })
        .limit(200);

      if (data) {
        setTotalLeads(data.length);
        const counts: Record<string, number> = {};
        data.forEach(lead => {
          let src = lead.lead_source;
          
          // Map source aliases to readable names
          if (!src) src = 'Unknown';
          else if (src.toLowerCase().includes('facebook') || src.toLowerCase().includes('fb')) src = 'Facebook Ads';
          else if (src.toLowerCase().includes('google') || src.toLowerCase().includes('ppc')) src = 'Google Ads';
          else if (src.toLowerCase().includes('web') || src.toLowerCase().includes('site')) src = 'Website';
          else if (src.toLowerCase().includes('cold')) src = 'Cold Calling';
          else if (src.toLowerCase().includes('refer')) src = 'Referrals';
          else if (src.toLowerCase().includes('instagram') || src.toLowerCase().includes('ig')) src = 'Instagram';
          else if (src.toLowerCase().includes('tiktok')) src = 'TikTok';
          else src = src.charAt(0).toUpperCase() + src.slice(1);
          
          counts[src] = (counts[src] || 0) + 1;
        });

        const formatted = Object.entries(counts)
          .map(([name, count]) => ({
            name,
            count,
            percentage: data.length > 0 ? Math.round((count / data.length) * 100) : 0
          }))
          .sort((a, b) => b.count - a.count);

        setSources(formatted.length > 0 ? formatted : [
          { name: 'Cold Calling', count: 0, percentage: 0 },
          { name: 'Website', count: 0, percentage: 0 },
          { name: 'Referrals', count: 0, percentage: 0 }
        ]);
      }
    };

    fetchSources();

    const channel = supabase.channel('lead-sources-panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchSources)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500', 'bg-gray-400'];

  return (
    <div className="bg-[#0a0f1c]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-4 h-full flex flex-col shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] overflow-hidden">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="text-[11px] font-semibold text-white tracking-wide flex items-center gap-2">
          <PieChart className="w-3.5 h-3.5 text-blue-400" />
          LEAD SOURCES
        </h2>
      </div>

      <div className="flex items-center gap-6 flex-1 min-h-0">
        {/* SVG Donut Chart */}
        <div className="relative w-20 h-20 shrink-0 ml-2">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="currentColor"
              strokeWidth="12"
              className="text-white/5"
            />
            {sources.map((source, i) => {
              const prevPercentage = sources.slice(0, i).reduce((acc, s) => acc + s.percentage, 0);
              const strokeDasharray = `${(source.percentage * 251.2) / 100} 251.2`;
              const strokeDashoffset = `-${(prevPercentage * 251.2) / 100}`;
              const colors = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ec4899', '#94a3b8'];
              
              return (
                <circle
                  key={i}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke={colors[i % colors.length]}
                  strokeWidth="12"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-out"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-white leading-none mb-0.5">{totalLeads}</span>
            <span className="text-[8px] text-gray-400 font-medium">Total</span>
          </div>
        </div>

        <div className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar pr-1">
          {sources.slice(0, 5).map((source, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`}></div>
                <span className="text-xs font-medium text-gray-300 truncate max-w-[100px]">{source.name}</span>
              </div>
              <span className="text-[10px] text-gray-400">{source.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between cursor-pointer group shrink-0">
        <Link href="/admin-crm" className="text-[10px] font-medium text-gray-400 group-hover:text-white transition-colors">
          View reports →
        </Link>
      </div>
    </div>
  );
};
