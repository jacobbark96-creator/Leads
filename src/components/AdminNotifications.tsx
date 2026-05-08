import React, { useEffect, useState, useRef } from 'react';
import { Bell, Check, UserPlus, Clock, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import Link from 'next/link';

export function AdminNotifications() {
  const { profile } = useAuthStore();
  const [unassignedClients, setUnassignedClients] = useState<any[]>([]);
  const [unapprovedUsers, setUnapprovedUsers] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    fetchData();

    // Setup realtime subscription
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_reminders', filter: `user_id=eq.${profile.id}` }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  useEffect(() => {
    // Click outside to close
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    if (!profile) return;
    try {
      // 1. Fetch unassigned clients (Admins only)
      if (['admin', 'super_admin'].includes(profile.role)) {
        const { data: clients } = await supabase
          .from('clients')
          .select('id, company_name, contact_name, created_at')
          .is('assigned_to', null)
          .order('created_at', { ascending: false });
        setUnassignedClients(clients || []);

        const { data: users } = await supabase
          .from('users')
          .select('id, name, email, created_at')
          .eq('role', 'client')
          .eq('is_approved', false)
          .order('created_at', { ascending: false });
        setUnapprovedUsers(users || []);

        const { data: staff } = await supabase
          .from('users')
          .select('id, name, role')
          .in('role', ['sales', 'admin', 'super_admin'])
          .order('name');
        setAdmins(staff || []);
      }

      // 2. Fetch due reminders for the current user
      const { data: rems } = await supabase
        .from('lead_reminders')
        .select('*, leads(name, company)')
        .eq('user_id', profile.id)
        .eq('is_completed', false)
        .lte('reminder_at', new Date().toISOString())
        .order('reminder_at', { ascending: true });
      
      setReminders(rems || []);

    } catch (error) {
      console.error('Error fetching notifications data:', error);
    }
  };

  const handleAssign = async (clientId: string, adminId: string) => {
    if (!adminId) return;
    setLoading(true);
    
    try {
      // 1. Update client
      const { error: clientError } = await supabase
        .from('clients')
        .update({ assigned_to: adminId })
        .eq('id', clientId);
        
      if (clientError) throw clientError;

      // 2. Update contractor profile if it exists
      await supabase
        .from('contractors')
        .update({ assigned_to: adminId })
        .eq('client_id', clientId);

      toast.success('Advisor assigned successfully!');
      
      // Remove from local state immediately for snappy UI
      setUnassignedClients(prev => prev.filter(c => c.id !== clientId));
      
      if (unassignedClients.length + unapprovedUsers.length + reminders.length <= 1) {
        setIsOpen(false); 
      }
      
    } catch (error: any) {
      toast.error('Failed to assign advisor: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_approved: true })
        .eq('id', userId);
        
      if (error) throw error;
      
      toast.success('User approved successfully!');
      setUnapprovedUsers(prev => prev.filter(u => u.id !== userId));
      
      if (unassignedClients.length + unapprovedUsers.length + reminders.length <= 1) {
        setIsOpen(false);
      }
    } catch (error: any) {
      toast.error('Failed to approve user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const completeReminder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lead_reminders')
        .update({ is_completed: true })
        .eq('id', id);
      
      if (error) throw error;
      setReminders(prev => prev.filter(r => r.id !== id));
      toast.success('Task marked as completed');
    } catch (error: any) {
      toast.error('Failed to update task: ' + error.message);
    }
  };

  const totalPending = unassignedClients.length + unapprovedUsers.length + reminders.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-blue-600 focus:outline-none transition-colors"
      >
        <Bell className="w-5 h-5" />
        {totalPending > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Action Required</h3>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {totalPending} Pending
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {totalPending === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm flex flex-col items-center">
                <Check className="w-8 h-8 text-green-400 mb-2" />
                All clients have been assigned and approved!
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {reminders.map((reminder) => (
                  <li key={reminder.id} className="p-4 hover:bg-gray-50 transition-colors bg-blue-50/30">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Reminder</span>
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(reminder.reminder_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 truncate">
                          Call: {reminder.leads?.company || reminder.leads?.name}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                          {reminder.content}
                        </p>
                        
                        <div className="flex gap-2">
                          <Link
                            href={`/sales-crm/lead?id=${reminder.lead_id}`}
                            onClick={() => setIsOpen(false)}
                            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-xs font-bold rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                            View Lead
                          </Link>
                          <button
                            onClick={() => completeReminder(reminder.id)}
                            className="inline-flex items-center justify-center p-2 border border-transparent rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
                            title="Mark as done"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}

                {unapprovedUsers.map((user) => (
                  <li key={user.id} className="p-4 hover:bg-gray-50 transition-colors bg-amber-50/30">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">New Signup</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate mb-3">
                          {user.email}
                        </p>
                        
                        <button
                          onClick={() => handleApprove(user.id)}
                          disabled={loading}
                          className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 px-3 rounded-md transition-colors disabled:opacity-50"
                        >
                          Approve Account
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
                
                {unassignedClients.map((client) => (
                  <li key={client.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {client.company_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate mb-3">
                          Contact: {client.contact_name}
                        </p>
                        
                        <div className="flex items-center gap-2">
                          <UserPlus className="w-4 h-4 text-gray-400 shrink-0" />
                          <select
                            disabled={loading}
                            onChange={(e) => handleAssign(client.id, e.target.value)}
                            className="block w-full text-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 pl-2 pr-8"
                            defaultValue=""
                          >
                            <option value="" disabled>Assign Advisor...</option>
                            {admins.map((admin) => (
                              <option key={admin.id} value={admin.id}>
                                {admin.name} ({admin.role.replace('_', ' ')})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}