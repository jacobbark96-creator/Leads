"use client";
import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import toast from 'react-hot-toast';

export default function ContractorImport() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<'fresh' | 'onboarded'>('fresh');
  const [progress, setProgress] = useState<{ total: number; processed: number; duplicates: number; added: number; failed: number } | null>(null);

  const normalizeKey = (key: string) => String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const getRowValue = (row: any, keys: string[]) => {
    if (!row) return '';
    for (const key of keys) {
      const direct = row[key];
      if (direct !== undefined && direct !== null && String(direct).trim()) return String(direct).trim();
    }
    const normalized = new Map<string, any>();
    for (const k of Object.keys(row)) {
      normalized.set(normalizeKey(k), row[k]);
    }
    for (const key of keys) {
      const v = normalized.get(normalizeKey(key));
      if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
    }
    return '';
  };

  const getCompanyNameFromRow = (row: any) =>
    getRowValue(row, ['company_name', 'company', 'Company', 'Company Name', 'companyName', 'Business Name', 'Trading Name']);

  const getDirectorNamesFromRow = (row: any) => {
    const names = [
      getRowValue(row, ['Director 1', 'director 1', 'director1', 'Director1', 'Primary Director', 'Primary Contact']),
      getRowValue(row, ['Director 2', 'director 2', 'director2', 'Director2']),
      getRowValue(row, ['Director 3', 'director 3', 'director3', 'Director3']),
      getRowValue(row, ['Director 4', 'director 4', 'director4', 'Director4']),
      getRowValue(row, ['Director 5', 'director 5', 'director5', 'Director5'])
    ]
      .map((s) => s.trim())
      .filter(Boolean);
    return Array.from(new Set(names));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setProgress({ total: 0, processed: 0, duplicates: 0, added: 0, failed: 0 });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        setProgress(prev => prev ? { ...prev, total: rows.length } : null);

        let duplicates = 0;
        let added = 0;
        let failed = 0;

        const CHUNK_SIZE = 100;
        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
          const chunk = rows.slice(i, i + CHUNK_SIZE);
          
          const phones = chunk
            .map(r => getRowValue(r, ['phone', 'Phone', 'phoneNumber', 'Phone Number']).substring(0, 20))
            .filter(Boolean);
          const emails = chunk
            .map(r => getRowValue(r, ['email', 'Email', 'emailAddress']).substring(0, 255).toLowerCase())
            .filter(Boolean);

          const existingPhones = new Set<string>();
          const existingEmails = new Set<string>();

          try {
            if (phones.length > 0) {
              const { data } = await supabase.from('contractors').select('phone').in('phone', phones);
              data?.forEach(d => { if (d.phone) existingPhones.add(d.phone); });
            }
            if (emails.length > 0) {
              const { data } = await supabase.from('contractors').select('email').in('email', emails);
              data?.forEach(d => { if (d.email) existingEmails.add(d.email); });
            }
          } catch (err) {
            console.error('Error fetching duplicates', err);
          }

          const toInsert = [];
          const chunkDupPhones = new Set(existingPhones);
          const chunkDupEmails = new Set(existingEmails);

          for (const row of chunk) {
            const phone = getRowValue(row, ['phone', 'Phone', 'phoneNumber', 'Phone Number']).substring(0, 20);
            const email = getRowValue(row, ['email', 'Email', 'emailAddress']).substring(0, 255).toLowerCase();
            const companyName = getCompanyNameFromRow(row).substring(0, 200);
            const directors = getDirectorNamesFromRow(row);
            const primaryDirector = directors[0] || '';

            const fallbackName = companyName || email || phone || 'Unknown';
            const name = String(fallbackName).substring(0, 100);

            if (!phone && !email) {
              failed++;
              continue;
            }

            if ((phone && chunkDupPhones.has(phone)) || (email && chunkDupEmails.has(email))) {
              duplicates++;
            } else {
              toInsert.push({
                name,
                phone,
                email,
                company: companyName || null,
                company_name: companyName || null,
                contact_name: primaryDirector || null,
                csv_data: row,
                status: uploadTarget
              });
              if (phone) chunkDupPhones.add(phone);
              if (email) chunkDupEmails.add(email);
            }
          }

          if (toInsert.length > 0) {
            try {
              const { error } = await supabase.from('contractors').insert(toInsert);
              if (error) throw error;
              added += toInsert.length;
            } catch (err) {
              console.error('Batch insert error', err);
              failed += toInsert.length;
            }
          }

          setProgress({ total: rows.length, processed: Math.min(i + CHUNK_SIZE, rows.length), duplicates, added, failed });
        }

        setIsUploading(false);
        if (failed > 0) {
          toast.error(`Import complete with errors: ${added} added, ${duplicates} duplicates, ${failed} failed.`);
        } else {
          toast.success(`Import complete: ${added} added, ${duplicates} duplicates skipped.`);
        }
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
          <h2 className="text-xl font-medium text-gray-900">Import Contractors (CSV)</h2>
          <p className="text-sm text-gray-500">Upload a CSV file to add new contractors. Duplicates will be automatically ignored.</p>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
        
        <div className="mb-6 w-full max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload Destination</label>
          <select
            value={uploadTarget}
            onChange={(e) => setUploadTarget(e.target.value as 'fresh' | 'onboarded')}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            disabled={isUploading}
          >
            <option value="fresh">Potential Contractors (Fresh)</option>
            <option value="onboarded">Onboarded Contractors</option>
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
            <div className="px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6 border border-yellow-100">
              <dt className="text-sm font-medium text-gray-500 truncate">Duplicates Skipped</dt>
              <dd className="mt-1 text-3xl font-semibold text-yellow-600">{progress.duplicates}</dd>
            </div>
            <div className="px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6 border border-red-100">
              <dt className="text-sm font-medium text-gray-500 truncate">Failed to Add</dt>
              <dd className="mt-1 text-3xl font-semibold text-red-600">{progress.failed}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
};
