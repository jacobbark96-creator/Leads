"use client";
import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import toast from 'react-hot-toast';

export default function LeadImport() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<'fresh' | 'qualified'>('fresh');
  const [progress, setProgress] = useState<{ 
    total: number; 
    processed: number; 
    duplicates: number; 
    added: number; 
    failed: number;
    failedList: any[];
    duplicateList: any[];
  } | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<'failed' | 'duplicates' | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      setProgress({ 
        total: 0, 
        processed: 0, 
        duplicates: 0, 
        added: 0, 
        failed: 0,
        failedList: [],
        duplicateList: []
      });

      Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        // Reset file input safely after parsing starts
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

        try {
          if (!results || !results.data) {
            toast.error("CSV parser returned no data. The file might be corrupted or empty.");
            setIsUploading(false);
            return;
          }

          const rows = results.data as any[];
          if (rows.length === 0) {
            toast.error("No valid rows found in the CSV. Please check the file format.");
            setIsUploading(false);
            return;
          }
          setProgress(prev => prev ? { ...prev, total: rows.length } : null);

          let duplicates = 0;
          let added = 0;
          let failed = 0;
          let failedList: any[] = [];
          let duplicateList: any[] = [];

          const CHUNK_SIZE = 100;
          for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
            const chunk = rows.slice(i, i + CHUNK_SIZE);
            
            const getVal = (row: any, possibleKeys: string[]) => {
              if (!row || typeof row !== 'object') return '';
              const keys = Object.keys(row);
              for (const k of keys) {
                const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (possibleKeys.some(pk => pk === cleanK)) {
                  return row[k];
                }
              }
              return '';
            };

            const extractPhone = (r: any) => String(getVal(r, ['phone', 'phonenumber', 'contactnumber', 'telephone', 'mobile', 'cell', 'number', 'tel'])).replace(/\s+/g, '').substring(0, 20);
            const extractEmail = (r: any) => String(getVal(r, ['email', 'emailaddress', 'emailid'])).trim().substring(0, 255);

            const phones = chunk.map(r => extractPhone(r)).filter(Boolean);
            const emails = chunk.map(r => extractEmail(r)).filter(Boolean);

            const existingPhones = new Set<string>();
            const existingEmails = new Set<string>();

            try {
              if (phones.length > 0) {
                const { data, error } = await supabase.from('leads').select('phone').in('phone', phones);
                if (error) throw error;
                data?.forEach(d => { if (d.phone) existingPhones.add(d.phone.replace(/\s+/g, '')); });
              }
              if (emails.length > 0) {
                const { data, error } = await supabase.from('leads').select('email').in('email', emails);
                if (error) throw error;
                data?.forEach(d => { if (d.email) existingEmails.add(d.email.trim()); });
              }
            } catch (err: any) {
              console.error('Error fetching duplicates', err);
              if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
                toast.error("Connection Blocked! Please disable your Ad-blocker or Brave Shields.");
              }
            }

            const toInsert: any[] = [];
            const chunkDupPhones = new Set(existingPhones);
            const chunkDupEmails = new Set(existingEmails);

            for (const row of chunk) {
              const phone = extractPhone(row);
              const email = extractEmail(row);
              
              const rawName = String(getVal(row, ['name', 'fullname', 'contactname', 'contactperson', 'clientname', 'person']));
              let name = rawName.trim().substring(0, 100);
              if (!name) {
                 const firstName = String(getVal(row, ['firstname', 'first']));
                 const lastName = String(getVal(row, ['lastname', 'last', 'surname']));
                 if (firstName || lastName) {
                   name = `${firstName} ${lastName}`.trim().substring(0, 100);
                 }
              }
              
              const company = String(getVal(row, ['company', 'companyname', 'businessname', 'organization', 'tradingname'])).trim().substring(0, 200);

              // RULE: Must have a phone number
              if (!phone) {
                failed++;
                failedList.push({ ...(typeof row === 'object' ? row : {}), reason: 'No phone number provided' });
                continue;
              }

              // RULE: If no name but has company, mark as Enrich Needed - No Name
              let finalName = name;
              let finalStatus = uploadTarget;
              if (!name && company) {
                finalName = 'Enrich Needed - No Name';
              } else if (!name) {
                finalName = 'Unknown';
              }

              if (chunkDupPhones.has(phone) || (email && chunkDupEmails.has(email))) {
                duplicates++;
                duplicateList.push({ ...(typeof row === 'object' ? row : {}), reason: 'Duplicate phone or email' });
              } else {
                toInsert.push({
                  name: finalName,
                  phone,
                  email,
                  company,
                  csv_data: row,
                  status: finalStatus
                });
                chunkDupPhones.add(phone);
                if (email) chunkDupEmails.add(email);
              }
            }

            if (toInsert.length > 0) {
              try {
                // Create a mapped array that ensures missing string properties are explicitly null, not undefined
                const safeToInsert = toInsert.map(item => ({
                  name: item.name || null,
                  phone: item.phone,
                  email: item.email || null,
                  company: item.company || null,
                  csv_data: item.csv_data,
                  status: item.status
                }));

                const { error } = await supabase.from('leads').insert(safeToInsert);
                if (error) {
                  console.error('Supabase specific error:', error);
                  throw error;
                }
                added += toInsert.length;
              } catch (err: any) {
                console.error('Batch insert error', err);
                failed += toInsert.length;
                let errorReason = typeof err === 'object' ? (err.message || err.details || err.hint || JSON.stringify(err)) : String(err);
                
                if (errorReason.includes('Failed to fetch') || errorReason.includes('NetworkError')) {
                  errorReason = "Blocked by Ad-blocker/Firewall";
                  toast.error("Upload blocked! Your Ad-blocker is blocking the database connection.");
                }

                toInsert.forEach(item => failedList.push({ ...(item.csv_data || {}), reason: errorReason }));
              }
            }

            setProgress(prev => ({ 
              total: rows.length, 
              processed: Math.min(i + CHUNK_SIZE, rows.length), 
              duplicates, 
              added, 
              failed,
              failedList: [...(prev?.failedList || []), ...failedList],
              duplicateList: [...(prev?.duplicateList || []), ...duplicateList]
            }));
            
            // Clear chunk lists for next iteration
            failedList = [];
            duplicateList = [];
          }

          setIsUploading(false);
          if (failed > 0) {
            const firstReason = failedList.length > 0 ? failedList[0].reason : 'Unknown error';
            toast.error(`Import complete with errors: ${added} added, ${duplicates} duplicates, ${failed} failed. First error: ${firstReason}`);
          } else {
            toast.success(`Successfully imported ${added} leads. (${duplicates} duplicates skipped)`);
          }
        } catch (fatalError: any) {
          console.error('Fatal crash during CSV parsing/uploading:', fatalError);
          if (fatalError.message?.includes('Failed to fetch') || fatalError.message?.includes('NetworkError')) {
            toast.error("Upload Blocked! Please disable your Ad-blocker, Brave Shields, or VPN to allow database connections.");
          } else {
            toast.error(`Critical error during upload: ${fatalError.message || String(fatalError)}`);
          }
          setIsUploading(false);
        }
      },
      error: (error) => {
        toast.error(`Error parsing CSV: ${error.message}`);
        setIsUploading(false);
      }
    });
    } catch (err: any) {
      console.error("Outer try-catch caught an error:", err);
      toast.error(`Error starting upload: ${err.message || String(err)}`);
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-xl font-medium text-gray-900">Import Leads (CSV)</h2>
          <p className="text-sm text-gray-500">Upload a CSV file to add new leads. Duplicates will be automatically ignored.</p>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
        
        <div className="mb-6 w-full max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Destination</label>
          <select
            value={uploadTarget}
            onChange={(e) => setUploadTarget(e.target.value as 'fresh' | 'qualified')}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            disabled={isUploading}
          >
            <option value="fresh">Unqualified Leads (Fresh)</option>
            <option value="qualified">Qualified Leads</option>
          </select>
        </div>

        <div className="space-y-1 text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="flex text-sm text-gray-600 justify-center">
            <label
              htmlFor="file-upload"
              className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
            >
              <span>Upload a file</span>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                accept=".csv"
                className="sr-only"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">CSV up to 10MB</p>
        </div>
      </div>

      {progress && (
        <div className="mt-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Import Progress</h3>
          
          <div className="relative pt-1 mb-4">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                  {Math.round((progress.processed / progress.total) * 100) || 0}%
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-blue-600">
                  {progress.processed} / {progress.total}
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
              <div style={{ width: `${(progress.processed / progress.total) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"></div>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6 border border-green-100">
              <dt className="text-sm font-medium text-gray-500 truncate">Added Successfully</dt>
              <dd className="mt-1 text-3xl font-semibold text-green-600">{progress.added}</dd>
            </div>
            <button 
              onClick={() => progress.duplicates > 0 && setShowDetailModal('duplicates')}
              className={`px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6 border border-yellow-100 text-left transition-all ${progress.duplicates > 0 ? 'hover:shadow-md hover:border-yellow-300 cursor-pointer' : 'cursor-default'}`}
            >
              <dt className="text-sm font-medium text-gray-500 truncate">Duplicates Skipped</dt>
              <dd className="mt-1 text-3xl font-semibold text-yellow-600">{progress.duplicates}</dd>
              {progress.duplicates > 0 && <p className="mt-2 text-xs text-yellow-500 font-medium">Click to view details →</p>}
            </button>
            <button 
              onClick={() => progress.failed > 0 && setShowDetailModal('failed')}
              className={`px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6 border border-red-100 text-left transition-all ${progress.failed > 0 ? 'hover:shadow-md hover:border-red-300 cursor-pointer' : 'cursor-default'}`}
            >
              <dt className="text-sm font-medium text-gray-500 truncate">Failed to Add</dt>
              <dd className="mt-1 text-3xl font-semibold text-red-600">{progress.failed}</dd>
              {progress.failed > 0 && <p className="mt-2 text-xs text-red-500 font-medium">Click to view details →</p>}
            </button>
          </dl>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && progress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900">
                {showDetailModal === 'failed' ? 'Failed Imports' : 'Skipped Duplicates'} 
                <span className="ml-2 text-sm font-medium text-slate-500">
                  ({showDetailModal === 'failed' ? progress.failedList.length : progress.duplicateList.length} items)
                </span>
              </h3>
              <button 
                onClick={() => setShowDetailModal(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider text-red-600">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(showDetailModal === 'failed' ? progress.failedList : progress.duplicateList).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-900">{item.name || item.Name || item.fullName || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 font-mono">{item.phone || item.Phone || item['Phone Number'] || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{item.company || item.Company || item.companyName || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-red-600">{item.reason || 'Unknown error'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setShowDetailModal(null)}
                className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};