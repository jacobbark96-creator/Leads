import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadAdded: (lead?: any) => void;
  isContractor?: boolean;
  editData?: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    company: string | null;
    location?: string | null;
    other_contacts?: string | null;
    other_contact_numbers?: string | null;
  } | null;
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({ isOpen, onClose, onLeadAdded, isContractor = false, editData = null }) => {
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [profileMode, setProfileMode] = useState(false);
  const [clientsWithoutContractor, setClientsWithoutContractor] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [aiText, setAiText] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    location: '',
    other_contacts: '',
    other_contact_numbers: '',
  });

  React.useEffect(() => {
    if (isOpen && editData) {
      setFormData({
        name: editData.name || '',
        phone: editData.phone || '',
        email: editData.email || '',
        company: editData.company || '',
        location: editData.location || '',
        other_contacts: editData.other_contacts || '',
        other_contact_numbers: editData.other_contact_numbers || '',
      });
    } else if (isOpen) {
      setFormData({
        name: '',
        phone: '',
        email: '',
        company: '',
        location: '',
        other_contacts: '',
        other_contact_numbers: '',
      });
      setAiMode(false);
      setProfileMode(false);
    }
  }, [isOpen, editData]);

  React.useEffect(() => {
    if (isOpen && profileMode) {
      fetchClientsWithoutContractor();
    }
  }, [isOpen, profileMode]);

  const fetchClientsWithoutContractor = async () => {
    setLoadingClients(true);
    try {
      // Fetch all clients
      const { data: clients } = await supabase.from('clients').select('*');
      // Fetch all contractors to see which client_ids are used
      const { data: contractors } = await supabase.from('contractors').select('client_id');
      
      const usedClientIds = new Set(contractors?.map(c => c.client_id).filter(Boolean));
      const available = clients?.filter(c => !usedClientIds.has(c.id)) || [];
      
      const { data: users } = await supabase.from('users').select('id, email');
      const emailMap = new Map(users?.map(u => [u.id, u.email]));
      
      const enriched = available.map(c => ({
        ...c,
        email: emailMap.get(c.user_id) || ''
      }));
      
      setClientsWithoutContractor(enriched);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingClients(false);
    }
  };

  const handleAddFromProfile = async (client: any) => {
    if (!window.confirm(`Are you sure you want to create a contractor profile for ${client.company_name || client.contact_name}?`)) {
      return;
    }

    try {
      setLoading(true);
      const insertPayload = {
        name: client.contact_name || client.company_name || 'Unknown',
        contact_name: client.contact_name || 'Unknown',
        company_name: client.company_name || null,
        company: client.company_name || null,
        phone: client.phone || '',
        email: client.email || null,
        location: client.address || null,
        other_contacts: client.other_contacts || null,
        other_contact_numbers: client.other_contact_numbers || null,
        client_id: client.id,
        status: 'onboarded'
      };

      const { data, error } = await supabase
        .from('contractors')
        .insert([insertPayload])
        .select()
        .single();

      if (error) throw error;
      toast.success('Contractor added from profile successfully');
      onLeadAdded(data);
      onClose();
    } catch (e: any) {
      toast.error('Failed to add contractor: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error('Name and phone are required');
      return;
    }

    try {
      setLoading(true);
      const table = isContractor ? 'contractors' : 'leads';
      
      if (editData) {
        const updatePayload: any = {
          name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          company: formData.company || null,
          location: formData.location || null,
          other_contacts: formData.other_contacts || null,
          other_contact_numbers: formData.other_contact_numbers || null,
        };
        
        if (isContractor) {
          updatePayload.contact_name = formData.name;
          updatePayload.company_name = formData.company || null;
          
          // Sync with clients table if this contractor is onboarded
          const { data: existingContractor } = await supabase
            .from('contractors')
            .select('client_id')
            .eq('id', editData.id)
            .single();
            
          if (existingContractor?.client_id) {
             await supabase.from('clients').update({
               contact_name: formData.name,
               company_name: formData.company || null,
               address: formData.location || null,
               other_contacts: formData.other_contacts || null,
               other_contact_numbers: formData.other_contact_numbers || null,
               phone: formData.phone
             }).eq('id', existingContractor.client_id);
          }
        }

        const { error } = await supabase
          .from(table)
          .update(updatePayload)
          .eq('id', editData.id);

        if (error) throw error;
        toast.success(`${isContractor ? 'Contractor' : 'Lead'} updated successfully`);
        onLeadAdded({ ...editData, ...updatePayload });
        onClose();
      } else {
        const status = isContractor ? 'fresh' : 'fresh';
        const insertPayload: any = {
          name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          company: formData.company || null,
          location: formData.location || null,
          other_contacts: formData.other_contacts || null,
          other_contact_numbers: formData.other_contact_numbers || null,
          status: status
        };

        if (isContractor) {
          insertPayload.contact_name = formData.name;
          insertPayload.company_name = formData.company || null;
        }

        const { data, error } = await supabase
          .from(table)
          .insert([insertPayload])
          .select()
          .single();

        if (error) throw error;

        toast.success(`${isContractor ? 'Contractor' : 'Lead'} added successfully`);
        
        // Reset form before closing to prevent stale state on next open
        setFormData({
          name: '',
          phone: '',
          email: '',
          company: '',
          location: '',
          other_contacts: '',
          other_contact_numbers: '',
        });
        
        onLeadAdded(data);
        onClose();
      }
    } catch (error: any) {
      toast.error('Failed to add: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAiParse = async () => {
    if (!aiText.trim()) {
      toast.error('Please paste a write-up first');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/parse-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to parse text');

      const parsed = json.data;

      // Automatically create the lead in the DB so it can be qualified
      const insertPayload: any = {
        name: parsed.name || 'Unknown',
        company: parsed.company || null,
        phone: parsed.phone || '00000000000',
        email: parsed.email || null,
        location: parsed.location || null,
        job_title: parsed.job_title || null,
        status: 'fresh',
        // Also save the extracted qualification data
        timeframe: parsed.timeframe || null,
        availability: parsed.timeframe || null,
        monthly_spend: parsed.monthly_spend ? Number(parsed.monthly_spend.replace(/[^0-9.]/g, '')) : null,
        property_ownership: parsed.property_ownership || null,
        electrical_supply: parsed.electrical_supply || null,
        solar_location: parsed.solar_location || null,
        roof_material: parsed.roof_material || null,
        roof_condition: parsed.roof_condition || null,
        cover_skylights: parsed.cover_skylights || false,
        ground_mount: parsed.ground_mount || false,
        payment_options: parsed.payment_options || null,
        qualification_notes: parsed.qualification_notes || null
      };

      const { data, error } = await supabase
        .from('leads')
        .insert([insertPayload])
        .select()
        .single();

      if (error) throw error;

      toast.success('Lead extracted successfully');
      
      setAiText('');
      setAiMode(false);
      onLeadAdded(data);
      onClose();
    } catch (error: any) {
      toast.error('AI Parsing failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                {editData ? `Edit ${isContractor ? 'Contractor' : 'Lead'}` : `Add New ${isContractor ? 'Contractor' : 'Lead'}`}
              </h3>
              <div className="flex items-center gap-3">
                {!isContractor && !editData && (
                  <button 
                    onClick={() => {
                      setAiMode(!aiMode);
                      setProfileMode(false);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${aiMode ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {aiMode ? 'Manual Entry' : 'Qualified Lead Write-up'}
                  </button>
                )}
                {isContractor && !editData && (
                  <button
                    onClick={() => {
                      setProfileMode(!profileMode);
                      setAiMode(false);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                      profileMode 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {profileMode ? 'Manual Entry' : 'Add from Profile'}
                  </button>
                )}
                <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            {profileMode ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Select an existing Admin CRM client to automatically create their contractor profile.</p>
                
                {loadingClients ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : clientsWithoutContractor.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                    No available clients found. All clients already have a contractor profile.
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-200">
                    {clientsWithoutContractor.map(client => (
                      <div key={client.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{client.company_name || client.contact_name}</p>
                          <p className="text-sm text-gray-500">{client.email || 'No email'}</p>
                        </div>
                        <button
                          onClick={() => handleAddFromProfile(client)}
                          disabled={loading}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : aiMode ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Paste your unformatted lead write-up here, and our AI will automatically extract all details and prepare it for qualification.</p>
                <textarea
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  placeholder="Paste write-up here...&#10;e.g. Confirmed address: Fox Hill...&#10;Monthly energy spend: £350 monthly..."
                  className="w-full h-64 p-4 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400"
                />
              </div>
            ) : (
              <form id="add-lead-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number *</label>
                <input
                  type="text"
                  name="phone"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                <input
                  type="text"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700">Company</label>
                <input
                  type="text"
                  name="company"
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">Address / Location</label>
                <input
                  type="text"
                  name="location"
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="other_contacts" className="block text-sm font-medium text-gray-700">Additional Contact Name</label>
                <input
                  type="text"
                  name="other_contacts"
                  id="other_contacts"
                  value={formData.other_contacts}
                  onChange={(e) => setFormData({...formData, other_contacts: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="other_contact_numbers" className="block text-sm font-medium text-gray-700">Additional Phone Number</label>
                <input
                  type="text"
                  name="other_contact_numbers"
                  id="other_contact_numbers"
                  value={formData.other_contact_numbers}
                  onChange={(e) => setFormData({...formData, other_contact_numbers: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {loading ? 'Saving...' : editData ? 'Save Changes' : `Add ${isContractor ? 'Contractor' : 'Lead'}`}
              </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
            )}
            
            {aiMode && (
              <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleAiParse}
                  disabled={loading || !aiText.trim()}
                  className="w-full inline-flex justify-center items-center gap-2 rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Sparkles className="w-4 h-4" />}
                  {loading ? 'Extracting...' : 'Extract & Qualify'}
                </button>
                <button
                  type="button"
                  onClick={() => setAiMode(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
