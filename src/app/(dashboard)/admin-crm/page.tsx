"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Ban, Shield, Users, Briefcase, X, Activity, BarChart2, Database, Image as ImageIcon, FileText, Eye, MessageSquare, PoundSterling } from 'lucide-react';
import { UserDetailsModal } from '@/components/UserDetailsModal';
import { ClientMonitoringTab } from './components/ClientMonitoringTab';
import { LeadMonitoringTab } from './components/LeadMonitoringTab';
import { PackMonitoringTab } from './components/PackMonitoringTab';
import { BackgroundTab } from './components/BackgroundTab';
import { PressCentreTab } from './components/PressCentreTab';
import { FeedbackTab } from './components/FeedbackTab';
import { DivisionsTab } from './components/DivisionsTab';
import { FinanceTab } from './components/FinanceTab';

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState<'users' | 'client_monitoring' | 'lead_monitoring' | 'pack_monitoring' | 'background' | 'press' | 'feedback' | 'divisions' | 'finance'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuthStore();
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'client', password: '', division_id: '' });
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [clientBalances, setClientBalances] = useState<Record<string, number>>({});
  const [addingBalanceId, setAddingBalanceId] = useState<string | null>(null);
  const [balanceAmount, setBalanceAmount] = useState<string>('');
  const [divisions, setDivisions] = useState<any[]>([]);

  const fetchDivisions = async () => {
    try {
      const { data, error } = await supabase.from('divisions').select('*').order('name');
      if (error) throw error;
      setDivisions(data || []);
    } catch (error: any) {
      console.error('Failed to fetch divisions:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);

      // Fetch client balances for users who are clients
      const clientIds = (data || []).filter(u => u.role === 'client').map(u => u.id);
      if (clientIds.length > 0) {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('user_id, credit_balance')
          .in('user_id', clientIds);
          
        if (clientsData) {
          const balances: Record<string, number> = {};
          clientsData.forEach(c => {
            balances[c.user_id] = c.credit_balance || 0;
          });
          setClientBalances(balances);
        }
      }
    } catch (error: any) {
      toast.error('Failed to fetch users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDivisions();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      toast.success('User role updated successfully');
      fetchUsers();
    } catch (error: any) {
      toast.error('Failed to update role: ' + error.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to completely delete this user? They will be able to sign up again in the future.')) return;
    
    try {
      const { error } = await supabase.rpc('delete_user_completely', { target_user_id: userId });
      if (error) throw error;
      toast.success('User completely deleted');
      fetchUsers();
    } catch (error: any) {
      toast.error('Failed to delete user: ' + error.message);
    }
  };

  const handleBanUser = async (userId: string, email: string) => {
    if (!window.confirm(`Are you sure you want to BAN ${email}? They will be deleted and NEVER be able to sign up again.`)) return;
    
    try {
      const { error } = await supabase.rpc('ban_user_completely', { 
        target_user_id: userId,
        target_email: email 
      });
      if (error) throw error;
      toast.success('User has been banned and deleted');
      fetchUsers();
    } catch (error: any) {
      toast.error('Failed to ban user: ' + error.message);
    }
  };

  const handleImpersonate = async (userId: string, email: string) => {
    try {
      setImpersonatingId(userId);
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate impersonation link');

      await navigator.clipboard.writeText(data.link);
      toast.success('Magic link copied to clipboard! Paste it in an Incognito window to log in as this user.');
      
    } catch (err: any) {
      toast.error(err.message || 'Failed to impersonate user');
    } finally {
      setImpersonatingId(null);
    }
  };

  useEffect(() => {
    if (newUser.role === 'Commercial Sales' && !newUser.division_id) {
      // Default to OpenEnergy division for Commercial Sales
      const openEnergy = divisions.find(d => d.name === 'OpenEnergy');
      if (openEnergy) {
        setNewUser(prev => ({ ...prev, division_id: openEnergy.id }));
      }
    } else if (newUser.role === 'Residential Sales' && !newUser.division_id) {
      // Default to Open Energy residential for Residential Sales
      const residential = divisions.find(d => d.name === 'Open Energy residential');
      if (residential) {
        setNewUser(prev => ({ ...prev, division_id: residential.id }));
      }
    } else if (newUser.role === 'Residential Rep' && !newUser.division_id) {
      // Default to Open Energy residential for Residential Rep
      const residential = divisions.find(d => d.name === 'Open Energy residential');
      if (residential) {
        setNewUser(prev => ({ ...prev, division_id: residential.id }));
      }
    }
  }, [newUser.role, divisions]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.name || !newUser.password) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setIsCreatingUser(true);
    try {
      // In a real production app, you would use an Edge Function or backend API 
      // with service_role key to bypass the email confirmation requirement, 
      // but we can create them via the standard auth flow for now.
      const { data, error } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            name: newUser.name,
            role: newUser.role,
            division_id: newUser.division_id || null
          }
        }
      });
      
      if (error) throw error;
      
      toast.success('User created successfully. They will need to verify their email.');
      setNewUser({ email: '', name: '', role: 'client', password: '', division_id: '' });
      setShowCreateModal(false);
      fetchUsers();
    } catch (error: any) {
      toast.error('Failed to create user: ' + error.message);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleAddBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingBalanceId || !balanceAmount) return;
    
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount)) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    try {
      // First, get the client record for this user
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, credit_balance')
        .eq('user_id', addingBalanceId)
        .single();
        
      if (clientError) throw new Error('Client record not found for this user. They must complete onboarding first.');
      
      const newBalance = (clientData.credit_balance || 0) + amount;
      
      if (newBalance < 0) {
        toast.error('Balance cannot be negative');
        return;
      }
      
      // Update balance
      const { error: updateError } = await supabase
        .from('clients')
        .update({ credit_balance: newBalance })
        .eq('id', clientData.id);
        
      if (updateError) throw updateError;
      
      toast.success(`Successfully updated balance by £${amount}`);
      setClientBalances(prev => ({...prev, [addingBalanceId]: newBalance}));
      setAddingBalanceId(null);
      setBalanceAmount('');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  const adminCount = users.filter(u => u.role === 'admin' || u.role === 'super_admin').length;
  const repCount = users.filter(u => u.role === 'rep' || u.role === 'Residential Rep').length;
  const salesCount = users.filter(u => u.role === 'Residential Sales' || u.role === 'Commercial Sales').length;
  const growthManagerCount = users.filter(u => u.role === 'growth_manager').length;
  const clientCount = users.filter(u => u.role === 'client').length;

  const filteredUsers = users.filter(u => {
    if (roleFilter === 'all') return true;
    if (roleFilter === 'admin') return u.role === 'admin' || u.role === 'super_admin';
    if (roleFilter === 'rep') return u.role === 'rep' || u.role === 'Residential Rep';
    if (roleFilter === 'Residential Sales') return u.role === 'Residential Sales' || u.role === 'Commercial Sales';
    return u.role === roleFilter;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Admin CRM
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage users, clients, and platform monitoring.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <div className="flex items-center gap-2"><Users className="w-4 h-4" /> Users</div>
        </button>
        <button
          onClick={() => setActiveTab('client_monitoring')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'client_monitoring' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <div className="flex items-center gap-2"><Activity className="w-4 h-4" /> Client Monitoring</div>
        </button>
        <button
          onClick={() => setActiveTab('lead_monitoring')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'lead_monitoring' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <div className="flex items-center gap-2"><BarChart2 className="w-4 h-4" /> Lead Monitoring</div>
        </button>
        <button
          onClick={() => setActiveTab('pack_monitoring')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pack_monitoring' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <div className="flex items-center gap-2"><Database className="w-4 h-4" /> Pack Monitoring</div>
        </button>
        <button
          onClick={() => setActiveTab('background')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'background' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <div className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Background</div>
        </button>
        <button
          onClick={() => setActiveTab('press')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'press' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <div className="flex items-center gap-2"><FileText className="w-4 h-4" /> Press Centre</div>
        </button>
        <button
          onClick={() => setActiveTab('feedback')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'feedback' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Feedback</div>
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'finance' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <div className="flex items-center gap-2"><PoundSterling className="w-4 h-4" /> Finance</div>
        </button>
        {profile?.role === 'super_admin' && (
          <button
            onClick={() => setActiveTab('divisions')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'divisions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <div className="flex items-center gap-2"><Briefcase className="w-4 h-4" /> Divisions</div>
          </button>
        )}
      </div>

      {activeTab === 'users' && (
        <>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <button 
            onClick={() => setRoleFilter(roleFilter === 'admin' ? 'all' : 'admin')}
            className={`bg-white shadow-sm border rounded-lg p-4 flex items-center justify-between text-left transition-all ${roleFilter === 'admin' ? 'border-purple-500 ring-1 ring-purple-500 bg-purple-50/30' : 'border-gray-200 hover:border-purple-300'}`}
          >
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Admins</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{adminCount}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
               <Shield className="w-4 h-4" />
            </div>
          </button>
          
          <button 
            onClick={() => setRoleFilter(roleFilter === 'rep' ? 'all' : 'rep')}
            className={`bg-white shadow-sm border rounded-lg p-4 flex items-center justify-between text-left transition-all ${roleFilter === 'rep' ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-50/30' : 'border-gray-200 hover:border-amber-300'}`}
          >
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Reps</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{repCount}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
               <Briefcase className="w-4 h-4" />
            </div>
          </button>

          <button 
            onClick={() => setRoleFilter(roleFilter === 'Residential Sales' || roleFilter === 'Commercial Sales' ? 'all' : 'Residential Sales')}
            className={`bg-white shadow-sm border rounded-lg p-4 flex items-center justify-between text-left transition-all ${roleFilter.includes('Sales') ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/30' : 'border-gray-200 hover:border-blue-300'}`}
          >
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sales Staff</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{salesCount}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
               <Users className="w-4 h-4" />
            </div>
          </button>

          <button 
            onClick={() => setRoleFilter(roleFilter === 'growth_manager' ? 'all' : 'growth_manager')}
            className={`bg-white shadow-sm border rounded-lg p-4 flex items-center justify-between text-left transition-all ${roleFilter === 'growth_manager' ? 'border-green-500 ring-1 ring-green-500 bg-green-50/30' : 'border-gray-200 hover:border-green-300'}`}
          >
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Growth Mgr</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{growthManagerCount}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
               <BarChart2 className="w-4 h-4" />
            </div>
          </button>
          
          <button 
            onClick={() => setRoleFilter(roleFilter === 'client' ? 'all' : 'client')}
            className={`bg-white shadow-sm border rounded-lg p-4 flex items-center justify-between text-left transition-all ${roleFilter === 'client' ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/30' : 'border-gray-200 hover:border-blue-300'}`}
          >
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Clients</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{clientCount}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
               <Users className="w-4 h-4" />
            </div>
          </button>
        </div>

        {profile?.role === 'super_admin' && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="md:w-48 bg-white border border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm shrink-0"
          >
            <Plus className="w-6 h-6 mb-1" />
            <span className="text-xs font-bold uppercase tracking-wider">Create User</span>
          </button>
        )}
      </div>

      {showCreateModal && profile?.role === 'super_admin' && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" /> Create New User
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input type="text" required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" placeholder="john@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                  <input type="text" required value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" placeholder="Password123!" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                    <option value="client">Contractor / Client</option>
                    <option value="rep">Representative</option>
                    <option value="Residential Rep">Residential Rep</option>
                    <option value="Residential Sales">Residential Sales</option>
                    <option value="Commercial Sales">Commercial Sales</option>
                    <option value="growth_manager">Growth Manager</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                  <select value={newUser.division_id} onChange={e => setNewUser({...newUser, division_id: e.target.value})} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                    <option value="">No Division</option>
                    {divisions.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 pt-2">
                  <button type="submit" disabled={isCreatingUser} className="w-full bg-blue-600 text-white py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors">
                    {isCreatingUser ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="w-12 py-2.5 px-4 text-center"></th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">User</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Role</th>
                {roleFilter === 'client' && (
                  <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Balance</th>
                )}
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">Joined</th>
                <th className="py-2.5 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="transition-colors group hover:bg-gray-50/80 bg-white">
                  <td className="py-3 px-4 text-center">
                    {/* Checkbox placeholder for alignment */}
                  </td>
                  
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-[10px] shrink-0 border border-blue-200">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-gray-900 truncate">
                          {user.name}
                        </span>
                        <span className="text-[10px] text-gray-500 truncate">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-3 px-4">
                    <select
                      disabled={user.id === profile?.id}
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className={`text-[11px] font-bold rounded-full px-2 py-1 border shadow-sm cursor-pointer focus:ring-2 focus:ring-blue-500
                        ${user.role === 'super_admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                          user.role === 'admin' ? 'bg-red-50 text-red-700 border-red-200' : 
                          user.role === 'rep' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                          user.role === 'growth_manager' ? 'bg-green-50 text-green-700 border-green-200' :
                          user.role === 'Residential Rep' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          user.role === 'Residential Sales' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                          user.role === 'Commercial Sales' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' :
                          'bg-gray-50 text-gray-700 border-gray-200'}`}
                    >
                      <option value="client">Contractor / Client</option>
                      <option value="rep">Representative</option>
                      <option value="Residential Rep">Residential Rep</option>
                      <option value="Residential Sales">Residential Sales</option>
                      <option value="Commercial Sales">Commercial Sales</option>
                      <option value="growth_manager">Growth Manager</option>
                      <option value="admin">Admin</option>
                      {profile?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                    </select>
                  </td>
                  
                  {roleFilter === 'client' && (
                    <td className="py-3 px-4">
                      {user.role === 'client' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">
                            £{(clientBalances[user.id] || 0).toFixed(2)}
                          </span>
                          <button
                            onClick={() => {
                              setAddingBalanceId(user.id);
                              setBalanceAmount('');
                            }}
                            className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 transition-colors border border-green-200"
                            title="Add Balance"
                          >
                            <PoundSterling className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  )}
                  
                  <td className="py-3 px-4">
                    <span className="text-xs text-gray-900 font-medium">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleImpersonate(user.id, user.email)}
                        disabled={impersonatingId === user.id}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                        title="Log in as user"
                      >
                        {impersonatingId === user.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit User"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {profile?.role === 'super_admin' && user.id !== profile.id && (
                        <>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete user (can sign up again)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleBanUser(user.id, user.email)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Ban user permanently"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <UserDetailsModal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          user={selectedUser}
          onUserUpdated={() => {
            setSelectedUser(null);
            fetchUsers();
          }}
        />
      )}

      {/* Add Balance Modal */}
      {addingBalanceId && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <PoundSterling className="w-5 h-5 text-green-600" /> Add Balance
              </h3>
              <button onClick={() => setAddingBalanceId(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleAddBalanceSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Amount (£)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">£</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={balanceAmount}
                      onChange={e => setBalanceAmount(e.target.value)}
                      className="block w-full pl-7 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                      placeholder="100.00"
                    />
                  </div>
                  <p className="mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    Use positive numbers to add credit, or negative (e.g. -50) to reduce it.
                  </p>
                </div>
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setAddingBalanceId(null)}
                    className="flex-1 bg-white text-gray-700 py-2.5 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-bold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  >
                    Update Balance
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {activeTab === 'client_monitoring' && <ClientMonitoringTab />}
      {activeTab === 'lead_monitoring' && <LeadMonitoringTab />}
      {activeTab === 'pack_monitoring' && <PackMonitoringTab />}
      {activeTab === 'background' && <BackgroundTab />}
      {activeTab === 'press' && <PressCentreTab />}
      {activeTab === 'feedback' && <FeedbackTab />}
      {activeTab === 'finance' && <FinanceTab />}
      {activeTab === 'divisions' && profile?.role === 'super_admin' && <DivisionsTab />}
    </div>
  );
};