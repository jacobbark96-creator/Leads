import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/dashboard/GlassCard';
import { Store, ArrowUpDown, MapPin, PoundSterling, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/types';
import { useRouter } from 'next/navigation';

export const MarketplaceLeadsList = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'created_at' | 'price' | 'postcode'>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .in('status', ['marketplace', 'qualified', 'awaiting_sales']);

        if (data) {
          // Filter to just those that are available on marketplace (is_marketed true or status marketplace)
          const marketplaceLeads = data.filter(l => l.status === 'marketplace' || l.is_marketed);
          setLeads(marketplaceLeads);
        }
      } catch (err) {
        console.error('Error fetching marketplace leads:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  const handleSort = (field: 'created_at' | 'price' | 'postcode') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedLeads = [...leads].sort((a, b) => {
    let valA, valB;
    if (sortField === 'price') {
      valA = a.exclusive_price || a.price || 0;
      valB = b.exclusive_price || b.price || 0;
    } else if (sortField === 'postcode') {
      valA = a.postcode || '';
      valB = b.postcode || '';
    } else {
      valA = new Date(a.created_at || 0).getTime();
      valB = new Date(b.created_at || 0).getTime();
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  return (
    <GlassCard className="p-0 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white tracking-wide">Marketplace Leads</h2>
        </div>
        <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-2 py-1 rounded-full">
          {leads.length} Available
        </span>
      </div>

      <div className="flex bg-black/20 p-2 text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0 border-b border-white/5">
        <div className="flex-1 cursor-pointer flex items-center hover:text-white transition-colors" onClick={() => handleSort('postcode')}>
          Location {sortField === 'postcode' && <ArrowUpDown className="w-3 h-3 ml-1" />}
        </div>
        <div className="w-24 cursor-pointer flex items-center justify-end hover:text-white transition-colors" onClick={() => handleSort('price')}>
          Price {sortField === 'price' && <ArrowUpDown className="w-3 h-3 ml-1" />}
        </div>
        <div className="w-24 cursor-pointer flex items-center justify-end hover:text-white transition-colors" onClick={() => handleSort('created_at')}>
          Listed {sortField === 'created_at' && <ArrowUpDown className="w-3 h-3 ml-1" />}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400"></div>
          </div>
        ) : sortedLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Store className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">No leads currently on marketplace</p>
          </div>
        ) : (
          sortedLeads.map((lead) => (
            <div 
              key={lead.id}
              onClick={() => router.push(`/sales-crm/lead-v2?id=${lead.id}`)}
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-3 cursor-pointer transition-all duration-200 group"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1.5 text-white font-bold">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  {lead.postcode || 'Unknown'}
                </div>
                <div className="flex items-center gap-1 text-emerald-400 font-bold">
                  <PoundSterling className="w-3.5 h-3.5" />
                  {lead.exclusive_price || lead.price || '135'}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="truncate pr-2">{lead.company || lead.name || 'Unknown'}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  {new Date(lead.created_at || '').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );
};
