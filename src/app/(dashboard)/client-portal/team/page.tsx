"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { Plus, Users, Mail, User, Shield, X, Trash2, Key, Clock, ExternalLink, ChevronRight, CheckCircle2, AlertCircle, ShoppingCart, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { MarketplaceLeadModal } from '@/components/MarketplaceLeadModal';
import { getVagueLocation } from '@/lib/utils';
import { Lead } from '@/types';

export default function TeamManagement() {
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userLeads, setUserLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedLeadForPreview, setSelectedLeadForPreview] = useState<Lead | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const { profile, refreshProfile } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Team Member'
  });

  const fetchTeam = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('parent_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeam(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch team: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLeads = async (userId: string) => {
    try {
      setLoadingLeads(true);
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`/api/team/requested-leads?userId=${userId}&parentId=${profile?.id}`, {
        headers: {
          'Authorization': `Bearer ${session?.session?.access_token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUserLeads(data.requestedLeads || []);
    } catch (error: any) {
      toast.error('Failed to fetch leads: ' + error.message);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, [profile]);

  useEffect(() => {
    if (selectedUser) {
      fetchUserLeads(selectedUser.id);
    } else {
      setUserLeads([]);
    }
  }, [selectedUser]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.name) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsCreating(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch('/api/team/add-user', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.session?.access_token}`
        },
        body: JSON.stringify({
          ...formData,
          parentId: profile?.id
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      if (data.emailSent) {
        toast.success('Invitation and password sent successfully!');
      } else {
        // Email failed (likely due to missing API key in .env)
        // Show the password to the parent so they can give it to the child manually
        toast.success('User created, but welcome email failed to send.');
        alert(`IMPORTANT: The welcome email could not be sent (check Resend configuration). \n\nPlease provide this temporary password to your team member manually: \n\n${data.temporaryPassword}`);
      }

      setShowAddModal(false);
      setFormData({ name: '', email: '', role: 'Team Member' });
      fetchTeam();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    setIsResetting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch('/api/team/reset-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.session?.access_token}`
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          newPassword,
          parentId: profile?.id
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Password reset successfully!');
      setShowResetPassword(false);
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete ${selectedUser.name}? This action cannot be undone.`)) return;

    setIsDeleting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`/api/team/delete-user?userId=${selectedUser.id}&parentId=${profile?.id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${session?.session?.access_token}`
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Team member deleted successfully');
      setSelectedUser(null);
      fetchTeam();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApproveRequest = async (request: any) => {
    try {
      const { data, error } = await supabase.rpc('approve_purchase_request', {
        p_purchase_id: request.id
      });

      if (error) throw error;
      
      toast.success('Purchase approved!');
      fetchUserLeads(selectedUser!.id);
      refreshProfile();
    } catch (error: any) {
      toast.error('Failed to approve: ' + error.message);
    }
  };

  const handleRejectRequest = async (purchaseId: string) => {
    if (!window.confirm('Are you sure you want to reject this purchase request?')) return;
    try {
      const { error } = await supabase
        .from('lead_purchases')
        .delete()
        .eq('id', purchaseId);
      
      if (error) throw error;
      toast.success('Request rejected');
      fetchUserLeads(selectedUser!.id);
    } catch (error: any) {
      toast.error('Failed to reject: ' + error.message);
    }
  };

  const getUserStatus = (member: UserProfile) => {
    if (member.last_active_at) {
      return {
        label: 'Active',
        icon: CheckCircle2,
        color: 'text-green-600 bg-green-50 border-green-100',
        sub: `Last seen ${new Date(member.last_active_at).toLocaleDateString()}`
      };
    }
    return {
      label: 'Invited',
      icon: Clock,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      sub: member.invited_at ? `Sent ${new Date(member.invited_at).toLocaleDateString()}` : 'Invitation pending'
    };
  };

  if (!profile?.allowed_child_accounts) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 text-center max-w-md">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-500">Your account is not authorized to manage a team. Please contact support if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
            <p className="text-sm text-gray-500">Manage your child accounts and their permissions.</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-5 h-5" />
            Add Team Member
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : team.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">No team members yet</h3>
            <p className="text-gray-500 mb-6">Start by adding your first child account to your team.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 text-blue-600 font-bold hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Member Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map((member) => {
              const status = getUserStatus(member);
              const StatusIcon = status.icon;

              return (
                <div
                  key={member.id}
                  onClick={() => setSelectedUser(member)}
                  className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group cursor-pointer relative overflow-hidden"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg border border-blue-100 shadow-sm group-hover:scale-105 transition-transform">
                        {member.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">{member.name}</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{member.job_title || 'Team Member'}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${status.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                        <Shield className="w-3.5 h-3.5" />
                      </div>
                      <span>Marketplace Access</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
                      {status.sub}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add User Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Add Team Member</h2>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Create a child account</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">Role / Job Title</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="e.g. Sales Representative"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isCreating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Invite and Password'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* User Details Modal */}
        {selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 text-lg font-bold">
                    {selectedUser.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedUser.name}</h2>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{selectedUser.job_title || 'Team Member'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowResetPassword(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Reset Password
                  </button>
                  <button
                    onClick={handleDeleteUser}
                    disabled={isDeleting}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-red-100 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-all shadow-sm disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {isDeleting ? 'Deleting...' : 'Delete User'}
                  </button>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-white transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Mail className="w-3 h-3" />
                      Contact Information
                    </h4>
                    <p className="text-sm font-bold text-gray-900 mb-1">{selectedUser.email}</p>
                    <p className="text-xs text-gray-500">{selectedUser.phone || 'No phone provided'}</p>
                  </div>
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      Activity Status
                    </h4>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${selectedUser.last_active_at ? 'bg-green-500' : 'bg-amber-500'}`} />
                      <p className="text-sm font-bold text-gray-900">
                        {selectedUser.last_active_at ? 'Active Now' : 'Pending Invite'}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedUser.last_active_at 
                        ? `Last seen ${new Date(selectedUser.last_active_at).toLocaleString()}`
                        : `Invited on ${selectedUser.invited_at ? new Date(selectedUser.invited_at).toLocaleDateString() : 'N/A'}`
                      }
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-blue-600" />
                      Purchase Requests
                    </h3>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full uppercase tracking-widest">
                      {userLeads.length} Pending
                    </span>
                  </div>

                  {loadingLeads ? (
                    <div className="space-y-3">
                      {[1, 2].map(i => <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse" />)}
                    </div>
                  ) : userLeads.length === 0 ? (
                    <div className="p-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 text-center">
                      <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 font-medium">No pending purchase requests from this user.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userLeads.map((req) => (
                        <div 
                          key={req.id} 
                          className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center justify-between gap-4 hover:border-blue-200 transition-all group cursor-pointer"
                          onClick={() => {
                            setSelectedLeadForPreview(req.leads);
                            setIsLeadModalOpen(true);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100 group-hover:scale-105 transition-transform">
                              <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">
                                {getVagueLocation(req.leads?.latitude, req.leads?.longitude) || 'Location Undisclosed'}
                              </p>
                              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                                {req.purchase_type === 'exclusive' ? 'Exclusive Purchase' : 'Lead Share'} • £{req.price_paid}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleRejectRequest(req.id)}
                              className="px-4 py-2 bg-white border border-red-100 text-red-600 text-xs font-bold rounded-xl hover:bg-red-50 transition-all shadow-sm"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleApproveRequest(req)}
                              className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
                            >
                              Quick Approve
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {showResetPassword && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Reset Password</h2>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">For {selectedUser?.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowResetPassword(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="p-6 space-y-4">
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <p className="text-[10px] text-red-800 leading-relaxed">
                    This will immediately update the user's password. They will need to use the new password to log in.
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">New Password</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="w-full py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isResetting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lead Preview Modal */}
        {selectedLeadForPreview && (
          <MarketplaceLeadModal
            isOpen={isLeadModalOpen}
            onClose={() => {
              setIsLeadModalOpen(false);
              setSelectedLeadForPreview(null);
            }}
            lead={selectedLeadForPreview}
            onPurchase={() => {}} // Not used in this context but required by prop
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
