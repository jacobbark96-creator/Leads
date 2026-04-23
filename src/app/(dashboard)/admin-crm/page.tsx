"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Ban } from 'lucide-react';
import { UserDetailsModal } from '@/components/UserDetailsModal';

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuthStore();
  const [isCreatingUser, setIsCreatingUser] = useState(false);
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-medium text-gray-900">System Users</h2>
          <p className="text-sm text-gray-500 mt-1">Manage user roles and access</p>
        </div>
      </div>

      {profile?.role === 'super_admin' && (
        <div className="bg-white shadow rounded-lg border border-gray-200 mb-8 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-slate-50">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" /> Create New User
            </h3>
          </div>
          <div className="p-6">
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 items-end">
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
                  <option value="client">Client</option>
                  <option value="sales">Sales Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <button type="submit" disabled={isCreatingUser} className="w-full bg-blue-600 text-white py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                  {isCreatingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col">
        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Edit</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          disabled={user.id === profile?.id}
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                          <option value="client">Client</option>
                          <option value="sales">Sales Staff</option>
                          <option value="admin">Admin</option>
                          {profile?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                          >
                            <Edit className="w-4 h-4" /> Edit User
                          </button>
                          {profile?.role === 'super_admin' && user.id !== profile.id && (
                            <>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-500 hover:text-red-700 inline-flex items-center gap-1"
                                title="Delete user (can sign up again)"
                              >
                                <Trash2 className="w-4 h-4" /> Delete
                              </button>
                              <button
                                onClick={() => handleBanUser(user.id, user.email)}
                                className="text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
                                title="Ban user permanently"
                              >
                                <Ban className="w-4 h-4" /> Ban
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
    </div>
  );
};