'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Check, Clock, User, X, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export const ConciergeTab = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lead_purchases')
        .select(`
          id, 
          concierge_status, 
          concierge_dates, 
          has_concierge, 
          purchased_at,
          client_id,
          client:clients (
            user_id,
            users (name, email)
          ),
          lead:leads (name, company, phone, email)
        `)
        .eq('has_concierge', true)
        .order('purchased_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch concierge requests: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleConfirm = async (purchaseId: string, clientId: string, clientEmail: string, clientName: string) => {
    if (!selectedDate) {
      toast.error('Please select or enter a confirmed date/time');
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('lead_purchases')
        .update({
          concierge_status: 'confirmed'
        })
        .eq('id', purchaseId);

      if (updateError) throw updateError;

      const emailRes = await fetch('/api/concierge/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail,
          clientName,
          confirmedDate: selectedDate
        })
      });

      if (!emailRes.ok) {
        throw new Error('Failed to send confirmation email');
      }

      toast.success('Booking confirmed and email sent!');
      setConfirmingId(null);
      setSelectedDate('');
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50/80">
            <tr>
              <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Date Requested</th>
              <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Client</th>
              <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Lead Details</th>
              <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Requested Dates</th>
              <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
              <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {requests.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">
                  No concierge requests found.
                </td>
              </tr>
            ) : requests.map((req) => {
              const dates = Array.isArray(req.concierge_dates) ? req.concierge_dates : [];
              const clientUser = req.client?.users;
              const isPending = req.concierge_status === 'pending';

              return (
                <tr key={req.id} className="transition-colors hover:bg-gray-50/80">
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {new Date(req.purchased_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-gray-900">{clientUser?.name || 'Unknown Client'}</span>
                      <span className="text-[10px] text-gray-500">{clientUser?.email}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-gray-900">{req.lead?.name || req.lead?.company || 'Unknown Lead'}</span>
                      <span className="text-[10px] text-gray-500">{req.lead?.phone}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      {dates.length > 0 ? dates.map((d: string, i: number) => (
                        <span key={i} className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded inline-block w-fit">
                          {d}
                        </span>
                      )) : (
                        <span className="text-xs text-gray-400 italic">No dates provided</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isPending ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {isPending ? 'Pending' : 'Confirmed'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isPending ? (
                      <button
                        onClick={() => setConfirmingId(req.id)}
                        className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 transition-colors"
                      >
                        Confirm
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 flex items-center justify-end gap-1">
                        <Check className="w-3 h-3" /> Done
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {confirmingId && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Confirm Booking</h3>
              <button onClick={() => setConfirmingId(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Enter the final confirmed date and time. This will be sent to the client via email.
              </p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmed Date/Time</label>
                  <input 
                    type="text" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    placeholder="e.g. 15th Aug at 10:00 AM"
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  />
                </div>
                
                {(() => {
                  const req = requests.find(r => r.id === confirmingId);
                  const dates = Array.isArray(req?.concierge_dates) ? req.concierge_dates : [];
                  if (dates.length > 0) {
                    return (
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Client Suggested Dates:</p>
                        <div className="flex flex-wrap gap-2">
                          {dates.map((d: string, i: number) => (
                            <button 
                              key={i}
                              onClick={() => setSelectedDate(d)}
                              className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded hover:border-blue-300 hover:bg-blue-50 transition-colors"
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setConfirmingId(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    const req = requests.find(r => r.id === confirmingId);
                    if (req && req.client?.users) {
                      handleConfirm(confirmingId, req.client_id, req.client.users.email, req.client.users.name);
                    }
                  }}
                  className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Confirm & Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
