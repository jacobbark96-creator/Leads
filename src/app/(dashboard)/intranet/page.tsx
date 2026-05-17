"use client";
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { Save, Link as LinkIcon, RefreshCw, AlertTriangle } from 'lucide-react';

export default function PricingMatrix() {
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  
  const [loading, setLoading] = useState(true);
  const [sheetUrl, setSheetUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Default fallback data if no sheet is provided
  const fallbackData = [
    { Category: 'Solar', Tier: 'Standard', 'Base Price': '£50/lead', 'Volume Discount': '10% off for 100+' },
    { Category: 'Solar', Tier: 'Premium (Exclusive)', 'Base Price': '£80/lead', 'Volume Discount': '5% off for 50+' },
    { Category: 'Solar Cleaning', Tier: 'Standard', 'Base Price': '£20/lead', 'Volume Discount': '15% off for 100+' },
    { Category: 'Roofing', Tier: 'Standard', 'Base Price': '£65/lead', 'Volume Discount': '10% off for 100+' },
    { Category: 'Asbestos', Tier: 'Standard', 'Base Price': '£90/lead', 'Volume Discount': '5% off for 50+' },
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'pricing_sheet_url')
        .single();
        
      if (data?.value) {
        setSheetUrl(data.value);
        loadCsvData(data.value);
      } else {
        // Load fallback data
        setHeaders(Object.keys(fallbackData[0]));
        setRows(fallbackData);
        setLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      // Load fallback data on error
      setHeaders(Object.keys(fallbackData[0]));
      setRows(fallbackData);
      setLoading(false);
    }
  };

  const loadCsvData = async (url: string) => {
    setLoading(true);
    setFetchError(null);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const text = await response.text();
      
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            setHeaders(results.meta.fields || Object.keys(results.data[0]));
            setRows(results.data);
          } else {
            setFetchError("No data found in the provided Google Sheet.");
          }
          setLoading(false);
        },
        error: (error: any) => {
          console.error("PapaParse error:", error);
          setFetchError("Failed to parse CSV data.");
          setLoading(false);
        }
      });
    } catch (err: any) {
      console.error("Fetch error:", err);
      setFetchError("Failed to fetch Google Sheet. Make sure the link is a published CSV format (File -> Share -> Publish to web -> CSV).");
      setLoading(false);
    }
  };

  const handleSaveUrl = async () => {
    if (!sheetUrl.trim()) {
      toast.error('Please enter a valid URL');
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ 
          key: 'pricing_sheet_url', 
          value: sheetUrl.trim(),
          updated_at: new Date().toISOString()
        });
        
      if (error) throw error;
      
      toast.success('Pricing Matrix source updated!');
      setIsEditing(false);
      loadCsvData(sheetUrl.trim());
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearUrl = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .delete()
        .eq('key', 'pricing_sheet_url');
        
      if (error) throw error;
      
      toast.success('Custom source removed. Reverted to default.');
      setSheetUrl('');
      setIsEditing(false);
      setHeaders(Object.keys(fallbackData[0]));
      setRows(fallbackData);
      setFetchError(null);
    } catch (err: any) {
      toast.error('Failed to clear: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Pricing Matrix</h2>
          <p className="text-sm text-gray-500 mt-1">Current lead pricing and volume discounts</p>
        </div>
        
        {isAdmin && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <input
                  type="text"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="Paste Google Sheets CSV link..."
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleSaveUrl}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-sm font-medium"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={fetchSettings}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                  title="Refresh Data"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-colors"
                >
                  <LinkIcon className="w-4 h-4" />
                  Link Google Sheet
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {fetchError && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 border border-red-100">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Failed to load data</h4>
            <p className="text-xs mt-1 opacity-90">{fetchError}</p>
          </div>
        </div>
      )}

      {/* Tabs Placeholder (Visual Only for now based on categories) */}
      <div className="flex items-center gap-2 mb-6">
        {Array.from(new Set(rows.map(r => r.Category || r.category || 'General'))).map((cat, i) => (
          <button 
            key={i}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
              i === 0 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {i === 0 && <span className="inline-block w-3 h-3 mr-1.5 text-emerald-500">☼</span>}
            {String(cat)}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {headers.filter(h => h.toLowerCase() !== 'category').map((header, idx) => (
                <th key={idx} className="pb-3 font-bold text-gray-400 text-[10px] uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={headers.length} className="py-8 text-center text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50" />
                  Loading pricing data...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="py-8 text-center text-gray-400">
                  No pricing data available
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="group hover:bg-gray-50/50 transition-colors">
                  {headers.filter(h => h.toLowerCase() !== 'category').map((header, colIndex) => {
                    // Just to add an icon to the first column like the image
                    const isFirstCol = colIndex === 0;
                    return (
                      <td key={colIndex} className="py-4 text-gray-900 font-medium">
                        <div className="flex items-center gap-3">
                          {isFirstCol && (
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                              <span className="font-bold">£</span>
                            </div>
                          )}
                          {row[header] || '-'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-emerald-50/50 border border-emerald-100/50 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg shadow-sm border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-sm">
            %
          </div>
          <span className="text-xs text-gray-600">Volume discounts are applied automatically at checkout based on monthly spend.</span>
        </div>
        <button className="px-4 py-2 bg-white border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl shadow-sm hover:bg-emerald-50 transition-colors">
          View Discount Tiers
        </button>
      </div>
    </div>
  );
}