"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { PoundSterling, Calculator, Briefcase, TrendingUp, Info, CheckCircle2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { startOfMonth, endOfMonth } from 'date-fns';

interface CommissionSetting {
  id: string;
  job_title: string;
  action: string;
  commission_amount: number;
}

interface LeadBreakdown {
  id: string;
  name: string;
  company: string;
  price_paid: number;
  purchased_at: string;
  is_rebooking: boolean;
}

export default function CommissionCalculator() {
  const { profile } = useAuthStore();
  const [settings, setSettings] = useState<CommissionSetting[]>([]);
  const [managementTitles, setManagementTitles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [achievedQuantities, setAchievedQuantities] = useState<Record<string, number>>({});
  const [achievedLeads, setAchievedLeads] = useState<Record<string, LeadBreakdown[]>>({});
  const [breakdownModal, setBreakdownModal] = useState<{ isOpen: boolean; title: string; leads: LeadBreakdown[] }>({
      isOpen: false,
      title: '',
      leads: []
    });
  
    const isJakeBedwell = profile?.name === 'Jake Bedwell' || profile?.email === 'Jake@openlead.co.uk';
  
    useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedJobTitle && settings.length > 0) {
      fetchAchievedData();
    }
  }, [selectedJobTitle, settings]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsRes, titlesRes] = await Promise.all([
        supabase.from('commission_settings').select('*').order('job_title'),
        supabase.from('management_job_titles').select('job_title')
      ]);

      if (settingsRes.error) throw settingsRes.error;
      if (titlesRes.error) throw titlesRes.error;

      setSettings(settingsRes.data || []);
      const allTitles = titlesRes.data?.map(t => t.job_title) || [];
      
      const userJobTitle = profile?.job_title;
      const matchingTitle = allTitles.find(t => t.toLowerCase() === userJobTitle?.toLowerCase());

      if (matchingTitle) {
        setManagementTitles([matchingTitle]);
        setSelectedJobTitle(matchingTitle);
      } else {
        setManagementTitles(allTitles);
        if (allTitles.length > 0) {
          setSelectedJobTitle(allTitles[0]);
        }
      }
    } catch (error: any) {
      toast.error('Failed to load commission data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAchievedData = async () => {
    try {
      const start = startOfMonth(new Date()).toISOString();
      const end = endOfMonth(new Date()).toISOString();

      const { data: purchases, error } = await supabase
        .from('lead_purchases')
        .select(`
          price_paid,
          purchased_at,
          lead_id,
          leads!inner (
            id,
            name,
            company,
            assigned_to,
            is_rebooking,
            users:assigned_to (
              id,
              role
            )
          )
        `)
        .gte('purchased_at', start)
        .lte('purchased_at', end);

      if (error) throw error;

      const counts: Record<string, number> = {};
      const leadsMap: Record<string, LeadBreakdown[]> = {};
      const currentJobSettings = settings.filter(s => s.job_title === selectedJobTitle);

      purchases?.forEach((p: any) => {
        const leadData = p.leads;
        const assignedUser = leadData?.users;
        const price = p.price_paid;
        
        const priceTier = price < 285 ? '285' : '345';
        
        let isEligible = false;
        let actionType = '';

        if (assignedUser?.id === profile?.id) {
          isEligible = true;
          actionType = 'Self Generated';
        }
        
        const isManager = ['Sales Manager', 'Lead Generation Manager', 'HR Manager', 'Marketing Manager', 'Office Manager'].includes(selectedJobTitle);
        if (isManager && assignedUser && !['admin', 'super_admin'].includes(assignedUser.role) && assignedUser.id !== profile?.id) {
          isEligible = true;
          actionType = 'team';
        }

        if (isEligible) {
          const matchingSetting = currentJobSettings.find(s => 
            s.action.toLowerCase().includes(actionType.toLowerCase()) && 
            s.action.includes(priceTier)
          );

          if (matchingSetting) {
            counts[matchingSetting.id] = (counts[matchingSetting.id] || 0) + 1;
            
            if (!leadsMap[matchingSetting.id]) leadsMap[matchingSetting.id] = [];
            leadsMap[matchingSetting.id].push({
              id: leadData.id,
              name: leadData.name || 'Unnamed Lead',
              company: leadData.company || 'N/A',
              price_paid: price,
              purchased_at: p.purchased_at,
              is_rebooking: leadData.is_rebooking || false
            });
          }
        }
      });

      setAchievedQuantities(counts);
      setAchievedLeads(leadsMap);
    } catch (error: any) {
      console.error('Error fetching achieved data:', error);
    }
  };

  const handleToggleRebooking = async (leadId: string, currentVal: boolean) => {
    if (!isJakeBedwell) return;
    try {
      const { error } = await supabase.from('leads').update({ is_rebooking: !currentVal }).eq('id', leadId);
      if (error) throw error;
      toast.success(`Lead marked as ${!currentVal ? 'Rebooking' : 'Normal'}`);
      fetchAchievedData();
      
      // Update modal state if open
      setBreakdownModal(prev => ({
        ...prev,
        leads: prev.leads.map(l => l.id === leadId ? { ...l, is_rebooking: !currentVal } : l)
      }));
    } catch (error: any) {
      toast.error('Failed to update lead');
    }
  };

  const handleQuantityChange = (actionId: string, value: string) => {
    const num = parseInt(value) || 0;
    setQuantities({ ...quantities, [actionId]: num });
  };

  const filteredSettings = settings.filter(s => s.job_title === selectedJobTitle);
  
  const targetedTotal = filteredSettings.reduce((sum, setting) => {
    const qty = quantities[setting.id] || 0;
    return sum + (qty * setting.commission_amount);
  }, 0);

  const totalCommission = filteredSettings.reduce((sum, setting) => {
    const leads = achievedLeads[setting.id] || [];
    const manualQty = quantities[setting.id] || 0;
    
    // If we have tracked leads, use them with the rebooking logic
    if (leads.length > 0) {
      const commissionForLeads = leads.reduce((acc, lead) => {
        return acc + (lead.is_rebooking ? 50 : setting.commission_amount);
      }, 0);
      return sum + commissionForLeads;
    }
    
    // Fallback to manual qty if no leads tracked yet
    return sum + (manualQty * setting.commission_amount);
  }, 0);

  if (loading) return <div className="py-12 text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div></div>;

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Breakdown Modal */}
      {breakdownModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Info className="w-5 h-5 text-emerald-600" />
                {breakdownModal.title} Breakdown
              </h3>
              <button 
                onClick={() => setBreakdownModal({ ...breakdownModal, isOpen: false })}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                {breakdownModal.leads.map((lead, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-emerald-200 transition-colors">
                    <div className="flex items-center gap-4">
                      {isJakeBedwell ? (
                        <button
                          onClick={() => handleToggleRebooking(lead.id, lead.is_rebooking)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            lead.is_rebooking 
                              ? 'bg-blue-600 text-white shadow-md' 
                              : 'bg-white border border-gray-200 text-gray-300 hover:border-blue-300 hover:text-blue-400'
                          }`}
                          title="Toggle Rebooking"
                        >
                          <span className="text-xs font-black">R</span>
                        </button>
                      ) : (
                        lead.is_rebooking && (
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center border border-blue-200" title="Rebooking Lead">
                            <span className="text-xs font-black">R</span>
                          </div>
                        )
                      )}
                      <div>
                        <p className="font-bold text-gray-900">{lead.name}</p>
                        <p className="text-xs text-gray-500">{lead.company}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-600">
                        {lead.is_rebooking ? '£50.00 (R)' : `£${lead.price_paid.toFixed(2)}`}
                      </p>
                      <p className="text-[10px] text-gray-400">{new Date(lead.purchased_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {breakdownModal.leads.length === 0 && (
                  <p className="text-center text-gray-400 py-8 italic">No leads found for this action.</p>
                )}
              </div>
            </div>
            <div className="px-8 py-6 bg-slate-50 border-t border-gray-100 text-right">
              <button 
                onClick={() => setBreakdownModal({ ...breakdownModal, isOpen: false })}
                className="px-6 py-2 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Calculator className="w-8 h-8 text-emerald-600" />
            Commission Calculator
          </h1>
          <p className="text-gray-500 mt-2">Estimate your monthly earnings based on performance.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-gray-50 px-6 py-4 rounded-2xl border border-gray-200">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Targeted Total</p>
            <p className="text-3xl font-black text-gray-700">£{targetedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-emerald-50 px-6 py-4 rounded-2xl border border-emerald-100">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Estimated Pay</p>
            <p className="text-3xl font-black text-emerald-700">£{totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Selection Column */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5" /> Select Position
            </label>
            <div className="space-y-2">
              {managementTitles.map(title => (
                <button
                  key={title}
                  onClick={() => {
                    setSelectedJobTitle(title);
                    setQuantities({});
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    selectedJobTitle === title
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {title}
                </button>
              ))}
              {managementTitles.length === 0 && (
                <p className="text-xs text-gray-400 italic py-4">No management positions configured.</p>
              )}
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
            <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2 mb-2">
              <Info className="w-4 h-4" /> Calculator Guide
            </h4>
            <p className="text-xs text-blue-700 leading-relaxed">
              Achieved values are automatically pulled from your sold leads this month. You can manually adjust the "Actions" column to forecast future sales.
            </p>
          </div>
        </div>

        {/* Input Column */}
        <div className="lg:col-span-9 flex flex-col md:flex-row gap-6">
          {/* Actions Box (Manual Input) */}
          <div className="flex-1 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-8 py-6 bg-slate-50 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> {selectedJobTitle} Actions
              </h3>
            </div>
            
            <div className="divide-y divide-gray-50">
              {filteredSettings.map(setting => (
                <div key={setting.id} className="p-6 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-gray-900">{setting.action}</p>
                    <p className="text-[10px] font-medium text-emerald-600">£{setting.commission_amount} per unit</p>
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      min="0"
                      value={quantities[setting.id] || ''}
                      onChange={e => handleQuantityChange(setting.id, e.target.value)}
                      placeholder="0"
                      className="w-full bg-gray-50 border-none rounded-xl px-3 py-2 text-right font-black text-gray-900 focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-gray-300 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Achieved Box (Auto-fill) */}
          <div className="flex-1 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-8 py-6 bg-emerald-50/30 border-b border-emerald-100/50">
              <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Achieved (This Month)
              </h3>
            </div>
            
            <div className="divide-y divide-gray-50">
              {filteredSettings.map(setting => (
                <div key={setting.id} className="p-6 flex items-center justify-between bg-emerald-50/10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">{setting.action}</p>
                      <button 
                        onClick={() => setBreakdownModal({ 
                          isOpen: true, 
                          title: setting.action, 
                          leads: achievedLeads[setting.id] || [] 
                        })}
                        className="text-gray-400 hover:text-emerald-600 transition-colors"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[10px] font-medium text-emerald-600">Actual sales tracked</p>
                  </div>
                  <div className="w-20 flex justify-end">
                    <div className="bg-emerald-100 text-emerald-700 rounded-xl px-4 py-2 font-black text-sm">
                      {achievedQuantities[setting.id] || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
