"use client";

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../../store/authStore';
import { supabase } from '../../../../lib/supabase';
import { calculateCommission } from '@/lib/commission';
import { 
  format, 
  startOfMonth, 
  isFriday, 
  lastDayOfMonth, 
  subDays, 
  addMonths, 
  isAfter, 
  isSameDay,
  parseISO
} from 'date-fns';
import { 
  Banknote, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Loader2,
  DollarSign,
  Briefcase
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CommissionsPage() {
  const { profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [paidLeads, setPaidLeads] = useState<any[]>([]);
  const [showPaidHistory, setShowPaidHistory] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  
  const isSuperAdmin = profile?.role === 'super_admin';

  useEffect(() => {
    if (profile) {
      if (isSuperAdmin) {
        fetchUsers();
      }
      setSelectedUserId(profile.id);
    }
  }, [profile, isSuperAdmin]);

  useEffect(() => {
    if (selectedUserId) {
      fetchCommissions();
    }
  }, [selectedUserId]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, name')
      .neq('role', 'client')
      .order('name');
    if (data) setUsers(data);
  };

  const getPayDayInfo = (date: Date) => {
    const getLastFriday = (d: Date) => {
      let lastDay = lastDayOfMonth(d);
      while (!isFriday(lastDay)) {
        lastDay = subDays(lastDay, 1);
      }
      return lastDay;
    };

    const payday = getLastFriday(date);
    const cutoff = subDays(payday, 14);
    return { payday, cutoff };
  };

  const calculatePaymentDate = (soldDate: Date) => {
    const { payday: currentPayday, cutoff: currentCutoff } = getPayDayInfo(soldDate);
    
    // If sold on or before cutoff, paid this month's payday
    if (!isAfter(soldDate, currentCutoff)) {
      return currentPayday;
    }
    
    // Else paid next month's payday
    const nextMonth = addMonths(soldDate, 1);
    const { payday: nextPayday } = getPayDayInfo(nextMonth);
    return nextPayday;
  };

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id, 
          name, 
          company, 
          price, 
          exclusive_price, 
          purchase_date, 
          created_at, 
          status,
          marked_as_sold,
          purchase_count,
          max_shares,
          is_marketed,
          is_exclusive_sold,
          lead_purchases(
            client_id,
            clients(
              users(email)
            )
          )
        `)
        .eq('assigned_to', selectedUserId)
        .or('status.eq.sold,marked_as_sold.eq.true,status.eq.marketplace,purchase_count.gt.0');

      if (error) throw error;

      if (data) {
        const now = new Date();
        const allCommissions = data
          .map(lead => {
            const isLeadShare = (lead.status === 'marketplace' || lead.purchase_count > 0) && (lead.is_exclusive_sold !== true);
            
            const validPurchases = lead.lead_purchases?.filter((p: any) => 
              p.clients?.users?.email !== 'test@example.com'
            ) || [];
            
            const validPurchaseCount = validPurchases.length;

            // Filter out leads with no actual valid sales
            if (validPurchaseCount === 0 && !lead.marked_as_sold && lead.status !== 'sold') return null;
            if (validPurchaseCount === 0 && (lead.status === 'marketplace')) return null;

            const soldDate = lead.purchase_date ? parseISO(lead.purchase_date) : parseISO(lead.created_at);
            
            let commission = 0;
            if (isLeadShare) {
              commission = validPurchaseCount * 33;
            } else {
              commission = calculateCommission(lead.exclusive_price || lead.price, false);
            }

            if (commission === 0) return null;

            const paymentDate = calculatePaymentDate(soldDate);
            
            return {
              ...lead,
              isLeadShare,
              validPurchaseCount,
              soldDate,
              commission,
              paymentDate,
              isPaid: isAfter(now, paymentDate) && !isSameDay(now, paymentDate)
            };
          })
          .filter(c => c !== null) as any[];

        const pending = allCommissions
          .filter(c => !c.isPaid)
          .sort((a, b) => a.paymentDate.getTime() - b.paymentDate.getTime());
        
        const paid = allCommissions
          .filter(c => c.isPaid)
          .sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime());

        setLeads(pending);
        setPaidLeads(paid);
      }
    } catch (err: any) {
      toast.error('Failed to fetch commissions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getNextPayday = () => {
    const now = new Date();
    const { payday } = getPayDayInfo(now);
    
    if (isAfter(now, payday) && !isSameDay(now, payday)) {
      return getPayDayInfo(addMonths(now, 1)).payday;
    }
    return payday;
  };

  const nextPayday = getNextPayday();
  const totalUpcoming = leads.reduce((sum, lead) => sum + lead.commission, 0);
  const nextPaydayAmount = leads
    .filter(lead => isSameDay(lead.paymentDate, nextPayday))
    .reduce((sum, lead) => sum + lead.commission, 0);

  if (!profile) return null;

  const displayLeads = showPaidHistory ? paidLeads : leads;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Commissions</h1>
          <p className="text-sm text-gray-500 mt-1">Track your earnings and upcoming pay dates.</p>
        </div>

        {isSuperAdmin && (
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Member</span>
              <div className="relative mt-1">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer shadow-sm min-w-[200px]"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Banknote className="w-16 h-16 text-emerald-600" />
          </div>
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Banknote className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Due Next Payday</p>
          </div>
          <p className="text-3xl font-black text-gray-900 tracking-tight relative z-10">£{nextPaydayAmount.toLocaleString()}</p>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase relative z-10">
            <CalendarIcon className="w-3 h-3" />
            {format(nextPayday, 'MMMM do, yyyy')}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="w-16 h-16 text-blue-600" />
          </div>
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Pending Comm.</p>
          </div>
          <p className="text-3xl font-black text-gray-900 tracking-tight relative z-10">£{totalUpcoming.toLocaleString()}</p>
          <p className="mt-2 text-[10px] font-bold text-gray-400 uppercase relative z-10">Across all future paydays</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Briefcase className="w-16 h-16 text-purple-600" />
          </div>
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Briefcase className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Sales</p>
          </div>
          <p className="text-3xl font-black text-gray-900 tracking-tight relative z-10">{leads.length}</p>
          <p className="mt-2 text-[10px] font-bold text-gray-400 uppercase relative z-10">Awaiting payment date</p>
        </div>
      </div>

      {/* Commission List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowPaidHistory(false)}
              className={`text-sm font-bold transition-colors ${!showPaidHistory ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Pending Schedule
            </button>
            <button 
              onClick={() => setShowPaidHistory(true)}
              className={`text-sm font-bold transition-colors flex items-center gap-2 ${showPaidHistory ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Paid History
              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">{paidLeads.length}</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {!showPaidHistory ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Upcoming Payment</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Successfully Paid</span>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fetching data...</p>
            </div>
          ) : displayLeads.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lead Info</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sold Date</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pay Date</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayLeads.map((lead) => {
                  const isNextPayday = isSameDay(lead.paymentDate, nextPayday);
                  return (
                    <tr key={lead.id} className={`hover:bg-gray-50/50 transition-colors group ${isNextPayday && !showPaidHistory ? 'bg-emerald-50/20' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">
                              {lead.company || lead.name || 'Unknown Lead'}
                            </span>
                            {lead.isLeadShare && (
                              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[8px] font-black uppercase tracking-tighter">
                                Leadshare ({lead.validPurchaseCount}/{lead.max_shares || 3})
                              </span>
                            )}
                            {isNextPayday && !showPaidHistory && (
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[8px] font-black uppercase tracking-tighter">
                                Next Pay
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-500 mt-0.5 font-medium">ID: {lead.id.substring(0, 8)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-xs font-semibold text-gray-700">{format(lead.soldDate, 'MMM d, yyyy')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {showPaidHistory ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Clock className={`w-3.5 h-3.5 ${isNextPayday ? 'text-emerald-500' : 'text-amber-500'}`} />
                          )}
                          <span className={`text-xs font-bold ${isNextPayday && !showPaidHistory ? 'text-emerald-700' : 'text-gray-900'}`}>
                            {format(lead.paymentDate, 'MMM d, yyyy')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-black text-gray-900">£{lead.commission.toLocaleString()}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center px-6">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-gray-300" />
              </div>
              <h4 className="text-base font-bold text-gray-900">
                {showPaidHistory ? 'No Payment History' : 'No Pending Commissions'}
              </h4>
              <p className="text-xs text-gray-500 mt-1 max-w-[280px]">
                {showPaidHistory 
                  ? 'There are no records of past commission payments for this user.'
                  : "You don't have any upcoming commission payments at the moment. Sales marked in the pipeline will appear here."}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
        <div>
          <h4 className="text-sm font-bold text-amber-900">Commission Policy</h4>
          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
            Sales made before the cut-off date (2 weeks before the last Friday of the month) are paid on that month's payday. 
            Sales made after the cut-off are rolled over to the following month's payday.
          </p>
        </div>
      </div>
    </div>
  );
}