"use client";
import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import toast from 'react-hot-toast';

export default function LeadImport() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<{ total: number; processed: number; duplicates: number; added: number } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setProgress({ total: 0, processed: 0, duplicates: 0, added: 0 });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        setProgress(prev => prev ? { ...prev, total: rows.length } : null);

        let duplicates = 0;
        let added = 0;

        for (const row of rows) {
          try {
            const phone = row.phone || row.Phone || row.phoneNumber || row['Phone Number'] || '';
            const email = row.email || row.Email || row.emailAddress || '';
            const name = row.name || row.Name || row.fullName || `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Unknown';
            const company = row.company || row.Company || row.companyName || '';

            if (!phone && !email) {
              // Skip empty crucial data
              setProgress(prev => prev ? { ...prev, processed: prev.processed + 1 } : null);
              continue;
            }

            // Duplicate check by phone or email
            const query = supabase.from('leads').select('id').limit(1);
            if (phone) {
              query.eq('phone', phone);
            } else if (email) {
              query.eq('email', email);
            }

            const { data: existingLeads, error: searchError } = await query;
            
            if (searchError) throw searchError;

            if (existingLeads && existingLeads.length > 0) {
              duplicates++;
            } else {
              // Insert new lead
              const { error: insertError } = await supabase.from('leads').insert([{
                name,
                phone,
                email,
                company,
                csv_data: row,
                status: 'new'
              }]);
              
              if (insertError) throw insertError;
              added++;
            }
          } catch (err) {
            console.error('Error processing row', row, err);
          }
          
          setProgress(prev => prev ? { ...prev, processed: prev.processed + 1, duplicates, added } : null);
        }

        setIsUploading(false);
        toast.success(`Import complete: ${added} added, ${duplicates} duplicates skipped.`);
      },
      error: (error) => {
        toast.error(`Error parsing CSV: ${error.message}`);
        setIsUploading(false);
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-xl font-medium text-gray-900">Import Leads (CSV)</h2>
          <p className="text-sm text-gray-500">Upload a CSV file to add new leads. Duplicates will be automatically ignored.</p>
        </div>
      </div>

      <div className="mt-8 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
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

          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6 border border-green-100">
              <dt className="text-sm font-medium text-gray-500 truncate">Added Successfully</dt>
              <dd className="mt-1 text-3xl font-semibold text-green-600">{progress.added}</dd>
            </div>
            <div className="px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6 border border-yellow-100">
              <dt className="text-sm font-medium text-gray-500 truncate">Duplicates Skipped</dt>
              <dd className="mt-1 text-3xl font-semibold text-yellow-600">{progress.duplicates}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
};