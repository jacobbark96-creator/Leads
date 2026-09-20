"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Plus, HelpCircle, LogOut, Link as LinkIcon, PoundSterling, Users, CheckCircle2, Clock } from 'lucide-react';
import AddReferralModal from './AddReferralModal';
import HelpModal from './HelpModal';

export default function ReferralDashboard() {
  const router = useRouter();
  const [partner, setPartner] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    sold: 0,
    earned: 0,
    due: 0,
    paid: 0
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/refer');
        return;
      }

      // Fetch partner data with explicit join to avoid PGRST200 ambiguity
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select(`
          *,
          users!user_id(name)
        `)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (partnerError) {
        console.error('Error fetching partner:', partnerError);
        toast.error('Error accessing partner portal. Please try again.');
        setLoading(false);
        return;
      }

      if (!partnerData) {
        // Fallback: Check if user exists in users table with referral_partner role
        const { data: userData } = await supabase
          .from('users')
          .select('role, name')
          .eq('id', session.user.id)
          .single();

        if (userData?.role === 'referral_partner') {
          // User has the role but no partner record - this is an edge case (e.g. manual role change)
          // We should ideally create a partner record here or redirect to a "complete registration" step
          console.warn('User has referral_partner role but no partners record');
          toast.error('Partner profile not found. Please contact support.');
        } else {
          toast.error('You are not registered as a Referral Partner.');
        }
        router.push('/refer');
        return;
      }

      setPartner(partnerData);

      // Fetch Referrals (leads with lead_source = partner_id)
      const { data: leadsData } = await supabase
        .from('leads')
        .select(`
          id, 
          name, 
          lead_type, 
          created_at, 
          status,
          referral_tracking (kanban_status),
          referral_commissions (amount, status)
        `)
        .eq('lead_source', partnerData.partner_id)
        .order('created_at', { ascending: false });

      if (leadsData) {
        setReferrals(leadsData);
        
        // Calculate Stats
        let sold = 0;
        let earned = 0;
        let due = 0;
        let paid = 0;

        leadsData.forEach(lead => {
          if (lead.referral_commissions && lead.referral_commissions.length > 0) {
            sold++;
            lead.referral_commissions.forEach((comm: any) => {
              if (comm.status === 'Earned' || comm.status === 'Due' || comm.status === 'Paid') earned += Number(comm.amount);
              if (comm.status === 'Due') due += Number(comm.amount);
              if (comm.status === 'Paid') paid += Number(comm.amount);
            });
          }
        });

        setStats({
          total: leadsData.length,
          sold,
          earned,
          due,
          paid
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    const link = `https://openlead.co.uk/refer?ref=\${partner?.partner_id}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied to clipboard!');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/refer');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/openlead-logo.png" alt="OpenLead" className="h-6" />
            <span className="text-gray-400">|</span>
            <span className="font-semibold text-gray-900">Partner Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsHelpModalOpen(true)}
              className="text-gray-500 hover:text-gray-700 flex items-center gap-2 text-sm font-medium"
            >
              <HelpCircle className="w-5 h-5" />
              <span className="hidden sm:inline">How it works</span>
            </button>
            <button 
              onClick={handleSignOut}
              className="text-gray-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {partner?.users?.name}</h1>
            <p className="text-gray-500">Partner ID: <span className="font-mono text-gray-900 font-medium">{partner?.partner_id}</span></p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={copyReferralLink}
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50 flex items-center gap-2 shadow-sm"
            >
              <LinkIcon className="w-4 h-4" />
              Refer a Partner
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#0066FF] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[#0052CC] flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Add Referral
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2">
              <Users className="w-4 h-4" /> Total Referrals
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> Leads Sold
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.sold}</div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2">
              <PoundSterling className="w-4 h-4" /> Earned
            </div>
            <div className="text-3xl font-bold text-gray-900">£{stats.earned.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-[#B3D1FF] bg-[#E8F2FF] shadow-sm">
            <div className="text-[#0066FF] text-sm font-medium mb-1 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Due for Payment
            </div>
            <div className="text-3xl font-bold text-[#0066FF]">£{stats.due.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Paid
            </div>
            <div className="text-3xl font-bold text-gray-900">£{stats.paid.toFixed(2)}</div>
          </div>
        </div>

        {/* Referrals List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">My Referrals</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3">Referral Name</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Date Submitted</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {referrals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      You haven't submitted any referrals yet. Click "Add Referral" to get started!
                    </td>
                  </tr>
                ) : (
                  referrals.map((lead) => {
                    const commission = lead.referral_commissions?.[0];
                    const isSold = commission !== undefined;
                    return (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{lead.name}</td>
                        <td className="px-6 py-4 capitalize">{lead.lead_type || 'Residential'}</td>
                        <td className="px-6 py-4 text-gray-500">{new Date(lead.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          {isSold ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Sold
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {lead.referral_tracking?.[0]?.kanban_status === 'DEALT_WITH' ? 'In Progress' : 'New'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {commission ? (
                            <div>
                              <div className="font-medium text-gray-900">£{commission.amount}</div>
                              <div className="text-xs text-gray-500">{commission.status}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {isAddModalOpen && (
        <AddReferralModal 
          partnerId={partner?.id} 
          partnerRef={partner?.partner_id}
          onClose={() => setIsAddModalOpen(false)} 
          onSuccess={() => {
            setIsAddModalOpen(false);
            fetchDashboardData();
          }} 
        />
      )}

      {isHelpModalOpen && (
        <HelpModal onClose={() => setIsHelpModalOpen(false)} />
      )}
    </div>
  );
}