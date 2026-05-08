"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { User, Phone, Mail, Building, MapPin, Briefcase, Plus, Users, ShieldCheck, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Client } from '../../../types';
import { MultiServiceArea } from '../../../components/MultiServiceArea';

export default function MyOpenlead() {
  const { user, profile } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<Client | null>(null);
  const [coachName, setCoachName] = useState<string | null>(null);
  const [coachPhone, setCoachPhone] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    phone: '',
    services_offered: '',
    property_type_preference: 'both' as 'residential' | 'commercial' | 'both',
    service_areas: [] as any[],
    address: '',
    other_contacts: '',
    other_contact_numbers: ''
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Check URL for purchase success parameter
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('purchase_success')) {
        toast.success('Lead successfully purchased! You can now view all details in your Dashboard.');
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    if (profile?.id) {
      fetchMyData();
    }
  }, [profile?.id]);

  const fetchMyData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Client Profile
      let { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', profile!.id)
        .single();

      if (clientError) {
        if (clientError.code === 'PGRST116') {
          // If no client profile exists yet (new signup), create one
          const meta = user?.user_metadata || {};
          const { data: newClient, error: insertError } = await supabase
            .from('clients')
            .insert({
              user_id: profile!.id,
              company_name: meta.company_name || '',
              contact_name: meta.full_name || profile!.name || '',
              phone: meta.phone || profile!.phone || '',
              address: meta.address || '',
              other_contacts: meta.other_contacts || '',
              other_contact_numbers: meta.other_contact_numbers || '',
              is_profile_complete: false
            })
            .select()
            .single();

          if (insertError) {
            if (insertError.code === '23505') {
              // Unique constraint violation - another tab/request created it simultaneously
              const { data: existingClient, error: refetchError } = await supabase
                .from('clients')
                .select('*')
                .eq('user_id', profile!.id)
                .single();
              if (refetchError) throw refetchError;
              client = existingClient;
            } else {
              throw insertError;
            }
          } else {
            client = newClient;

            // Also create the matching contractor record
            if (newClient) {
              await supabase.from('contractors').insert({
                client_id: newClient.id,
                company_name: meta.company_name || '',
                contact_name: meta.full_name || profile!.name || '',
                phone: meta.phone || profile!.phone || '',
                status: 'onboarded'
              });
            }
          }
        } else {
          throw clientError;
        }
      }
      
      setClientData(client);
      setFormData({
          company_name: client.company_name || '',
          contact_name: client.contact_name || '',
          phone: client.phone || '',
          services_offered: client.services_offered || '',
          property_type_preference: client.property_type_preference || 'both',
          service_areas: client.service_areas || [],
          address: client.address || '',
          other_contacts: client.other_contacts || '',
          other_contact_numbers: client.other_contact_numbers || ''
        });

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const tokens = (client.services_offered || '').split(',').map((t: string) => t.trim()).filter(Boolean);
      const initialIds = tokens.filter((t: string) => uuidRegex.test(t));
      setSelectedCategoryIds(initialIds);

      // 2. Fetch Coach Details
      if (client.assigned_to) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          if (token) {
            const res = await fetch('/api/advisor', {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            const json = await res.json();
            if (res.ok && json.advisor) {
              setCoachName(json.advisor.name);
              setCoachPhone(json.advisor.phone || '+447123456789');
            }
          }
        } catch {
          // keep blank
        }
      }

      // 3. Fetch Categories for Dropdown
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
        
      if (!catError && catData) {
        setCategories(catData);

        if (initialIds.length === 0 && tokens.length > 0) {
          const byName = new Map(catData.map((c: any) => [String(c.name || '').toLowerCase(), c.id]));
          const mappedIds = tokens
            .map((t: string) => byName.get(t.toLowerCase()))
            .filter(Boolean) as string[];
          setSelectedCategoryIds(Array.from(new Set(mappedIds)));
        }
      }

    } catch (err: any) {
      toast.error('Failed to load profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientData) return;
    
    try {
      setSaving(true);
      if (formData.service_areas.length === 0) {
        toast.error('Please add at least one service area using the Add Service Area button.');
        setSaving(false);
        return;
      }

      if (selectedCategoryIds.length === 0) {
        toast.error('Please select at least one service offered.');
        setSaving(false);
        return;
      }

      // Check if profile is completely filled
      const isComplete = formData.service_areas.length > 0 && 
                         !!formData.company_name && 
                         !!formData.contact_name && 
                         !!formData.phone && 
                         !!formData.address &&
                         !!formData.other_contacts &&
                         !!formData.other_contact_numbers &&
                         selectedCategoryIds.length > 0;

      const { data: updatedClient, error } = await supabase
        .from('clients')
        .update({
          company_name: formData.company_name,
          contact_name: formData.contact_name,
          phone: formData.phone,
          address: formData.address,
          other_contacts: formData.other_contacts,
          other_contact_numbers: formData.other_contact_numbers,
          services_offered: selectedCategoryIds.join(', '),
          property_type_preference: formData.property_type_preference,
          service_areas: formData.service_areas,
          is_profile_complete: isComplete
        })
        .eq('id', clientData.id)
        .select()
        .single();

      if (error) throw error;
      
      if (!updatedClient) {
        throw new Error('Update failed to apply to the database.');
      }
      
      // Sync to user profile table
      await supabase
        .from('users')
        .update({ name: formData.contact_name, phone: formData.phone })
        .eq('id', profile!.id);

      // Sync to contractor CRM
      const { error: contractorError } = await supabase
        .from('contractors')
        .update({
          company_name: formData.company_name,
          contact_name: formData.contact_name,
          phone: formData.phone,
          service_areas: formData.service_areas
        })
        .eq('client_id', clientData.id);
        
      if (contractorError) {
         console.error("Failed to update contractor table:", contractorError);
      }

      toast.success('Details updated successfully!');
      
      if (isComplete) {
        // Only redirect to dashboard if profile is fully complete
        window.location.href = '/client-portal';
      } else {
        // Reload if not complete so ProtectedRoute logic handles it
        window.location.reload();
      }
    } catch (err: any) {
      toast.error('Failed to update details: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  const isCompleteProfile = clientData?.is_profile_complete;

  return (
    <ProtectedRoute allowedRoles={['client']}>
      <div className="space-y-8 max-w-5xl mx-auto">
        
        {isCompleteProfile && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 shadow-sm rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700 font-medium">
                  Your profile is fully set up. You can view your selections below, but they are read-only. 
                  Please contact your account manager to make any changes or additions to your service areas or categories.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Coach Section */}
        {coachName && (
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl shadow-lg p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30 shrink-0">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-blue-100 font-medium uppercase tracking-wider text-sm mb-1">Your Personal Openlead Coach is</p>
                <h2 className="text-2xl sm:text-3xl font-bold">{coachName}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-lg font-medium">{coachPhone}</span>
                  <span className="text-blue-200 text-sm">(WhatsApp only)</span>
                </div>
              </div>
            </div>
            <a 
              href={`https://wa.me/${coachPhone?.replace(/[^0-9]/g, '')}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-bold rounded-xl text-blue-700 bg-white hover:bg-blue-50 shadow-md transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 mr-2 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              Message on WhatsApp
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Company Details</h2>
              <p className="text-sm text-gray-500 mt-1">Update your company information and contact details.</p>
            </div>
            
            <form onSubmit={handleUpdate} className="p-6 sm:p-8 space-y-6">
              <div className="pb-6 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Target Property Type</h3>
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-medium text-gray-700">What types of properties are you looking for?</label>
                  <div className="flex p-1 bg-gray-100 rounded-lg max-w-md relative">
                    {/* Highlight background slider */}
                    <div 
                      className={`absolute top-1 bottom-1 w-1/3 bg-white rounded-md shadow-sm transition-all duration-300 ease-in-out`}
                      style={{ 
                        left: formData.property_type_preference === 'residential' ? '0.25rem' 
                            : formData.property_type_preference === 'commercial' ? 'calc(33.333% + 0.125rem)' 
                            : 'calc(66.666%)',
                        width: 'calc(33.333% - 0.25rem)'
                      }}
                    />
                    
                    <button
                      type="button"
                      disabled={isCompleteProfile}
                      onClick={() => setFormData({ ...formData, property_type_preference: 'residential' })}
                      className={`relative z-10 flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${formData.property_type_preference === 'residential' ? 'text-blue-700' : 'text-gray-500 hover:text-gray-700'} ${isCompleteProfile ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                      Residential
                    </button>
                    <button
                      type="button"
                      disabled={isCompleteProfile}
                      onClick={() => setFormData({ ...formData, property_type_preference: 'commercial' })}
                      className={`relative z-10 flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${formData.property_type_preference === 'commercial' ? 'text-blue-700' : 'text-gray-500 hover:text-gray-700'} ${isCompleteProfile ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                      Commercial
                    </button>
                    <button
                      type="button"
                      disabled={isCompleteProfile}
                      onClick={() => setFormData({ ...formData, property_type_preference: 'both' })}
                      className={`relative z-10 flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${formData.property_type_preference === 'both' ? 'text-blue-700' : 'text-gray-500 hover:text-gray-700'} ${isCompleteProfile ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                      Both
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">This will automatically filter the marketplace to only show leads matching your preference.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building className="h-4 w-4 text-gray-400" />
                    </div>
                    <input type="text" required disabled={isCompleteProfile} value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} className={`pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${isCompleteProfile ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <input type="text" required disabled={isCompleteProfile} value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} className={`pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${isCompleteProfile ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-gray-400" />
                    </div>
                    <input type="tel" required disabled={isCompleteProfile} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={`pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${isCompleteProfile ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-4 w-4 text-gray-400" />
                    </div>
                    <input type="text" required disabled={isCompleteProfile} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className={`pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${isCompleteProfile ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`} placeholder="123 Business Rd, London" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-gray-400" />
                    </div>
                    <input type="email" disabled value={profile?.email || ''} className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm bg-gray-50 text-gray-500 sm:text-sm cursor-not-allowed" />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Email cannot be changed directly.</p>
                </div>
                
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Other Contacts</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Users className="h-4 w-4 text-gray-400" />
                      </div>
                      <input type="text" required disabled={isCompleteProfile} value={formData.other_contacts} onChange={e => setFormData({...formData, other_contacts: e.target.value})} className={`pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${isCompleteProfile ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`} placeholder="Jane Smith" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Other Contact Numbers</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-4 w-4 text-gray-400" />
                      </div>
                      <input type="tel" required disabled={isCompleteProfile} value={formData.other_contact_numbers} onChange={e => setFormData({...formData, other_contact_numbers: e.target.value})} className={`pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${isCompleteProfile ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`} placeholder="07712345678" />
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Areas</label>
                  <p className="text-xs font-semibold text-openlead-blue mb-1">Make sure your first service area is your office/home/yard address.</p>
                  <p className="text-xs text-gray-500 mb-3">Define the areas you cover. You will only see leads within these geofenced locations.</p>
                  <div className={isCompleteProfile ? 'pointer-events-none opacity-80' : ''}>
                    <MultiServiceArea 
                      areas={formData.service_areas} 
                      onChange={(areas) => setFormData({...formData, service_areas: areas})} 
                      allowNational={profile?.role === 'super_admin' || profile?.role === 'admin'}
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Services Offered</label>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 mb-3">
                      <Briefcase className="h-4 w-4 text-gray-400" />
                      Select all categories you want leads for
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {categories.map((cat) => (
                        <label key={cat.id} className={`flex items-center gap-2 ${isCompleteProfile ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                          <input
                            type="checkbox"
                            disabled={isCompleteProfile}
                            checked={selectedCategoryIds.includes(cat.id)}
                            onChange={() => {
                              setSelectedCategoryIds((current) =>
                                current.includes(cat.id)
                                  ? current.filter((id: string) => id !== cat.id)
                                  : [...current, cat.id]
                              );
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 disabled:bg-gray-200"
                          />
                          <span className="text-sm text-gray-700">{cat.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">You can choose more than one category.</p>
                </div>
              </div>

              {!isCompleteProfile && (
                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Child Accounts Upsell Module */}
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-700 text-white flex flex-col">
            <div className="p-6 sm:p-8 flex-1">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Add Child Accounts</h3>
              <div className="text-3xl font-black text-white mb-6">
                £2 <span className="text-base font-normal text-slate-400">/ month per account</span>
              </div>
              
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Give your sales team their own logins. Keep your master account secure while allowing your reps to access leads, view the calendar, and manage their pipeline.
              </p>

              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <ShieldCheck className="w-5 h-5 text-blue-400 mr-2 shrink-0" />
                  <span className="text-sm text-slate-200">Secure individual logins for staff</span>
                </li>
                <li className="flex items-start">
                  <ShieldCheck className="w-5 h-5 text-blue-400 mr-2 shrink-0" />
                  <span className="text-sm text-slate-200">No shared master passwords</span>
                </li>
                <li className="flex items-start">
                  <ShieldCheck className="w-5 h-5 text-blue-400 mr-2 shrink-0" />
                  <span className="text-sm text-slate-200">Track which rep is handling which lead</span>
                </li>
              </ul>
            </div>
            
            <div className="p-6 bg-slate-900/50 border-t border-slate-700">
              <button
                onClick={() => toast.success('Please contact your Openlead coach to set up child accounts.')}
                className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-bold rounded-xl text-slate-900 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 shadow-lg transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" /> Request Child Account
              </button>
            </div>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
