import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface StatusTransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: any;
  newStatus: string;
  onSuccess: (updatedData: any) => void;
}

export const StatusTransitionModal: React.FC<StatusTransitionModalProps> = ({ isOpen, onClose, lead, newStatus, onSuccess }) => {
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let fileUrl = formData.proposal_url;
      
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${lead.purchase_id || lead.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('lead_documents')
          .upload(filePath, file);
          
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from('lead_documents')
          .getPublicUrl(filePath);
          
        fileUrl = publicUrlData.publicUrl;
      }
      
      const newMetadata = {
        ...(lead.metadata || {}),
        [newStatus]: {
          ...formData,
          ...(fileUrl ? { proposal_url: fileUrl } : {}),
          updated_at: new Date().toISOString()
        }
      };

      const updateData: any = { 
        status: newStatus, 
        metadata: newMetadata
      };
      
      if (newStatus === 'won' && formData.sale_amount) {
        updateData.sale_amount = parseFloat(formData.sale_amount);
      }
      
      const { error } = await supabase
        .from('lead_purchases')
        .update(updateData)
        .eq('id', lead.purchase_id);
        
      if (error) throw error;
      
      toast.success('Status updated successfully');
      onSuccess(updateData);
      onClose();
    } catch (err: any) {
      toast.error('Failed to update status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderFormFields = () => {
    switch (newStatus) {
      case 'contacted':
        return (
          <>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Date Contacted</label>
              <input type="date" required className="w-full p-2 border border-gray-200 rounded-lg text-sm" onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Method</label>
              <select required className="w-full p-2 border border-gray-200 rounded-lg text-sm" onChange={e => setFormData({...formData, method: e.target.value})}>
                <option value="">Select method...</option>
                <option value="Phone">Phone</option>
                <option value="Email">Email</option>
                <option value="SMS">SMS</option>
                <option value="In-person">In-person</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
              <textarea required className="w-full p-2 border border-gray-200 rounded-lg text-sm h-24" onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
            </div>
          </>
        );
      case 'sat':
        return (
          <>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Date of Survey</label>
              <input type="date" required className="w-full p-2 border border-gray-200 rounded-lg text-sm" onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Method</label>
              <select required className="w-full p-2 border border-gray-200 rounded-lg text-sm" onChange={e => setFormData({...formData, method: e.target.value})}>
                <option value="">Select method...</option>
                <option value="Desktop">Desktop</option>
                <option value="Virtual">Virtual</option>
                <option value="Site Survey">Site Survey</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Notes</label>
              <textarea className="w-full p-2 border border-gray-200 rounded-lg text-sm h-24" onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
            </div>
          </>
        );
      case 'proposal':
        return (
          <>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Date of Proposal</label>
              <input type="date" required className="w-full p-2 border border-gray-200 rounded-lg text-sm" onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Upload PDF</label>
              <input type="file" accept=".pdf" className="w-full p-2 border border-gray-200 rounded-lg text-sm" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Notes</label>
              <textarea className="w-full p-2 border border-gray-200 rounded-lg text-sm h-24" onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
            </div>
          </>
        );
      case 'won':
        return (
          <>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Date Won</label>
              <input type="date" required className="w-full p-2 border border-gray-200 rounded-lg text-sm" onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Sale Value (£)</label>
              <input type="number" step="0.01" required className="w-full p-2 border border-gray-200 rounded-lg text-sm" placeholder="e.g. 5000" onChange={e => setFormData({...formData, sale_amount: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Notes</label>
              <textarea className="w-full p-2 border border-gray-200 rounded-lg text-sm h-24" onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
            </div>
            {lead?.metadata?.proposal?.proposal_url && (
              <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-xs font-bold flex items-center gap-2">
                <FileText className="w-4 h-4" /> Proposal document is attached
              </div>
            )}
          </>
        );
      case 'archive':
        return (
          <>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Date</label>
              <input type="date" required className="w-full p-2 border border-gray-200 rounded-lg text-sm" onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Notes</label>
              <textarea className="w-full p-2 border border-gray-200 rounded-lg text-sm h-24" onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
            </div>
          </>
        );
      default:
        return <p className="text-sm text-gray-500">Are you sure you want to move this lead?</p>;
    }
  };

  const statusLabels: Record<string, string> = {
    contacted: 'Contacted',
    sat: 'Surveyed',
    proposal: 'Proposal',
    won: 'Won',
    archive: 'Archive'
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Mark as {statusLabels[newStatus] || newStatus}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {renderFormFields()}
          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2">
              {loading ? 'Saving...' : 'Confirm Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
