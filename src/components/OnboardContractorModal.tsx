import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Contractor } from '@/types';
import { X, UserPlus, Building, Mail, Phone, MapPin, Briefcase, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface OnboardContractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractor: Contractor;
  onSuccess: (updatedContractor: Contractor) => void;
}

export const OnboardContractorModal: React.FC<OnboardContractorModalProps> = ({ isOpen, onClose, contractor, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: contractor.company || '',
    contact_name: contractor.name || '',
    phone: contractor.phone || '',
    email: contractor.email || '',
    password: '',
    other_contacts: '',
    other_contact_numbers: '',
    address: '',
    areas_covered: '',
    services_offered: '',
    internal_notes: ''
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name || !formData.contact_name || !formData.phone || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields (Company, Contact, Phone, Email, Password).');
      return;
    }

    try {
      setLoading(true);

      // 1. Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.contact_name,
            role: 'client'
          }
        }
      });

      if (authError) throw authError;

      // Even with email confirmation on, signUp returns the user object.
      // If the user already exists, it might return a fake user or throw.
      const userId = authData.user?.id;
      if (!userId) throw new Error('Failed to retrieve user ID from auth creation.');

      // 2. Create the client record
      const { error: clientError } = await supabase
        .from('clients')
        .insert({
          user_id: userId,
          company_name: formData.company_name,
          contact_name: formData.contact_name,
          phone: formData.phone,
          other_contacts: formData.other_contacts || null,
          other_contact_numbers: formData.other_contact_numbers || null,
          address: formData.address || null,
          areas_covered: formData.areas_covered || null,
          services_offered: formData.services_offered || null,
          internal_notes: formData.internal_notes || null
        });

      if (clientError) throw clientError;

      // 3. Update the contractor status to onboarded
      const { data: updatedContractor, error: updateError } = await supabase
        .from('contractors')
        .update({ status: 'onboarded' })
        .eq('id', contractor.id)
        .select()
        .single();

      if (updateError) throw updateError;

      toast.success('Contractor successfully onboarded as a new Client!');
      onSuccess(updatedContractor as Contractor);
    } catch (error: any) {
      toast.error('Failed to onboard contractor: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Onboard Contractor to Client</h2>
              <p className="text-sm text-gray-500">Create a client account and finalize details.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="onboard-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Essential Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4 flex items-center gap-2">
                <Building className="w-5 h-5 text-gray-400" /> Primary Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input type="text" name="company_name" required value={formData.company_name} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Contact Name *</label>
                  <input type="text" name="contact_name" required value={formData.contact_name} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Contact Number *</label>
                  <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address (Login) *</label>
                  <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password *</label>
                  <input type="password" name="password" required value={formData.password} onChange={handleChange} minLength={6} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
            </div>

            {/* Additional Contacts & Location */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4 mt-8 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-400" /> Location & Additional Contacts
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other Contacts</label>
                  <input type="text" name="other_contacts" placeholder="E.g., John Smith, Jane Doe" value={formData.other_contacts} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other Contact Numbers</label>
                  <input type="text" name="other_contact_numbers" placeholder="E.g., 07123456789, 07987654321" value={formData.other_contact_numbers} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
            </div>

            {/* Services & Areas */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4 mt-8 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-gray-400" /> Services & Coverage
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Areas Covered</label>
                  <textarea name="areas_covered" rows={3} value={formData.areas_covered} onChange={handleChange} placeholder="E.g., London, South East, Manchester..." className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Services Offered</label>
                  <textarea name="services_offered" rows={3} value={formData.services_offered} onChange={handleChange} placeholder="E.g., Solar PV, Battery Storage, Heat Pumps..." className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
            </div>

            {/* Internal Notes */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4 mt-8 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" /> Internal Notes (Admins Only)
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea name="internal_notes" rows={3} value={formData.internal_notes} onChange={handleChange} placeholder="Any internal notes or specifics about the onboarding agreement..." className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="onboard-form"
            disabled={loading}
            className="px-6 py-2 border border-transparent shadow-sm text-sm font-bold rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Onboarding...' : 'Onboard Contractor'}
          </button>
        </div>

      </div>
    </div>
  );
};
