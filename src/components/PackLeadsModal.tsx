import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Search, X, CheckSquare, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import { formatDistanceToNow } from 'date-fns';

interface PackLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pack: any;
}

export function PackLeadsModal({ isOpen, onClose, pack }: PackLeadsModalProps) {
  const router = useRouter();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && pack) {
      fetchLeads();
    }
  }, [isOpen, pack]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lead_pack_memberships')
        .select('lead_id, disposition, leads (id, company, name, location, phone, lead_notes (content, created_at))')
        .eq('lead_pack_id', pack.id);

      if (error) throw error;
      
      const mappedLeads = data?.map((m: any) => {
        if (!m.leads) return null;
        
        const notes = Array.isArray(m.leads.lead_notes) ? m.leads.lead_notes : [];
        const sortedNotes = [...notes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const lastInteraction = sortedNotes.length > 0 ? sortedNotes[0].created_at : null;
        
        return {
          ...m.leads,
          disposition: m.disposition,
          lastInteraction
        };
      }).filter(Boolean) || [];
      setLeads(mappedLeads);
    } catch (err: any) {
      toast.error('Failed to load leads: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(l => 
    (l.company?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (l.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (l.location?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (l.phone?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (l.disposition?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeadIds(new Set(filteredLeads.map(l => l.id)));
    } else {
      setSelectedLeadIds(new Set());
    }
  };

  const handleSelectLead = (id: string) => {
    const newSet = new Set(selectedLeadIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedLeadIds(newSet);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="text-xl">{pack.icon || '📦'}</span>
              {pack.name} Leads
            </h3>
            <p className="text-xs text-gray-500 mt-1">{leads.length} total leads in this pack</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            {selectedLeadIds.size > 0 && (
              <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
                {selectedLeadIds.size} selected
              </span>
            )}
            {/* Action buttons for selected leads could go here in the future */}
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto bg-gray-50 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
              <CheckSquare className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm font-medium">No leads found.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-white sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-2 border-b border-gray-200 w-12 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 w-64">
                    Lead Name
                  </th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 w-32">
                    Contact Name
                  </th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 w-32">
                    Contact Number
                  </th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 w-32">
                    Disposition
                  </th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 w-48">
                    Last Interaction
                  </th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 w-96">
                    Address
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="px-4 py-1.5 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedLeadIds.has(lead.id)}
                        onChange={() => handleSelectLead(lead.id)}
                      />
                    </td>
                    <td className="px-4 py-1.5 text-xs font-bold truncate max-w-[250px]" title={lead.company || lead.name}>
                      <button
                        onClick={() => router.push(`/sales-crm/lead-v2/${lead.id}`)}
                        className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 w-full text-left"
                      >
                        <span className="truncate">{lead.company || lead.name || '-'}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </td>
                    <td className="px-4 py-1.5 text-xs font-medium text-gray-600 truncate max-w-[120px]" title={lead.name}>
                      {lead.name || '-'}
                    </td>
                    <td className="px-4 py-1.5 text-xs font-medium text-gray-600 truncate max-w-[120px]" title={lead.phone}>
                      {lead.phone || '-'}
                    </td>
                    <td className="px-4 py-1.5 text-xs font-medium text-gray-600 truncate max-w-[120px]" title={lead.disposition}>
                      {lead.disposition ? (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          lead.disposition.toLowerCase() === 'uncalled' ? 'bg-gray-100 text-gray-600' :
                          lead.disposition.toLowerCase() === 'contacted' ? 'bg-purple-100 text-purple-700' :
                          lead.disposition.toLowerCase() === 'voicemail' ? 'bg-blue-100 text-blue-700' :
                          lead.disposition.toLowerCase() === 'not viable' ? 'bg-red-100 text-red-700' :
                          lead.disposition.toLowerCase() === 'call back' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {lead.disposition}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-1.5 text-xs text-gray-500 truncate max-w-[150px]" title={lead.lastInteraction ? new Date(lead.lastInteraction).toLocaleString() : ''}>
                      {lead.lastInteraction ? `${formatDistanceToNow(new Date(lead.lastInteraction))} ago` : '-'}
                    </td>
                    <td className="px-4 py-1.5 text-xs text-gray-500 truncate max-w-[350px]" title={lead.location}>
                      {lead.location || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
