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
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-xl font-medium text-gray-900">Pricing Matrix</h2>
          <p className="text-sm text-gray-500">Current lead pricing and volume discounts</p>
        </div>
        
        {isAdmin && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="mt-3 sm:mt-0 flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors shadow-sm"
          >
            <LinkIcon className="w-4 h-4" />
            Link Google Sheet
          </button>
        )}
      </div>

      {isEditing && isAdmin && (
        <div className="mb-8 bg-blue-50 border border-blue-100 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-blue-900 mb-2">Sync with Google Sheets</h3>
          <p className="text-xs text-blue-700 mb-4">
            To sync this table automatically, go to your Google Sheet &rarr; <strong>File</strong> &rarr; <strong>Share</strong> &rarr; <strong>Publish to web</strong>. 
            Select the specific sheet, change "Web page" to <strong>"Comma-separated values (.csv)"</strong>, and click Publish. Paste that exact link below.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=csv"
              className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveUrl}
                disabled={saving}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                disabled={saving}
                className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              {sheetUrl && (
                <button
                  onClick={handleClearUrl}
                  disabled={saving}
                  className="flex items-center justify-center px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium text-sm transition-colors disabled:opacity-50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {fetchError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-red-900">Error Loading Pricing Data</h4>
            <p className="text-sm text-red-700 mt-1">{fetchError}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col space-y-8">
        {loading ? (
          <div className="bg-white p-12 flex justify-center items-center shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          (() => {
            // Find the category column (case-insensitive)
            const categoryHeader = headers.find(h => h.toLowerCase() === 'category');
            
            if (!categoryHeader || rows.length === 0) {
              // Fallback to single table if no category column exists
              return (
                <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                  <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                    <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {headers.map((header, idx) => (
                              <th key={idx} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {rows.length > 0 ? (
                            rows.map((row, rowIdx) => (
                              <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-blue-50/50 transition-colors'}>
                                {headers.map((header, colIdx) => {
                                  const isPrice = header.toLowerCase().includes('price');
                                  const isDiscount = header.toLowerCase().includes('discount');
                                  return (
                                    <td 
                                      key={colIdx} 
                                      className={`px-6 py-4 whitespace-nowrap text-sm ${
                                        colIdx === 0 ? 'font-medium text-gray-900' :
                                        isPrice ? 'text-gray-900 font-semibold' :
                                        isDiscount ? 'text-green-600 font-medium' :
                                        'text-gray-500'
                                      }`}
                                    >
                                      {row[header] || '-'}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={headers.length || 1} className="px-6 py-8 text-center text-sm text-gray-500">
                                No pricing data available.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            }

            // Group by category
            const groupedRows = rows.reduce((acc: Record<string, any[]>, row) => {
              const cat = row[categoryHeader] || 'Other';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(row);
              return acc;
            }, {});

            // Headers excluding the category column
            const displayHeaders = headers.filter(h => h !== categoryHeader);

            return Object.entries(groupedRows).map(([category, catRows]: [string, any[]]) => (
              <div key={category} className="mb-2">
                <h3 className="text-lg font-bold text-gray-900 mb-3 px-1">{category}</h3>
                <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                  <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                    <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {displayHeaders.map((header, idx) => (
                              <th key={idx} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {catRows.map((row, rowIdx) => (
                            <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-blue-50/50 transition-colors'}>
                              {displayHeaders.map((header, colIdx) => {
                                const isPrice = header.toLowerCase().includes('price');
                                const isDiscount = header.toLowerCase().includes('discount');
                                return (
                                  <td 
                                    key={colIdx} 
                                    className={`px-6 py-4 whitespace-nowrap text-sm ${
                                      colIdx === 0 ? 'font-medium text-gray-900' :
                                      isPrice ? 'text-gray-900 font-semibold' :
                                      isDiscount ? 'text-green-600 font-medium' :
                                      'text-gray-500'
                                    }`}
                                  >
                                    {row[header] || '-'}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ));
          })()
        )}
      </div>
    </div>
  );
}