"use client";
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../../store/authStore';
import { supabase } from '../../../../lib/supabase';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { Save, Link as LinkIcon, RefreshCw, AlertTriangle } from 'lucide-react';

export default function TrackerPage() {
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
    { Date: '2024-01-01', Metric: 'Total Leads Generated', Value: '150' },
    { Date: '2024-01-01', Metric: 'Leads Sold', Value: '45' },
    { Date: '2024-01-02', Metric: 'Total Leads Generated', Value: '180' },
    { Date: '2024-01-02', Metric: 'Leads Sold', Value: '60' },
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'tracker_sheet_url')
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
          key: 'tracker_sheet_url', 
          value: sheetUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;
      
      toast.success('Tracker URL updated successfully');
      setIsEditing(false);
      loadCsvData(sheetUrl);
    } catch (error: any) {
      console.error('Error saving URL:', error);
      toast.error(error.message || 'Failed to save URL');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Performance Tracker</h2>
          <p className="text-sm text-gray-500 mt-1">Live metrics and tracking data directly from Google Sheets.</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            {isEditing ? 'Cancel Edit' : 'Edit Source URL'}
          </button>
        )}
      </div>

      {isEditing && isAdmin && (
        <div className="mb-8 bg-emerald-50 p-6 rounded-xl border border-emerald-100">
          <h3 className="text-sm font-bold text-emerald-900 mb-2">Connect Google Sheet</h3>
          <p className="text-xs text-emerald-700 mb-4">
            To connect your tracker, go to your Google Sheet, click <strong>File &gt; Share &gt; Publish to web</strong>. 
            Choose the specific sheet tab you want to show, and select <strong>Comma-separated values (.csv)</strong> format. 
            Paste that link here.
          </p>
          <div className="flex gap-3">
            <input
              type="url"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
            />
            <button
              onClick={handleSaveUrl}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save & Load
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : fetchError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-red-900 mb-1">Error Loading Tracker</h3>
          <p className="text-sm text-red-700">{fetchError}</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {headers.map((header, index) => (
                    <th
                      key={index}
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row, rowIndex) => {
                  // Determine if this row looks like a header/summary row
                  // Usually header rows in sheets might have all caps, or specific keywords
                  const isHeaderRow = Object.values(row).some((val: any) => 
                    typeof val === 'string' && (val.toLowerCase() === 'total' || val.toLowerCase() === 'summary')
                  );
                  
                  return (
                    <tr key={rowIndex} className={`hover:bg-gray-50 transition-colors ${isHeaderRow ? 'bg-gray-50/80' : ''}`}>
                      {headers.map((header, colIndex) => {
                        const cellValue = row[header];
                        // Empty cells in CSV come as empty strings, don't show '-' if it's truly blank to mimic merged/empty cells
                        const displayValue = cellValue === undefined || cellValue === null ? '' : String(cellValue).trim();
                        
                        // Check if it's a number to right-align it optionally, or bold it
                        const isNumber = displayValue !== '' && !isNaN(Number(displayValue.replace(/[,£$%]/g, '')));
                        
                        return (
                          <td
                            key={`${rowIndex}-${colIndex}`}
                            className={`px-6 py-4 text-sm whitespace-nowrap ${
                              isHeaderRow ? 'font-bold text-gray-900' : 
                              isNumber ? 'font-medium text-gray-900' : 'text-gray-600'
                            }`}
                          >
                            {displayValue}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}