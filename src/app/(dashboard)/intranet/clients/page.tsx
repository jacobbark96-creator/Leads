"use client";
import React, { useState } from 'react';
import { Search, Building, Phone, User } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { Client } from '../../../../types';
import toast from 'react-hot-toast';

export default function ClientSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    try {
      setIsSearching(true);
      setHasSearched(true);
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .or(`company_name.ilike.%${searchTerm}%,contact_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .limit(20);

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast.error('Search failed: ' + error.message);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-xl font-medium text-gray-900">Client Search</h2>
          <p className="text-sm text-gray-500">Search existing clients by name, company, or phone.</p>
        </div>
      </div>

      <div className="mb-8 max-w-2xl">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search clients..."
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !searchTerm.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {hasSearched && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
          <ul className="divide-y divide-gray-200">
            {clients.map((client) => (
              <li key={client.id}>
                <div className="px-4 py-4 flex items-center sm:px-6">
                  <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                    <div className="truncate">
                      <div className="flex text-sm">
                        <p className="font-medium text-blue-600 truncate">{client.company_name}</p>
                        <p className="ml-1 flex-shrink-0 font-normal text-gray-500">
                          in active clients
                        </p>
                      </div>
                      <div className="mt-2 flex">
                        <div className="flex items-center text-sm text-gray-500">
                          <User className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          <p>{client.contact_name}</p>
                        </div>
                        <div className="ml-6 flex items-center text-sm text-gray-500">
                          <Phone className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          <p>{client.phone}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex-shrink-0 sm:mt-0 sm:ml-5">
                      <div className="flex -space-x-1 overflow-hidden">
                        <button className="px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                          View Profile
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {clients.length === 0 && !isSearching && (
              <li className="px-4 py-8 text-center text-gray-500">
                No clients found matching "{searchTerm}"
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};