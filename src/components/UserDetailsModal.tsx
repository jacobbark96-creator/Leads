import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { X, User, Mail, Shield, Key, Building, Upload, Trash2, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';

const libraries: "places"[] = ['places'];

import { MultiServiceArea } from './MultiServiceArea';

type CategoryOption = { id: string; name: string };
type AdvisorOption = { id: string; name: string };

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
  const [advisorOptions, setAdvisorOptions] = useState<AdvisorOption[]>([]);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>('');
  const [originalAssignedTo, setOriginalAssignedTo] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [selectedServiceCategoryIds, setSelectedServiceCategoryIds] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string>(user.avatar_url || '');
  const [avatarUploading, setAvatarUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user.name || '',
    role: user.role || 'client',
    user_phone: user.phone || '',
    job_title: user.job_title || '',
    about: user.about || '',
    working_hours: user.working_hours || '',
    permissions: user.permissions || [],
    company_name: '',
    phone: '',
    other_contacts: '',
    other_contact_numbers: '',
    address: '',
    areas_covered: '',
    service_areas: [] as any[],
    services_offered: '',
    internal_notes: ''
  });

  const [newDirectPassword, setNewDirectPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchAdvisorOptions();
      fetchCategoryOptions();
      setAvatarUrl(user.avatar_url || '');
    }
    if (isOpen && user.role === 'client') {
      fetchClientData();
    }
  }, [isOpen, user.id, user.role]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    try {
      setAvatarUploading(true);
      const ext = file.name.split('.').pop() || 'png';
      const path = `avatars/${user.id}/profile.${ext}`;

      const { error: uploadError } = await supabase
        .storage
        .from('profile_photos')
        .upload(path, file, { upsert: true, cacheControl: '3600' });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('profile_photos').getPublicUrl(path);
      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success('Profile photo updated');
      onUserUpdated();
    } catch (error: any) {
      toast.error('Failed to upload photo: ' + error.message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    try {
      setAvatarUploading(true);
      const { error } = await supabase
        .from('users')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (error) throw error;

      setAvatarUrl('');
      toast.success('Profile photo removed');
      onUserUpdated();
    } catch (error: any) {
      toast.error('Failed to remove photo: ' + error.message);
    } finally {
      setAvatarUploading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (!hasClientProfile) return;
    if (!formData.services_offered) return;
    if (categoryOptions.length === 0) return;

    setSelectedServiceCategoryIds((current) => {
      if (current.length > 0) return current;
      return parseServicesOfferedToIds(formData.services_offered, categoryOptions);
    });
  }, [isOpen, hasClientProfile, formData.services_offered, categoryOptions.length]);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const onLoadAutocomplete = (autoC: google.maps.places.Autocomplete) => setAutocomplete(autoC);

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place) {
        let finalAddress = place.formatted_address || place.name || '';
        if (place.name && place.formatted_address && !place.formatted_address.includes(place.name)) {
          finalAddress = `${place.name}, ${place.formatted_address}`;
        }

        setFormData(prev => ({ 
          ...prev, 
          address: finalAddress || prev.address
        }));
      }
    }
  };

  const fetchAdvisorOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'super_admin')
        .order('name');

      if (error) throw error;
      setAdvisorOptions((data || []).map((u: any) => ({ id: u.id, name: u.name })));
    } catch (error: any) {
      console.error('Failed to load advisors:', error);
    }
  };

  const fetchCategoryOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategoryOptions((data || []).map((c: any) => ({ id: c.id, name: c.name })));
    } catch (error: any) {
      console.error('Failed to load categories:', error);
    }
  };

  const parseServicesOfferedToIds = (raw: string, categories: CategoryOption[]) => {
    const tokens = (raw || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

    const ids: string[] = [];
    for (const token of tokens) {
      if (uuidRegex.test(token)) {
        ids.push(token);
        continue;
      }
      const mapped = byName.get(token.toLowerCase());
      if (mapped) ids.push(mapped);
    }
    return Array.from(new Set(ids));
  };

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
        setSelectedAdvisorId(data.assigned_to || '');
        setOriginalAssignedTo(data.assigned_to || null);
        setFormData(prev => ({
          ...prev,
          company_name: data.company_name || '',
          phone: data.phone || '',
          other_contacts: data.other_contacts || '',
          other_contact_numbers: data.other_contact_numbers || '',
          address: data.address || '',
          areas_covered: data.areas_covered || '',
          service_areas: Array.isArray(data.service_areas) ? data.service_areas : [],
          services_offered: data.services_offered || '',
          internal_notes: data.internal_notes || ''
        }));

        setSelectedServiceCategoryIds(parseServicesOfferedToIds(data.services_offered || '', categoryOptions));
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
          permissions: formData.permissions
        })
        .eq('id', user.id);

      if (userError) throw userError;

      // Update Client profile if it exists
      if (formData.role === 'client' && hasClientProfile) {
        const { data: updatedClient, error: clientError } = await supabase
          .from('clients')
          .update({
            company_name: formData.company_name,
            phone: formData.phone,
            other_contacts: formData.other_contacts,
            other_contact_numbers: formData.other_contact_numbers,
            address: formData.address,
            areas_covered: formData.areas_covered,
            service_areas: formData.service_areas,
            services_offered: selectedServiceCategoryIds.join(', '),
            assigned_to: selectedAdvisorId || null,
            internal_notes: formData.internal_notes
          })
          .eq('user_id', user.id)
          .select('id')
          .single();
          
        if (clientError) throw clientError;

        // Keep contractor record in sync
        if (updatedClient) {
          const { error: contractorError } = await supabase
            .from('contractors')
            .update({
              company_name: formData.company_name,
              contact_name: formData.name, // Keep contact name synced with user name
              phone: formData.phone,
              service_areas: formData.service_areas
            })
            .eq('client_id', updatedClient.id);
            
          if (contractorError) {
             console.error("Failed to sync contractor table:", contractorError);
          }
        }

        // Check if advisor assignment changed
        const newAssignedTo = selectedAdvisorId || null;
        if (newAssignedTo && newAssignedTo !== originalAssignedTo) {
          const isNewAssignment = !originalAssignedTo;
          try {
            const res = await fetch('/api/send-advisor-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clientEmail: user.email,
                clientName: formData.name || user.name || 'Client',
                advisorId: newAssignedTo,
                isNewAssignment
              })
            });
            if (!res.ok) {
              const errorText = await res.text();
              console.error('Failed to trigger advisor email', errorText);
              toast.error('Failed to send advisor email: ' + errorText);
            } else {
              setOriginalAssignedTo(newAssignedTo);
              toast.success(isNewAssignment ? 'Welcome email sent!' : 'Advisor update email sent!');
            }
          } catch (err: any) {
            console.error('Failed to trigger advisor email', err);
            toast.error('Failed to trigger advisor email: ' + err.message);
          }
        }
      }

      toast.success('User details updated successfully');
      onUserUpdated();
    } catch (error: any) {
      toast.error('Failed to update user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleServiceCategory = (categoryId: string) => {
    setSelectedServiceCategoryIds((current) =>
      current.includes(categoryId) ? current.filter((id) => id !== categoryId) : [...current, categoryId]
    );
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
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                User Details
                {user.role === 'client' && user.is_approved === false && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                    Pending Approval
                  </span>
                )}
              </h2>
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
                      <option value="rep">Representative</option>
                      <option value="sales">Sales Staff</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>
                </div>
              </div>

              {formData.role === 'rep' && (
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-bold text-gray-900 mb-3">Rep Accessible Tabs</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { 
                        id: 'sales-crm', 
                        label: 'Sales CRM',
                        subTabs: [
                          { id: 'sales-crm/fresh', label: 'Fresh Leads' },
                          { id: 'sales-crm/qualified', label: 'Qualified Leads' },
                          { id: 'sales-crm/import', label: 'Import Leads' }
                        ]
                      },
                      { 
                        id: 'contractor-crm', 
                        label: 'Contractor CRM',
                        subTabs: [
                          { id: 'contractor-crm/potential', label: 'Potential Contractors' },
                          { id: 'contractor-crm/onboarded', label: 'Onboarded Contractors' },
                          { id: 'contractor-crm/marketplace', label: 'Marketplace' },
                          { id: 'contractor-crm/import', label: 'Import Leads' }
                        ]
                      },
                      { 
                        id: 'admin-crm', 
                        label: 'Admin CRM',
                        subTabs: [
                          { id: 'admin-crm/users', label: 'Users' },
                          { id: 'admin-crm/categories', label: 'Categories' },
                          { id: 'admin-crm/discounts', label: 'Discounts' }
                        ]
                      },
                      { 
                        id: 'intranet', 
                        label: 'Intranet',
                        subTabs: [
                          { id: 'intranet/pricing', label: 'Pricing Matrix' },
                          { id: 'intranet/clients', label: 'Client Search' },
                          { id: 'intranet/grants', label: 'Grants Info' },
                          { id: 'intranet/tracker', label: 'Tracker' },
                          { id: 'intranet/resources', label: 'Resources' }
                        ]
                      },
                      { id: 'map', label: 'Map (Global)' },
                      { id: 'staff', label: 'Staff Hub (Dashboard)' }
                    ].map(section => (
                      <div key={section.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <label className="flex items-center font-bold text-sm text-gray-900 mb-2">
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(section.id)}
                            onChange={(e) => {
                              let newPerms = [...formData.permissions];
                              if (e.target.checked) {
                                newPerms.push(section.id);
                                // auto-check all subtabs
                                section.subTabs?.forEach(sub => {
                                  if (!newPerms.includes(sub.id)) newPerms.push(sub.id);
                                });
                              } else {
                                newPerms = newPerms.filter(p => p !== section.id);
                                // auto-uncheck all subtabs
                                section.subTabs?.forEach(sub => {
                                  newPerms = newPerms.filter(p => p !== sub.id);
                                });
                              }
                              setFormData({ ...formData, permissions: newPerms });
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                          />
                          {section.label}
                        </label>
                        
                        {section.subTabs && (
                          <div className="ml-6 space-y-1.5 border-l-2 border-gray-200 pl-3">
                            {section.subTabs.map(sub => (
                              <label key={sub.id} className="flex items-center text-xs text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={formData.permissions.includes(sub.id)}
                                  onChange={(e) => {
                                    let newPerms = [...formData.permissions];
                                    if (e.target.checked) {
                                      newPerms.push(sub.id);
                                      // if a sub is checked, ensure parent is checked
                                      if (!newPerms.includes(section.id)) newPerms.push(section.id);
                                    } else {
                                      newPerms = newPerms.filter(p => p !== sub.id);
                                    }
                                    setFormData({ ...formData, permissions: newPerms });
                                  }}
                                  className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                                />
                                {sub.label}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin/Sales Specific Fields */}
              {['admin', 'super_admin', 'sales', 'rep'].includes(formData.role) && (
                <>
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-bold text-gray-900 mb-4">Advisor Profile Details</h4>

                    {formData.role === 'super_admin' && (
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo (Client Visible)</label>
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-7 h-7 text-gray-400" />
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-colors ${avatarUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'} border-gray-200 bg-white text-gray-800`}>
                              <Upload className="w-4 h-4" />
                              Upload
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarUpload}
                                disabled={avatarUploading}
                              />
                            </label>

                            {avatarUrl && (
                              <button
                                type="button"
                                onClick={handleAvatarRemove}
                                disabled={avatarUploading}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="w-4 h-4" />
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Recommended: square image, at least 300×300.</p>
                      </div>
                    )}

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
                    <Building className="w-4 h-4 text-gray-400" /> Contractor Profile Details
                  </h3>

                  {loadingClient && (
                    <div className="mb-4 text-sm text-gray-500 font-medium">Loading client profile...</div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                      <input type="text" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 sm:text-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                      <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 sm:text-sm focus:ring-blue-500 focus:border-blue-500" />
                      <p className="text-xs text-gray-500 mt-1">This will also update the user's Full Name.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 sm:text-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                      <div className="relative" key={loadingClient ? 'loading' : 'loaded'}>
                        {isLoaded && !loadError ? (
                          <Autocomplete
                            onLoad={onLoadAutocomplete}
                            onPlaceChanged={onPlaceChanged}
                            options={{
                              types: [],
                              componentRestrictions: { country: "gb" },
                              fields: ['formatted_address', 'name']
                            }}
                          >
                            <input
                              type="text"
                              value={formData.address}
                              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                              placeholder="Search address..."
                              className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 sm:text-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                          </Autocomplete>
                        ) : (
                          <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                            placeholder={loadError ? "Error loading maps" : "Loading map..."}
                            className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 sm:text-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        )}
                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Other Contacts</label>
                      <input type="text" value={formData.other_contacts} onChange={e => setFormData({...formData, other_contacts: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 sm:text-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Other Contact Numbers</label>
                      <input type="text" value={formData.other_contact_numbers} onChange={e => setFormData({...formData, other_contact_numbers: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 sm:text-sm focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service Areas (Geofenced)</label>
                      <p className="text-xs text-gray-500 mb-3">Define the exact areas this client covers. They will only receive leads within these locations.</p>
                      <MultiServiceArea 
                        areas={formData.service_areas} 
                        onChange={(areas) => setFormData({...formData, service_areas: areas})} 
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Legacy Areas Covered (Text)</label>
                      <textarea rows={2} value={formData.areas_covered} onChange={e => setFormData({...formData, areas_covered: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 sm:text-sm focus:ring-blue-500 focus:border-blue-500" placeholder="E.g. London, South East" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Personal Advisor (Super Admin)</label>
                      <select
                        value={selectedAdvisorId}
                        onChange={(e) => setSelectedAdvisorId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 sm:text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <option value="">No advisor assigned</option>
                        {advisorOptions.map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Only Super Admins can be selected as personal advisors.</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Services Offered (Categories)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        {categoryOptions.length === 0 ? (
                          <p className="text-sm text-gray-500">Loading categories...</p>
                        ) : (
                          categoryOptions.map((cat) => (
                            <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedServiceCategoryIds.includes(cat.id)}
                                onChange={() => toggleServiceCategory(cat.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                              />
                              <span className="text-sm text-gray-700">{cat.name}</span>
                            </label>
                          ))
                        )}
                      </div>
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

            {user.role === 'client' && user.is_approved === false && (
              <div className="mt-8 bg-amber-50 p-4 rounded-xl border border-amber-200">
                <h4 className="text-sm font-bold text-amber-900 mb-2">Pending Approval</h4>
                <p className="text-xs text-amber-700 mb-4">
                  This user has signed up but cannot access the marketplace until their account is approved.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const { error } = await supabase
                        .from('users')
                        .update({ is_approved: true })
                        .eq('id', user.id);
                      if (error) throw error;
                      toast.success('User account approved successfully');
                      onUserUpdated();
                    } catch (err: any) {
                      toast.error('Failed to approve account: ' + err.message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  Approve Account
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
