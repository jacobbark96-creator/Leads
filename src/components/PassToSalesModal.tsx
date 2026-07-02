import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Calendar, ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lead } from '@/types';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface PassToSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onSentToSales?: () => void;
}

export const PassToSalesModal: React.FC<PassToSalesModalProps> = ({ isOpen, onClose, lead, onSentToSales }) => {
  const { profile } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // In-House Scheduling State
  const [isInHouseMode, setIsInHouseMode] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [salesStaff, setSalesStaff] = useState<any[]>([]);
  const [partnerClients, setPartnerClients] = useState<any[]>([]);
  const [selectedPartnerClientId, setSelectedPartnerClientId] = useState<string | null>(null);
  const [selectedSalesmanId, setSelectedSalesmanId] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Date[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingPartnerClients, setLoadingPartnerClients] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (isInHouseMode && profile) {
        fetchSalesStaff();
      } else {
        fetchPartnerClients();
      }
    }
  }, [isOpen, isInHouseMode, profile, lead?.division_id]);

  const fetchPartnerClients = async () => {
    setLoadingPartnerClients(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, company_name, contact_name, user_id')
        .eq('is_partner_plus', true);
      
      if (error) throw error;
      setPartnerClients(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch Partner+ clients: ' + error.message);
    } finally {
      setLoadingPartnerClients(false);
    }
  };

  const fetchSalesStaff = async () => {
    setLoadingStaff(true);
    try {
      let roleToFilter = lead?.lead_type === 'residential' ? 'Residential Sales' : 'Commercial Sales';
      
      const { data, error } = await supabase
        .from('users')
        .select('id, name, role, division_id')
        .eq('role', roleToFilter)
        .eq('division_id', lead?.division_id || profile?.division_id);
      
      if (error) throw error;
      setSalesStaff(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch sales staff: ' + error.message);
    } finally {
      setLoadingStaff(false);
    }
  };

  const fetchAvailability = async (userId: string) => {
    setLoadingSlots(true);
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setDate(end.getDate() + 7);

      const res = await fetch(`/api/google/calendar/events?userId=${userId}&timeMin=${start.toISOString()}&timeMax=${end.toISOString()}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      const events = await res.json();

      const slots: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date();
        day.setDate(day.getDate() + i);
        day.setMinutes(0, 0, 0);
        
        if (day.getDay() === 0 || day.getDay() === 6) continue;

        for (let hour = 9; hour < 18; hour++) {
          const slotStart = new Date(day);
          slotStart.setHours(hour, 0, 0, 0);
          
          const slotEnd = new Date(slotStart);
          slotEnd.setHours(hour + 1, 0, 0, 0);

          const bufferStart = new Date(slotStart);
          bufferStart.setMinutes(-15);
          const bufferEnd = new Date(slotEnd);
          bufferEnd.setMinutes(15);

          const hasConflict = events.some((event: any) => {
            const eventStart = new Date(event.start?.dateTime || event.start?.date);
            const eventEnd = new Date(event.end?.dateTime || event.end?.date);
            return (eventStart < bufferEnd && eventEnd > bufferStart);
          });

          if (!hasConflict && slotStart > new Date()) {
            slots.push(slotStart);
          }
        }
      }
      setAvailableSlots(slots);
    } catch (err) {
      console.error('Error fetching availability:', err);
      toast.error('Could not fetch salesman availability.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSendInHouse = async () => {
    if (!selectedSalesmanId || !selectedSlot) return;
    try {
      setIsSending(true);
      
      const slotEnd = new Date(selectedSlot);
      slotEnd.setHours(slotEnd.getHours() + 1);

      const eventRes = await fetch('/api/google/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedSalesmanId,
          summary: `Lead: ${lead.company || lead.name}`,
          description: `Appointment for lead ${lead.id}. Location: ${lead.location || 'N/A'}. Phone: ${lead.phone}`,
          start: { dateTime: selectedSlot.toISOString() },
          end: { dateTime: slotEnd.toISOString() }
        })
      });

      if (!eventRes.ok) {
        const errData = await eventRes.json();
        throw new Error(errData.error || 'Failed to create calendar event');
      }

      const { error } = await supabase
        .from('leads')
        .update({ 
          status: 'awaiting_sales',
          sales_pipeline_status: 'Upcoming',
          assigned_to: selectedSalesmanId,
          booking_date: selectedSlot.toISOString(),
          sent_to_sales: true
        })
        .eq('id', lead.id);

      if (error) throw error;

      toast.success('Lead sent in-house and appointment booked!');
      onSentToSales?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send lead in-house');
    } finally {
      setIsSending(false);
    }
  };

  const leadDetailsText = `
Contact Details
Name: ${lead.name || 'N/A'}
Company: ${lead.company || 'N/A'}
Address: ${lead.location || 'N/A'}
Contact Number: ${lead.phone || 'N/A'}
Secondary Number: ${lead.secondary_phone || 'N/A'}
Email: ${lead.email || 'N/A'}

Project Details
Building Type: ${lead.building_type || 'N/A'}
Monthly Spend: ${lead.monthly_spend ? `£${lead.monthly_spend}` : 'N/A'}
Timeframe: ${lead.timeframe || 'N/A'}
Primary Need: ${lead.primary_need || 'N/A'}
Qualification Notes: ${lead.qualification_notes || 'N/A'}

Technical Details
Roof Condition: ${lead.roof_condition || 'N/A'}
Roof Material: ${lead.roof_material || 'N/A'}
Est. Annual Consumption: ${lead.est_ann_consumption ? `${lead.est_ann_consumption} kWh` : 'N/A'}
Est. System Size: ${lead.est_system_size || 'N/A'}
`.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(leadDetailsText);
    setCopied(true);
    toast.success('Lead details copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkSentToSales = async () => {
    try {
      setIsSending(true);
      
      const updateData: any = { sent_to_sales: true };
      
      if (selectedPartnerClientId) {
        const partner = partnerClients.find(p => p.id === selectedPartnerClientId);
        if (partner && partner.user_id) {
          updateData.assigned_to = partner.user_id;
          updateData.partner_plus_status = 'awaiting_sales';
        }
      }

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', lead.id);

      if (error) throw error;

      toast.success(selectedPartnerClientId ? 'Lead assigned to Partner+' : 'Lead marked as sent to sales');
      onSentToSales?.();
      onClose();
    } catch (error: any) {
      toast.error('Failed to mark lead as sent: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-black text-gray-900">
                {isInHouseMode ? (isScheduling ? 'Select Appointment Slot' : 'Select In-House Staff') : 'Pass to Sales'}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {isInHouseMode ? (
                !isScheduling ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">Select a salesman from the correct division to assign this lead to.</p>
                    {loadingStaff ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {salesStaff.map(staff => (
                          <button
                            key={staff.id}
                            onClick={() => setSelectedSalesmanId(staff.id)}
                            className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                              selectedSalesmanId === staff.id 
                                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' 
                                : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold">{staff.name}</span>
                              <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">{staff.role}</span>
                            </div>
                          </button>
                        ))}
                        {salesStaff.length === 0 && (
                          <p className="text-sm text-gray-400 italic text-center py-4">No sales staff found for this lead's type and division.</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {loadingSlots ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <p className="text-sm text-gray-500 font-medium">Fetching availability...</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-500">Select a 1-hour slot. (Includes 15-min buffer)</p>
                        <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto p-1">
                          {availableSlots.map((slot, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedSlot(slot)}
                              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                                selectedSlot?.getTime() === slot.getTime()
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                              }`}
                            >
                              {slot.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                              <br />
                              {slot.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </button>
                          ))}
                          {availableSlots.length === 0 && (
                            <div className="col-span-2 py-8 text-center">
                              <p className="text-sm text-gray-400 italic">No available slots found in the next 7 days.</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 font-mono text-xs whitespace-pre-wrap leading-relaxed text-gray-700">
                    {leadDetailsText}
                  </div>
                  
                  <div className="pt-2 border-t border-gray-100">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      Partner+ Clients
                    </h4>
                    {loadingPartnerClients ? (
                      <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {partnerClients.map(client => (
                          <button
                            key={client.id}
                            onClick={() => setSelectedPartnerClientId(client.id)}
                            className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                              selectedPartnerClientId === client.id 
                                ? 'border-purple-500 bg-purple-50 text-purple-800 shadow-sm' 
                                : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-sm">{client.company_name || client.contact_name}</span>
                              <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60 bg-purple-100 px-2 py-0.5 rounded text-purple-800">Partner+</span>
                            </div>
                          </button>
                        ))}
                        {partnerClients.length === 0 && (
                          <p className="text-xs text-gray-400 italic text-center py-4">No Partner+ clients available.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-between">
              {isInHouseMode ? (
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => {
                      if (isScheduling) {
                        setIsScheduling(false);
                        setSelectedSlot(null);
                      } else {
                        setIsInHouseMode(false);
                        setSelectedSalesmanId(null);
                      }
                    }}
                    className="flex-1 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  {!isScheduling ? (
                    <button
                      disabled={!selectedSalesmanId || loadingStaff}
                      onClick={() => {
                        setIsScheduling(true);
                        if (selectedSalesmanId) fetchAvailability(selectedSalesmanId);
                      }}
                      className="flex-[2] py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50"
                    >
                      View Availability
                    </button>
                  ) : (
                    <button
                      disabled={!selectedSlot || isSending}
                      onClick={handleSendInHouse}
                      className="flex-[2] py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                      Book & Send
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <button
                      onClick={handleMarkSentToSales}
                      disabled={isSending || lead.sent_to_sales}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2"
                    >
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {lead.sent_to_sales ? 'Already Sent' : 'Mark Sent'}
                    </button>
                    <button
                      onClick={() => setIsInHouseMode(true)}
                      disabled={lead.sent_to_sales}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-sm font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      In-House
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleCopy}
                      className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
