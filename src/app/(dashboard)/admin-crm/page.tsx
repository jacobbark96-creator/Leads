"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Ban, Shield, Users, Briefcase, X, Activity, BarChart2 } from 'lucide-react';
import { UserDetailsModal } from '@/components/UserDetailsModal';
import { ClientMonitoringTab } from './components/ClientMonitoringTab';
import { LeadMonitoringTab } from './components/LeadMonitoringTab';

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState<'users' | 'client_monitoring' | 'lead_monitoring'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuthStore();
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'client', password: '' });
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
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
            role: newUser.role
          }
        }
      });
      
      if (error) throw error;
      
      toast.success('User created successfully. They will need to verify their email.');
      setNewUser({ email: '', name: '', role: 'client', password: '' });
      setShowCreateModal(false);
      fetchUsers();
    } catch (error: any) {
      toast.error('Failed to create user: ' + error.message);
    } finally {
      setIsCreatingUser(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  const adminCount = users.filter(u => u.role === 'admin' || u.role === 'super_admin').length;
  const repCount = users.filter(u => u.role === 'rep').length;
  const clientCount = users.filter(u => u.role === 'client').length;

  const filteredUsers = users.filter(u => {
    if (roleFilter === 'all') return true;
    if (roleFilter === 'admin') return u.role === 'admin' || u.role === 'super_admin';
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
      </div>

      {activeTab === 'users' && (
        <>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 grid grid-cols-3 gap-4">
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
                    <option value="client">Client / Contractor</option>
                    <option value="rep">Representative</option>
                    <option value="sales">Sales Staff</option>
                    <option value="admin">Admin</option>
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
                          user.role === 'sales' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                          user.role === 'rep' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                          'bg-gray-50 text-gray-700 border-gray-200'}`}
                    >
                      <option value="client">Contractor / Client</option>
                      <option value="rep">Representative</option>
                      <option value="sales">Sales Staff</option>
                      <option value="admin">Admin</option>
                      {profile?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                    </select>
                  </td>
                  
                  <td className="py-3 px-4">
                    <span className="text-xs text-gray-900 font-medium">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
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
        </>
      )}

      {activeTab === 'client_monitoring' && <ClientMonitoringTab />}
      {activeTab === 'lead_monitoring' && <LeadMonitoringTab />}
    </div>
  );
};