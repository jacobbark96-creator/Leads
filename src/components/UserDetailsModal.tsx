import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { X, User, Mail, Shield, Key, Building, MapPin, Briefcase, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUserUpdated: () => void;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ isOpen, onClose, user, onUserUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [loadingClient, setLoadingClient] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [updatingDirectPassword, setUpdatingDirectPassword] = useState(false);
  const [hasClientProfile, setHasClientProfile] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user.name || '',
    role: user.role || 'client',
    user_phone: user.phone || '',
    job_title: user.job_title || '',
    about: user.about || '',
    working_hours: user.working_hours || '',
    company_name: '',
    phone: '',
    other_contacts: '',
    other_contact_numbers: '',
    address: '',
    areas_covered: '',
    services_offered: '',
    internal_notes: ''
  });

  const [newDirectPassword, setNewDirectPassword] = useState('');

  useEffect(() => {
    if (isOpen && user.role === 'client') {
      fetchClientData();
    }
  }, [isOpen, user.id, user.role]);

  const fetchClientData = async () => {
    try {
      setLoadingClient(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching client data:', error);
      }
      
      if (data) {
        setHasClientProfile(true);
        setFormData(prev => ({
          ...prev,
          company_name: data.company_name || '',
          phone: data.phone || '',
          other_contacts: data.other_contacts || '',
          other_contact_numbers: data.other_contact_numbers || '',
          address: data.address || '',
          areas_covered: data.areas_covered || '',
          services_offered: data.services_offered || '',
          internal_notes: data.internal_notes || ''
        }));
      }
    } finally {
      setLoadingClient(false);
    }
  };

  if (!isOpen) return null;

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Update User profile
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: formData.name,
          role: formData.role,
          phone: formData.user_phone,
          job_title: formData.job_title,
          about: formData.about,
          working_hours: formData.working_hours,
        })
        .eq('id', user.id);

      if (userError) throw userError;

      // Update Client profile if it exists
      if (formData.role === 'client' && hasClientProfile) {
        const { error: clientError } = await supabase
          .from('clients')
          .update({
            company_name: formData.company_name,
            phone: formData.phone,
            other_contacts: formData.other_contacts,
            other_contact_numbers: formData.other_contact_numbers,
            address: formData.address,
            areas_covered: formData.areas_covered,
            services_offered: formData.services_offered,
            internal_notes: formData.internal_notes
          })
          .eq('user_id', user.id);
          
        if (clientError) throw clientError;
      }

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
      <div className={`bg-white rounded-xl shadow-xl w-full ${hasClientProfile ? 'max-w-4xl' : 'max-w-2xl'} max-h-[90vh] flex flex-col`}>
        
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
        <div className={`p-6 grid grid-cols-1 ${hasClientProfile ? 'lg:grid-cols-3' : 'md:grid-cols-2'} gap-8 overflow-y-auto`}>
          
          {/* Left Col: Details Form */}
          <div className={hasClientProfile ? 'lg:col-span-2' : ''}>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" /> Account Info
            </h3>
            
            <form id="update-user-form" onSubmit={handleUpdateDetails} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className="bg-gray-50 block w-full pl-10 py-2 sm:text-sm border-gray-300 rounded-md text-gray-500 cursor-not-allowed"
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
                    className="mt-1 block w-full py-2 px-3 sm:text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Personal Phone (WhatsApp)</label>
                  <input
                    type="text"
                    value={formData.user_phone}
                    onChange={(e) => setFormData({...formData, user_phone: e.target.value})}
                    placeholder="+447..."
                    className="mt-1 block w-full py-2 px-3 sm:text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className={hasClientProfile ? "md:col-span-2" : ""}>
                  <label className="block text-sm font-medium text-gray-700">System Role</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Shield className="h-4 w-4 text-gray-400" />
                    </div>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                      className="block w-full pl-10 py-2 sm:text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="client">Client / Contractor</option>
                      <option value="sales">Sales Staff</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Admin/Sales Specific Fields */}
              {['admin', 'super_admin', 'sales'].includes(formData.role) && (
                <>
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-bold text-gray-900 mb-4">Advisor Profile Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                        <input
                          type="text"
                          value={formData.job_title}
                          onChange={e => setFormData({ ...formData, job_title: e.target.value })}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                          placeholder="e.g. Senior Account Manager"
                        />
                      </div>
                      
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Working Hours</label>
                        <input
                          type="text"
                          value={formData.working_hours}
                          onChange={e => setFormData({ ...formData, working_hours: e.target.value })}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                          placeholder="e.g. Mon-Fri, 9:00 AM - 5:00 PM"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">About Me</label>
                        <textarea
                          value={formData.about}
                          onChange={e => setFormData({ ...formData, about: e.target.value })}
                          rows={3}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border resize-none"
                          placeholder="Write a short bio for clients to read..."
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {hasClientProfile && (
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Building className="w-4 h-4 text-gray-400" /> Client Profile Details
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                      <input type="text" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 sm:text-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 sm:text-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                      <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 sm:text-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Other Contacts</label>
                      <input type="text" value={formData.other_contacts} onChange={e => setFormData({...formData, other_contacts: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 sm:text-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Other Contact Numbers</label>
                      <input type="text" value={formData.other_contact_numbers} onChange={e => setFormData({...formData, other_contact_numbers: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 sm:text-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Areas Covered</label>
                      <textarea rows={2} value={formData.areas_covered} onChange={e => setFormData({...formData, areas_covered: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 sm:text-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Services Offered</label>
                      <textarea rows={2} value={formData.services_offered} onChange={e => setFormData({...formData, services_offered: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 sm:text-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                      <textarea rows={2} value={formData.internal_notes} onChange={e => setFormData({...formData, internal_notes: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 sm:text-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                  </div>
                </div>
              )}

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
