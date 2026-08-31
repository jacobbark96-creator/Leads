"use client";

import React, { useState, useEffect } from 'react';
import { 
  Target, TrendingUp, AlertCircle, Activity, 
  Filter, Calendar, ChevronDown, CheckCircle2, 
  XCircle, Clock, Zap, ArrowRight, BarChart2,
  Users, DollarSign, Award, ArrowUpRight, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

function LightLiveFeed() {
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
            if (act.leads?.lead_purchases && act.leads.lead_purchases.length > 0) {
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
            title = act.description?.split(' - ')[0] || act.description;
          }

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

    const channel = supabase
      .channel('activities_feed')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'activities' }, 
        payload => {
          if (['qualified', 'marketed', 'sold', 'requested'].includes(payload.new.activity_type)) {
            fetchActivities();
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
      case 'Qualified': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Marketed': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Sold': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'Requested': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'Contacted': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      case 'Surveyed': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Proposal': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Won': return 'text-green-600 bg-green-50 border-green-200';
      case 'Archive': return 'text-slate-600 bg-slate-50 border-slate-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="flex-1 space-y-3 p-3">
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-8">
          <Activity className="w-5 h-5 text-gray-300 mb-2" />
          <p className="text-xs text-gray-500 font-medium">No recent events</p>
        </div>
      ) : (
        events.map((e, i) => (
          <div key={i} className="flex gap-2.5 relative">
            {i !== events.length - 1 && (
              <div className="absolute top-6 left-[9px] bottom-[-12px] w-[2px] bg-gray-100"></div>
            )}
            <div className={`w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 z-10`}>
              <Activity className="w-2.5 h-2.5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-gray-900 font-medium">
                {e.lead_id ? (
                  <a href={`/sales-crm/lead-v2?id=${e.lead_id}&tab=pipeline`} className="font-bold hover:text-blue-600 transition-colors">
                    {e.title}
                  </a>
                ) : (
                  <span className="font-bold">{e.title}</span>
                )}
              </p>
              <div className="flex items-center mt-0.5 gap-2">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getStatusStyle(e.status)}`}>
                  {e.status}
                </span>
                <p className="text-[10px] text-gray-500 flex items-center">
                  <Clock className="w-2.5 h-2.5 mr-1" /> {e.time}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function CommandCentreDashboard() {
  const [dateFilter, setDateFilter] = useState('Today');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [realLeadsToday, setRealLeadsToday] = useState(0);
  const [realTarget, setRealTarget] = useState<number | null>(null);
  const [sdrData, setSdrData] = useState<any[]>([]);
  const [channelData, setChannelData] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [qualityData, setQualityData] = useState<any>({});
  const [alertsData, setAlertsData] = useState<any[]>([]);
  const [acquisitionBreakdown, setAcquisitionBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRealData() {
      const startOfDay = new Date();
      startOfDay.setHours(0,0,0,0);
      
      try {
        // Fetch Leads Today
        const { count: leadsCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfDay.toISOString());
          
        const leadsToday = leadsCount || 0;
        setRealLeadsToday(leadsToday);

        // Fetch Target
        const { data: targetData } = await supabase
          .from('daily_targets')
          .select('target')
          .eq('target_date', startOfDay.toISOString().split('T')[0])
          .single();
          
        const dailyTarget = targetData?.target || 40;
        setRealTarget(dailyTarget);

        // Fetch SDR Performance
        const { data: reps } = await supabase.from('users').select('id, name, email').eq('role', 'rep');
        const { data: activities } = await supabase.from('activities').select('user_id, activity_type').gte('created_at', startOfDay.toISOString());
        
        let sdrStats: any[] = [];
        let totalCalls = 0;
        let totalQualified = 0;
        let totalMarketed = 0;
        let totalSold = 0;

        if (activities) {
          totalCalls = activities.filter(a => a.activity_type === 'call_made').length;
          totalQualified = activities.filter(a => a.activity_type === 'qualified').length;
          totalMarketed = activities.filter(a => a.activity_type === 'marketed').length;
          totalSold = activities.filter(a => a.activity_type === 'sold').length;
        }

        if (reps && activities) {
          sdrStats = reps.map(rep => {
            const repActs = activities.filter(a => a.user_id === rep.id);
            const calls = repActs.filter(a => a.activity_type === 'call_made').length;
            const qualified = repActs.filter(a => a.activity_type === 'qualified').length;
            const leads = qualified;
            const repTarget = 4;
            
            let status = 'Needs attention';
            if (leads >= repTarget) status = 'Excellent';
            else if (leads >= repTarget * 0.75) status = 'On track';
            else if (leads >= repTarget * 0.5) status = 'Behind';

            return {
              name: rep.name.split(' ')[0],
              leads, target: repTarget, calls,
              conversations: Math.floor(calls * 0.15),
              qualified,
              conversion: calls > 0 ? ((leads / calls) * 100).toFixed(1) + '%' : '0%',
              status
            };
          }).sort((a, b) => b.leads - a.leads).slice(0, 4);
          setSdrData(sdrStats);
        }

        // Fetch Channels
        const { data: leads } = await supabase.from('leads').select('lead_source, status, created_at').gte('created_at', startOfDay.toISOString());
        let formattedChannels: any[] = [];
        if (leads) {
          const sourcesMap: Record<string, number> = {};
          leads.forEach(l => {
            const s = l.lead_source || 'Other';
            sourcesMap[s] = (sourcesMap[s] || 0) + 1;
          });
          formattedChannels = Object.entries(sourcesMap).map(([channel, count]) => ({
            channel, leads: count, target: 10, conversion: '5.0%', cost: '£0', cpl: '£0', quality: '90%', trend: 'up'
          })).sort((a, b) => b.leads - a.leads);
          setChannelData(formattedChannels.length > 0 ? formattedChannels : [
            { channel: 'Outbound SDRs', leads: leadsToday, target: 10, conversion: '0%', cost: '£0', cpl: '£0', quality: '0%', trend: 'up' }
          ]);
        }

        // Generate Forecast (last 7 days of leads)
        const last7Days = Array.from({length: 7}, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().split('T')[0];
        });
        const { data: weekLeads } = await supabase
          .from('leads')
          .select('created_at')
          .gte('created_at', last7Days[0]);

        const forecast = last7Days.map(dateStr => {
          const dayDate = new Date(dateStr);
          const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
          const count = (weekLeads || []).filter(l => l.created_at.startsWith(dateStr)).length;
          return { day: dayName, leads: count, target: dailyTarget };
        });
        setForecastData(forecast);

        // Generate Funnel
        setFunnelData([
          { stage: 'Calls', value: totalCalls.toString(), rate: null },
          { stage: 'Qualified', value: totalQualified.toString(), rate: totalCalls ? `${((totalQualified/totalCalls)*100).toFixed(1)}% qual` : '0%' },
          { stage: 'Marketed', value: totalMarketed.toString(), rate: totalQualified ? `${((totalMarketed/totalQualified)*100).toFixed(1)}% opp` : '0%' },
          { stage: 'Sold', value: totalSold.toString(), rate: totalMarketed ? `${((totalSold/totalMarketed)*100).toFixed(1)}% win` : '0%' },
        ]);

        // Quality Metrics
        const acceptedCount = (leads || []).filter(l => l.status === 'Accepted' || l.status === 'Sold').length;
        const rejectedCount = (leads || []).filter(l => l.status === 'Rejected').length;
        
        setQualityData({
          avgScore: 'N/A', 
          qualified: leadsToday ? `${((totalQualified/leadsToday)*100).toFixed(1)}%` : '0%',
          duplicate: '0%', 
          rejected: leadsToday ? `${((rejectedCount/leadsToday)*100).toFixed(1)}%` : '0%',
          accepted: leadsToday ? `${((acceptedCount/leadsToday)*100).toFixed(1)}%` : '0%',
          avgValue: '£0',
        });

        // Acquisition Breakdown
        const breakdown = formattedChannels.length > 0 ? formattedChannels.map((c, i) => {
          const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500'];
          return {
            name: c.channel,
            leads: c.leads,
            color: colors[i % colors.length]
          };
        }) : [{ name: 'None', leads: 0, color: 'bg-gray-300' }];
        setAcquisitionBreakdown(breakdown);

        // Alerts
        const newAlerts = [];
        if (leadsToday < dailyTarget * 0.5) {
          newAlerts.push({ message: 'Lead production is behind target today.', type: 'danger', action: 'Investigate' });
        }
        const underperformingSDRs = sdrStats.filter(s => s.status === 'Behind');
        underperformingSDRs.forEach(s => {
          newAlerts.push({ message: `${s.name} is behind their target.`, type: 'warning', action: 'View rep' });
        });
        if (newAlerts.length === 0) {
          newAlerts.push({ message: 'All systems operational. Targets on track.', type: 'success', action: 'View details' });
        }
        setAlertsData(newAlerts);

      } catch (e) {
        console.error("Error fetching dashboard data", e);
      } finally {
        setLoading(false);
      }
    }
    fetchRealData();
  }, []);

  const target = realTarget || 40;
  const generated = realLeadsToday;
  const projected = Math.round(generated * 1.5); 
  const remaining = Math.max(0, target - generated);
  
  const heroData = {
    target,
    generated,
    projected,
    remaining,
    status: projected >= target ? 'On track' : 'Behind target',
  };
  
  const progressPercentage = (heroData.generated / heroData.target) * 100;
  const projectedPercentage = (heroData.projected / heroData.target) * 100;

  return (
    <div className="space-y-3 pb-10 w-full animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      
      {/* Header & Global Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
        <div>
          <h1 className="text-base font-black text-gray-900 tracking-tight uppercase">Lead Production Command Centre</h1>
          <p className="text-xs text-gray-500 font-medium">Real-time operations & acquisition tracking</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors">
            <Filter className="w-3.5 h-3.5" />
            Filters
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowDateFilter(!showDateFilter)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              {dateFilter}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            
            {showDateFilter && (
              <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50">
                {['Today', 'Yesterday', 'Last 7 days', 'Last 30 days'].map(option => (
                  <button 
                    key={option}
                    onClick={() => { setDateFilter(option); setShowDateFilter(false); }}
                    className={`block w-full text-left px-3 py-1.5 text-xs font-medium ${dateFilter === option ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 1. HERO SECTION */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
        <div className="p-3 sm:p-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
            <div>
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Today's Lead Production</h2>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-gray-900 tracking-tighter">{heroData.generated}</span>
                <span className="text-xs font-bold text-gray-500">/ {heroData.target} target</span>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2 md:gap-3 w-full md:w-auto">
              <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 min-w-[80px]">
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Target</p>
                <p className="text-lg font-black text-gray-900 leading-none">{heroData.target}</p>
              </div>
              <div className="bg-blue-50 p-2 rounded-lg border border-blue-100 min-w-[80px]">
                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Generated</p>
                <p className="text-lg font-black text-blue-900 leading-none">{heroData.generated}</p>
              </div>
              <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 min-w-[80px]">
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Remaining</p>
                <p className="text-lg font-black text-gray-900 leading-none">{heroData.remaining}</p>
              </div>
              <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100 min-w-[80px]">
                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Projected</p>
                <p className="text-lg font-black text-emerald-900 leading-none">{heroData.projected}</p>
              </div>
            </div>
          </div>

          <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div 
              className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-1000 ease-out z-10 rounded-full"
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            ></div>
            <div 
              className="absolute top-0 h-full border-r-2 border-dashed border-gray-400 z-20"
              style={{ left: `${Math.min(projectedPercentage, 100)}%` }}
            ></div>
            <div 
              className="absolute top-0 h-full bg-blue-200 opacity-50 transition-all duration-1000 z-0"
              style={{ width: `${Math.min(projectedPercentage, 100)}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${heroData.status === 'On track' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {heroData.status === 'On track' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                {heroData.status}
              </span>
              <span className="text-[10px] text-gray-500 font-medium">Based on current pace</span>
            </div>
            <span className="text-[10px] font-bold text-gray-500">Projected: {heroData.projected}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* 4. 7-DAY FORECAST */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-black text-gray-900 uppercase">7-Day Lead Forecast</h3>
              <div className="flex gap-3 text-[10px]">
                <div className="flex flex-col items-end">
                  <span className="font-bold text-gray-500 uppercase">Weekly Target</span>
                  <span className="font-black text-gray-900">{heroData.target * 7}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-bold text-gray-500 uppercase">Projected</span>
                  <span className="font-black text-blue-600">{heroData.projected * 7}</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-end gap-1.5 h-24">
              {forecastData.map((day, idx) => {
                const maxVal = Math.max(...forecastData.map(d => Math.max(d.leads, d.target)), 1);
                const heightPct = (day.leads / maxVal) * 100;
                const targetHeightPct = (day.target / maxVal) * 100;
                const isToday = idx === 6; 
                
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end group">
                    <div className="w-full relative flex justify-center h-20 items-end">
                      <div 
                        className="absolute w-full border-t border-dashed border-gray-300 z-0"
                        style={{ bottom: `${targetHeightPct}%` }}
                      ></div>
                      <div 
                        className={`w-4 sm:w-6 rounded-t-sm transition-all z-10 ${isToday ? 'bg-blue-600' : 'bg-blue-200'}`}
                        style={{ height: `${heightPct}%` }}
                      >
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-5 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap transition-opacity">
                          {day.leads}
                        </div>
                      </div>
                    </div>
                    <span className={`mt-1.5 text-[9px] font-bold uppercase ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>{day.day}</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Tracking active</span>
              <Link href="/staff/forecast" className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center">
                View forecast <ChevronRight className="w-3 h-3 ml-0.5" />
              </Link>
            </div>
          </div>

          {/* 3. CHANNEL PERFORMANCE */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xs font-black text-gray-900 uppercase">Channel Performance</h3>
              <Link href="/staff/sources" className="text-[9px] font-bold text-blue-600 hover:text-blue-800 flex items-center">
                Manage Sources <ChevronRight className="w-3 h-3 ml-0.5" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white text-[9px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-3 py-2">Channel</th>
                    <th className="px-3 py-2">Leads</th>
                    <th className="px-3 py-2">Target</th>
                    <th className="px-3 py-2">Conv.</th>
                    <th className="px-3 py-2">Cost/Lead</th>
                    <th className="px-3 py-2">Quality</th>
                    <th className="px-3 py-2 text-center">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {channelData.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors text-[10px]">
                      <td className="px-3 py-2 font-bold text-gray-900">{row.channel}</td>
                      <td className="px-3 py-2 font-black text-blue-600">{row.leads}</td>
                      <td className="px-3 py-2 font-medium text-gray-500">{row.target}</td>
                      <td className="px-3 py-2 font-medium text-gray-700">{row.conversion}</td>
                      <td className="px-3 py-2 font-medium text-gray-700">{row.cpl}</td>
                      <td className="px-3 py-2 font-bold text-gray-900">{row.quality}</td>
                      <td className="px-3 py-2 text-center">
                        {row.trend === 'up' ? <ArrowUpRight className="w-3 h-3 text-green-500 mx-auto" /> : <ArrowRight className="w-3 h-3 text-gray-400 mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6. SDR PERFORMANCE */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xs font-black text-gray-900 uppercase">SDR Production</h3>
              <Link href="/staff/sdr-performance" className="text-[9px] font-bold text-blue-600 hover:text-blue-800 flex items-center">
                View All Reps <ChevronRight className="w-3 h-3 ml-0.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
              {sdrData.length === 0 ? (
                <div className="col-span-full p-4 text-center text-xs text-gray-500">No SDR data for today</div>
              ) : (
                sdrData.map((sdr, i) => (
                  <div key={i} className="p-3 hover:bg-gray-50 transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="font-bold text-gray-900 text-[11px] truncate pr-1">{sdr.name}</span>
                      <span className={`text-[8px] font-bold uppercase px-1 py-0.5 rounded whitespace-nowrap ${
                        sdr.status === 'Excellent' ? 'bg-green-100 text-green-800' :
                        sdr.status === 'Behind' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>{sdr.status}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mb-2">
                      <span className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition-colors leading-none">{sdr.leads}</span>
                      <span className="text-[9px] font-bold text-gray-500 uppercase">/ {sdr.target} leads</span>
                    </div>
                    <div className="space-y-1 text-[10px]">
                      <div className="flex justify-between text-gray-600"><span className="font-medium">Calls</span><span className="font-bold text-gray-900">{sdr.calls}</span></div>
                      <div className="flex justify-between text-gray-600"><span className="font-medium">Conversations</span><span className="font-bold text-gray-900">{sdr.conversations}</span></div>
                      <div className="flex justify-between text-gray-600"><span className="font-medium">Qualified</span><span className="font-bold text-gray-900">{sdr.qualified}</span></div>
                      <div className="flex justify-between text-gray-600 pt-1 border-t border-gray-100"><span className="font-bold">Conversion</span><span className="font-bold text-blue-600">{sdr.conversion}</span></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          
          {/* 13. ALERTS & ACTIONS */}
          <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-200 p-3">
            <h3 className="text-xs font-black text-gray-900 uppercase flex items-center gap-1.5 mb-2">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Action Required
            </h3>
            <div className="space-y-2">
              {alertsData.map((alert, i) => (
                <div key={i} className={`bg-white p-2.5 rounded-lg border shadow-sm flex flex-col gap-2 ${alert.type === 'danger' ? 'border-red-100' : alert.type === 'warning' ? 'border-amber-100' : 'border-green-100'}`}>
                  <p className="text-[11px] font-medium text-gray-900 leading-tight">{alert.message}</p>
                  <button className={`self-start text-[9px] font-bold px-2 py-1 rounded transition-colors uppercase tracking-wide ${
                    alert.type === 'danger' ? 'text-red-600 bg-red-50 hover:bg-red-100' : 
                    alert.type === 'warning' ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' :
                    'text-green-600 bg-green-50 hover:bg-green-100'
                  }`}>
                    {alert.action}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 2. ACQUISITION CHANNEL BREAKDOWN */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <h3 className="text-xs font-black text-gray-900 uppercase mb-3">Lead Acquisition</h3>
            <div className="space-y-2.5">
              {acquisitionBreakdown.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-20 text-[10px] font-bold text-gray-700 truncate">{item.name}</div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${heroData.generated ? (item.leads / heroData.generated) * 100 : 0}%` }}></div>
                  </div>
                  <div className="w-6 text-right font-black text-gray-900 text-[11px]">{item.leads}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-2.5 border-t border-gray-100 flex justify-between items-center">
              <span className="text-[9px] font-bold text-gray-500 uppercase">Total Generated</span>
              <span className="text-sm font-black text-gray-900">{heroData.generated}</span>
            </div>
          </div>

          {/* 7. PRODUCTION FUNNEL */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-3 border-b border-gray-200 bg-gray-50/50">
              <h3 className="text-xs font-black text-gray-900 uppercase">Production Funnel</h3>
            </div>
            <div className="p-3 flex justify-between items-center">
              {funnelData.map((stage, i) => (
                <React.Fragment key={i}>
                  <div className="text-center">
                    <div className="text-sm font-black text-gray-900">{stage.value}</div>
                    <div className="text-[9px] font-bold text-gray-500 uppercase mt-0.5">{stage.stage}</div>
                    {i > 0 && <div className="text-[8px] font-bold text-blue-600 mt-0.5">{stage.rate}</div>}
                  </div>
                  {i < funnelData.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-gray-300 mx-1" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* 8. LEAD QUALITY */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-black text-gray-900 uppercase">Lead Quality</h3>
              <span className="flex items-center text-[9px] font-bold text-green-600 uppercase bg-green-50 px-1.5 py-0.5 rounded">
                Live <Activity className="w-2.5 h-2.5 ml-1" />
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Avg Score</p>
                <p className="text-sm font-black text-gray-900">{qualityData.avgScore}</p>
              </div>
              <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Qualified Rate</p>
                <p className="text-sm font-black text-gray-900">{qualityData.qualified}</p>
              </div>
              <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Accepted</p>
                <p className="text-sm font-black text-gray-900">{qualityData.accepted}</p>
              </div>
              <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Rejected Rate</p>
                <p className="text-sm font-black text-red-600">{qualityData.rejected}</p>
              </div>
            </div>
          </div>

          {/* 5. LIVE PRODUCTION ACTIVITY */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col" style={{ height: '320px' }}>
            <div className="p-3 border-b border-gray-200 bg-gray-50/50 flex-shrink-0">
              <h3 className="text-xs font-black text-gray-900 uppercase flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-600" /> Live Feed
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
              <div className="absolute inset-0">
                <LightLiveFeed />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
