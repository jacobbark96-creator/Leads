import React, { useState, useEffect } from 'react';
import { X, Tag, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export const PricePromotionModal = ({ isOpen, onClose, lead, onSave }: any) => {
  const [mode, setMode] = useState<'reduce' | 'promotion' | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && lead?.csv_data?.promotion) {
      setMode(lead.csv_data.promotion.type);
      setNewPrice(lead.csv_data.promotion.price?.toString() || '');
      if (lead.csv_data.promotion.end_date) {
        const d = new Date(lead.csv_data.promotion.end_date);
        setEndDate(d.toISOString().split('T')[0]);
        setEndTime(d.toTimeString().substring(0, 5));
      }
    } else if (isOpen) {
      setMode(null);
      setNewPrice('');
      setEndDate('');
      setEndTime('');
    }
  }, [isOpen, lead]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!mode) {
      toast.error('Please select a promotion type');
      return;
    }
    if (!newPrice) {
      toast.error('Please enter a new price');
      return;
    }
    
    let promotionData: any = {
      type: mode,
      price: Number(newPrice),
    };

    if (mode === 'promotion') {
      if (!endDate || !endTime) {
        toast.error('Please set an end date and time for the promotion');
        return;
      }
      promotionData.end_date = new Date(`${endDate}T${endTime}`).toISOString();
    }

    setIsSaving(true);
    try {
      const updatedCsvData = {
        ...(lead.csv_data || {}),
        promotion: promotionData
      };

      const { error } = await supabase
        .from('leads')
        .update({ csv_data: updatedCsvData })
        .eq('id', lead.id);

      if (error) throw error;
      toast.success('Promotion settings saved');
      onSave(updatedCsvData);
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    try {
      const updatedCsvData = { ...(lead.csv_data || {}) };
      delete updatedCsvData.promotion;

      const { error } = await supabase
        .from('leads')
        .update({ csv_data: updatedCsvData })
        .eq('id', lead.id);

      if (error) throw error;
      toast.success('Promotion cleared');
      onSave(updatedCsvData);
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Promotions & Discounts</h2>
              <p className="text-xs text-gray-500 mt-0.5">Manage pricing offers for the marketplace</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setMode('reduce')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${mode === 'reduce' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}
            >
              <Tag className={`w-6 h-6 mb-2 ${mode === 'reduce' ? 'text-blue-500' : 'text-gray-400'}`} />
              <h3 className={`font-bold text-sm ${mode === 'reduce' ? 'text-blue-900' : 'text-gray-700'}`}>Reduce Price</h3>
              <p className="text-[10px] text-gray-500 mt-1">Permanently reduce the price of this lead</p>
            </button>
            <button
              onClick={() => setMode('promotion')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${mode === 'promotion' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-200'}`}
            >
              <Clock className={`w-6 h-6 mb-2 ${mode === 'promotion' ? 'text-amber-500' : 'text-gray-400'}`} />
              <h3 className={`font-bold text-sm ${mode === 'promotion' ? 'text-amber-900' : 'text-gray-700'}`}>Timed Promotion</h3>
              <p className="text-[10px] text-gray-500 mt-1">Set a temporary discount that expires</p>
            </button>
          </div>

          {mode && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">New Price (£)</label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="e.g. 99"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                />
              </div>

              {mode === 'promotion' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">End Time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between rounded-b-2xl">
          {lead?.csv_data?.promotion ? (
            <button
              onClick={handleClear}
              disabled={isSaving}
              className="px-4 py-2.5 text-red-600 hover:bg-red-50 font-bold text-sm rounded-lg transition-colors"
            >
              Remove Promotion
            </button>
          ) : <div></div>}
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 font-bold text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !mode}
              className={`px-6 py-2.5 text-white font-bold text-sm rounded-lg shadow-sm transition-colors ${
                mode === 'promotion' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
              } disabled:opacity-50`}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
