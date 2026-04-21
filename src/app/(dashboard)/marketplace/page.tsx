"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import toast from 'react-hot-toast';
import { Search, MapPin, Building, Calendar, FileText, CheckCircle } from 'lucide-react';
import { MarketplaceLeadModal } from '@/components/MarketplaceLeadModal';

export default function Marketplace() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const { profile } = useAuthStore();

  const fetchMarketplaceLeads = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('status', 'qualified')
        .eq('is_marketed', true)
        .is('client_id', null) // Only show leads not yet purchased
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch marketplace leads: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketplaceLeads();
  }, []);

  const handlePurchaseLead = async (leadId: string) => {
    if (!profile) return;
    try {
      // Basic update: assign client_id. (In real-world, you'd integrate Stripe here first)
      const { error } = await supabase
        .from('leads')
        .update({ client_id: profile.id, purchase_date: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;

      toast.success('Lead successfully purchased! You can now view all details in your Dashboard.');
      setSelectedLead(null);
      
      // Remove from marketplace
      setLeads(prev => prev.filter(l => l.id !== leadId));
    } catch (error: any) {
      toast.error('Failed to purchase lead: ' + error.message);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <ProtectedRoute allowedRoles={['client', 'admin', 'super_admin']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Marketplace</h1>
          <p className="mt-1 text-sm text-gray-500">Browse and purchase exclusively qualified leads.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-200 hover:shadow-md transition-shadow flex flex-col">
              {/* Photo Area */}
              <div className="h-48 bg-gray-100 relative">
                {lead.photos && lead.photos.length > 0 ? (
                  <img src={lead.photos[0]} alt="Lead property" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Building className="w-12 h-12 opacity-20" />
                  </div>
                )}
                <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                  Qualified
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {lead.location || 'Location undisclosed'}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="block text-sm font-medium text-gray-500">Est. Spend</span>
                    <span className="text-lg font-bold text-green-600">£{lead.monthly_spend || 'N/A'}</span>
                  </div>
                </div>

                <div className="space-y-3 flex-1">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="font-medium mr-1">Timeframe:</span> {lead.timeframe || 'N/A'}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <FileText className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="font-medium mr-1">System Size:</span> {lead.est_system_size || 'N/A'}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedLead(lead)}
                  className="mt-6 w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {leads.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200 border-dashed">
            <Search className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No leads available</h3>
            <p className="mt-1 text-gray-500">Check back later for newly qualified leads.</p>
          </div>
        )}
      </div>

      {selectedLead && (
        <MarketplaceLeadModal
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          lead={selectedLead}
          onPurchase={() => handlePurchaseLead(selectedLead.id)}
        />
      )}
    </ProtectedRoute>
  );
}
