import React, { useEffect, useState, useRef } from 'react';
import { Bell, Check, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function AdminNotifications() {
  const [unassignedClients, setUnassignedClients] = useState<any[]>([]);
  const [unapprovedUsers, setUnapprovedUsers] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();

    // Setup realtime subscription for new clients
    const channel = supabase
      .channel('public:clients_and_users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
    try {
      // Fetch unassigned clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, company_name, contact_name, created_at')
        .is('assigned_to', null)
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;
      setUnassignedClients(clients || []);

      // Fetch unapproved users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, created_at')
        .eq('role', 'client')
        .eq('is_approved', false)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUnapprovedUsers(users || []);

      // Fetch potential advisors (sales, admin, super_admin)
      const { data: staff, error: staffError } = await supabase
        .from('users')
        .select('id, name, role')
        .in('role', ['sales', 'admin', 'super_admin'])
        .order('name');

      if (staffError) throw staffError;
      setAdmins(staff || []);

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
      
      if (unassignedClients.length <= 1) {
        setIsOpen(false); // Close dropdown if that was the last one
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
      
      if (unassignedClients.length + unapprovedUsers.length <= 1) {
        setIsOpen(false);
      }
    } catch (error: any) {
      toast.error('Failed to approve user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const totalPending = unassignedClients.length + unapprovedUsers.length;

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