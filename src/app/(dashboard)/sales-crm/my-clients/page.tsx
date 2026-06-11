"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Users, Phone, Mail, Building, Search, User, ExternalLink } from 'lucide-react';

export default function MyClientsPage() {
  const { profile } = useAuthStore();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchClients = async () => {
      if (!profile) return;
      
      try {
        setLoading(true);
        // We select from clients and join with users to get email/name
        const { data, error } = await supabase
          .from('clients')
          .select('*, users!inner(email, name)')
          .eq('assigned_to', profile.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setClients(data || []);
      } catch (error: any) {
        console.error('Error fetching clients:', error);
        toast.error('Failed to fetch clients: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [profile]);

  const filteredClients = clients.filter(client => 
    client.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.users?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.users?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Clients</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and monitor your assigned clients.</p>
        </div>
        
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Company</th>
                <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Contact</th>
                <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Email</th>
                <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Phone</th>
                <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Balance</th>
                <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">
                    No clients assigned to you yet.
                  </td>
                </tr>
              ) : filteredClients.map((client) => (
                <tr key={client.id} className="transition-colors hover:bg-gray-50/80">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                        <Building className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{client.company_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm text-gray-600">{client.contact_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm text-gray-600">{client.users?.email}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm text-gray-600">{client.phone}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-bold text-gray-900">£{(client.credit_balance || 0).toFixed(2)}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button 
                      onClick={() => window.location.href = `/contractor-crm/contractor-v2?id=${client.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 text-xs font-bold border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
