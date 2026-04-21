import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import { X, User, Mail, Shield, Key } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUserUpdated: () => void;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ isOpen, onClose, user, onUserUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [updatingDirectPassword, setUpdatingDirectPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user.name || '',
    role: user.role || 'client',
  });

  const [newDirectPassword, setNewDirectPassword] = useState('');

  if (!isOpen) return null;

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase
        .from('users')
        .update({
          name: formData.name,
          role: formData.role,
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('User details updated successfully');
      onUserUpdated();
    } catch (error: any) {
      toast.error('Failed to update user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDirectPassword || newDirectPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setUpdatingDirectPassword(true);
      
      const { error } = await supabase.rpc('update_user_password', {
        user_id: user.id,
        new_password: newDirectPassword
      });

      if (error) throw error;
      
      toast.success('Password updated successfully');
      setNewDirectPassword('');
    } catch (error: any) {
      toast.error('Failed to update password: ' + error.message);
    } finally {
      setUpdatingDirectPassword(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setResettingPassword(true);
      
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      toast.success(`Password reset email sent to ${user.email}`);
    } catch (error: any) {
      toast.error('Failed to send reset email: ' + error.message);
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">User Details</h2>
              <p className="text-sm text-gray-500">Manage account information and security</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Col: Details Form */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" /> Account Info
            </h3>
            
            <form id="update-user-form" onSubmit={handleUpdateDetails} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="bg-gray-50 block w-full pl-10 sm:text-sm border-gray-300 rounded-md text-gray-500 cursor-not-allowed"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Email cannot be changed here.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="mt-1 block w-full sm:text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">System Role</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="h-4 w-4 text-gray-400" />
                  </div>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="client">Client</option>
                    <option value="sales">Sales Staff</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Col: Security */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Key className="w-4 h-4 text-gray-400" /> Security
            </h3>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Manual Password Change</h4>
              <p className="text-xs text-gray-600 mb-4">
                Directly change this user's password without sending an email.
              </p>
              <form onSubmit={handleDirectPasswordChange} className="space-y-3">
                <div>
                  <input
                    type="text"
                    placeholder="Enter new password"
                    value={newDirectPassword}
                    onChange={(e) => setNewDirectPassword(e.target.value)}
                    className="block w-full sm:text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={updatingDirectPassword || !newDirectPassword}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {updatingDirectPassword ? 'Updating...' : 'Set New Password'}
                </button>
              </form>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Send Reset Link</h4>
              <p className="text-xs text-gray-600 mb-4">
                Send a secure password reset link to the user's email address.
              </p>
              <form onSubmit={handlePasswordReset}>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {resettingPassword ? 'Sending...' : 'Send Password Reset Email'}
                </button>
              </form>
            </div>

            <div className="mt-6">
               <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Account Metadata</h4>
               <dl className="space-y-2 text-sm">
                 <div className="flex justify-between">
                   <dt className="text-gray-500">User ID</dt>
                   <dd className="font-mono text-xs text-gray-900 truncate max-w-[150px]" title={user.id}>{user.id}</dd>
                 </div>
                 <div className="flex justify-between">
                   <dt className="text-gray-500">Created At</dt>
                   <dd className="text-gray-900">{new Date(user.created_at).toLocaleString()}</dd>
                 </div>
               </dl>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
