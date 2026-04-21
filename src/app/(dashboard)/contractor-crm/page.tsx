"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Contractor } from '../../../types';
import toast from 'react-hot-toast';
import { Phone, Mail, Building, User, Users, Calendar, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function ContractorProcessing() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchContractors = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('contractors')
        .select('*')
        .neq('status', 'onboarded')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setContractors(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch contractors: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractors();
  }, [statusFilter]);

  const updateContractorStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('contractors')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success('Contractor status updated');
      fetchContractors();
    } catch (error: any) {
      toast.error('Failed to update contractor: ' + error.message);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Potential Contractors</h1>
          <p className="text-sm text-gray-500 mt-1">Process and qualify incoming contractors.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-medium">Filter Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border-gray-300 rounded-lg shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500 py-2 pl-3 pr-8"
          >
            <option value="all">All Potential</option>
            <option value="fresh">Fresh</option>
            <option value="no pitch">No Pitch</option>
            <option value="dnc">DNC</option>
            <option value="call back">Call Back</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {contractors.map((contractor) => (
          <div key={contractor.id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="p-5 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                  ${contractor.status === 'fresh' ? 'bg-green-100 text-green-800' : 
                    contractor.status === 'no pitch' ? 'bg-yellow-100 text-yellow-800' : 
                    contractor.status === 'onboarded' ? 'bg-blue-100 text-blue-800' : 
                    contractor.status === 'dnc' ? 'bg-red-100 text-red-800' : 
                    contractor.status === 'call back' ? 'bg-purple-100 text-purple-800' : 
                    'bg-gray-100 text-gray-800'}`}>
                  {contractor.status}
                </span>
                <select
                  value={contractor.status}
                  onChange={(e) => updateContractorStatus(contractor.id, e.target.value)}
                  className="text-sm border-gray-300 rounded-md py-1 pl-2 pr-8 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="fresh">Fresh</option>
                  <option value="no pitch">No Pitch</option>
                  <option value="dnc">DNC</option>
                  <option value="call back">Call Back</option>
                  <option value="onboarded">Onboarded</option>
                </select>
              </div>
              
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <User className="w-5 h-5 mr-2 text-gray-400" />
                {contractor.name}
              </h3>
              
              <dl className="mt-4 flex flex-col gap-y-3">
                {contractor.phone && (
                  <div className="flex items-center">
                    <dt className="sr-only">Phone</dt>
                    <Phone className="w-5 h-5 text-gray-400 mr-2" />
                    <dd className="text-sm text-gray-900">
                      <a href={`tel:${contractor.phone}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                        {contractor.phone}
                      </a>
                    </dd>
                  </div>
                )}
                
                {contractor.email && (
                  <div className="flex items-center">
                    <dt className="sr-only">Email</dt>
                    <Mail className="w-5 h-5 text-gray-400 mr-2" />
                    <dd className="text-sm text-gray-900 truncate">
                      <a href={`mailto:${contractor.email}`} className="hover:text-blue-600">
                        {contractor.email}
                      </a>
                    </dd>
                  </div>
                )}

                {contractor.company && (
                  <div className="flex items-center">
                    <dt className="sr-only">Company</dt>
                    <Building className="w-5 h-5 text-gray-400 mr-2" />
                    <dd className="text-sm text-gray-900 truncate">{contractor.company}</dd>
                  </div>
                )}
              </dl>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-xs text-gray-500 flex justify-between">
                <span>Added: {new Date(contractor.created_at).toLocaleDateString()}</span>
                <Link
                  href={`/contractor-crm/contractor/${contractor.id}?tab=potential`}
                  target="_blank"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {contractors.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No contractors</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by importing contractors from a CSV file.</p>
        </div>
      )}
    </div>
  );
};