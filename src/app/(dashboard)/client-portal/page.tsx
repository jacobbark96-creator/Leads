"use client";
import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Filter, Search, Phone, Mail, Building, MapPin } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Lead, Category } from '../../../types';
import { useAuthStore } from '../../../store/authStore';
import { CalendarModal } from './components/CalendarModal';
import toast from 'react-hot-toast';

export default function ClientDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { profile } = useAuthStore();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch Categories
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true);
      
      if (catError) throw catError;
      setCategories(catData || []);

      // Fetch Client Leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;
      setLeads(leadsData || []);

    } catch (error: any) {
      toast.error('Failed to fetch dashboard data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const filteredLeads = selectedCategory === 'all' 
    ? leads 
    : leads.filter(l => l.category_id === selectedCategory);

  const getCategoryName = (id: string | null) => {
    if (!id) return 'Uncategorized';
    const cat = categories.find(c => c.id === id);
    return cat ? cat.name : 'Unknown';
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Purchased Leads</h1>
          <p className="mt-1 text-sm text-gray-500">View and manage your leads. Access your bookings through the calendar.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-4">
          <button
            onClick={() => setIsCalendarOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <CalendarIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
            View Calendar
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div className="relative rounded-md shadow-sm max-w-xs w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLeads.map((lead) => (
            <div key={lead.id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {getCategoryName(lead.category_id)}
                  </span>
                  {lead.booking_date && (
                    <span className="text-xs text-gray-500 flex items-center">
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {new Date(lead.booking_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-medium text-gray-900 truncate">{lead.name}</h3>
                
                <dl className="mt-4 space-y-3">
                  {lead.phone && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Phone className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                      <a href={`tel:${lead.phone}`} className="hover:text-blue-600">{lead.phone}</a>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Mail className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                      <a href={`mailto:${lead.email}`} className="hover:text-blue-600 truncate">{lead.email}</a>
                    </div>
                  )}
                  {lead.company && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Building className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                      <span className="truncate">{lead.company}</span>
                    </div>
                  )}
                </dl>
              </div>
              <div className="bg-gray-50 px-4 py-4 sm:px-6">
                <div className="text-sm">
                  <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                    View full details <span aria-hidden="true">&rarr;</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredLeads.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <Search className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No leads found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedCategory === 'all' 
                ? "You haven't purchased any leads yet." 
                : "No leads found for the selected category."}
            </p>
          </div>
        )}
      </div>

      <CalendarModal 
        isOpen={isCalendarOpen} 
        onClose={() => setIsCalendarOpen(false)} 
        leads={leads}
      />
    </div>
  );
};