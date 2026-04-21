"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { DiscountCode } from '../../../../types';
import toast from 'react-hot-toast';
import { Plus, Ticket, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../../../store/authStore';

export default function DiscountCodesTab() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { profile } = useAuthStore();

  const [newCode, setNewCode] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    max_uses: '',
    valid_until: ''
  });

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch discount codes: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.code || !newCode.discount_value) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase.from('discount_codes').insert({
        code: newCode.code.toUpperCase(),
        description: newCode.description || null,
        discount_type: newCode.discount_type,
        discount_value: Number(newCode.discount_value),
        max_uses: newCode.max_uses ? Number(newCode.max_uses) : null,
        valid_until: newCode.valid_until ? new Date(newCode.valid_until).toISOString() : null,
        created_by: profile?.id
      });

      if (error) throw error;

      toast.success('Discount code created successfully');
      setNewCode({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: '',
        max_uses: '',
        valid_until: ''
      });
      fetchCodes();
    } catch (error: any) {
      toast.error('Failed to create discount code: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('discount_codes')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(currentStatus ? 'Code disabled' : 'Code activated');
      setCodes(codes.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
    } catch (error: any) {
      toast.error('Failed to update status: ' + error.message);
    }
  };

  const deleteCode = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this discount code?')) return;
    
    try {
      const { error } = await supabase
        .from('discount_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Code deleted successfully');
      setCodes(codes.filter(c => c.id !== id));
    } catch (error: any) {
      toast.error('Failed to delete code. It may have already been used.');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-medium text-gray-900">Discount Codes</h2>
          <p className="text-sm text-gray-500 mt-1">Manage promotional codes for lead purchases</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200 mb-8 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-slate-50">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" /> Create New Code
          </h3>
        </div>
        <div className="p-6">
          <form onSubmit={handleCreateCode} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <input type="text" required value={newCode.code} onChange={e => setNewCode({...newCode, code: e.target.value})} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm uppercase" placeholder="SUMMER20" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={newCode.discount_type} onChange={e => setNewCode({...newCode, discount_type: e.target.value as any})} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (£)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value *</label>
                <input type="number" required min="0" step={newCode.discount_type === 'percentage' ? '1' : '0.01'} value={newCode.discount_value} onChange={e => setNewCode({...newCode, discount_value: e.target.value})} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" placeholder={newCode.discount_type === 'percentage' ? '20' : '50.00'} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses (Optional)</label>
              <input type="number" min="1" value={newCode.max_uses} onChange={e => setNewCode({...newCode, max_uses: e.target.value})} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" placeholder="Leave empty for unlimited" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until (Optional)</label>
              <input type="datetime-local" value={newCode.valid_until} onChange={e => setNewCode({...newCode, valid_until: e.target.value})} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Internal)</label>
              <input type="text" value={newCode.description} onChange={e => setNewCode({...newCode, description: e.target.value})} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" placeholder="Summer campaign 2024" />
            </div>

            <div>
              <button type="submit" disabled={isCreating} className="w-full bg-blue-600 text-white py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                {isCreating ? 'Creating...' : 'Create Discount Code'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        {codes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uses</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {codes.map((code) => (
                  <tr key={code.id} className={!code.is_active ? 'opacity-60 bg-gray-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-blue-500" />
                        <span className="font-bold text-gray-900 font-mono">{code.code}</span>
                      </div>
                      {code.description && <div className="text-xs text-gray-500 mt-1">{code.description}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {code.discount_type === 'percentage' ? `${code.discount_value}% OFF` : `£${code.discount_value} OFF`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {code.current_uses} / {code.max_uses || '∞'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleStatus(code.id, code.is_active)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          code.is_active 
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {code.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => deleteCode(code.id)} className="text-red-600 hover:text-red-900 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Ticket className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No discount codes</h3>
            <p className="mt-1 text-sm text-gray-500">Create your first discount code above.</p>
          </div>
        )}
      </div>
    </div>
  );
}