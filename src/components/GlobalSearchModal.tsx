import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Building, User, Phone, Mail, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Lead } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

export const GlobalSearchModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const search = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('id, name, company, email, phone, location, status')
          .or(`name.ilike.%${query}%,company.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
          .limit(10);
          
        if (error) throw error;
        setResults((data as unknown as Lead[]) || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (lead: Lead) => {
    onClose();
    // Redirect to lead-v2 page
    router.push(`/sales-crm/lead-v2?id=${lead.id}&tab=${lead.status === 'qualified' ? 'qualified' : 'unqualified'}`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 sm:px-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" 
          onClick={onClose} 
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        >
          <div className="relative border-b border-gray-100 flex items-center px-4 py-4">
            <Search className="w-5 h-5 text-gray-400 mr-3" />
            <input
              ref={inputRef}
              type="text"
              className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-lg"
              placeholder="Search leads, companies, contacts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onClose();
              }}
            />
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-2">
            {loading ? (
              <div className="py-14 text-center text-sm text-gray-500 flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                Searching...
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-1">
                <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Leads</div>
                {results.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => handleSelect(lead)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
                        {lead.name} {lead.company && <span className="text-gray-400 font-normal ml-1">• {lead.company}</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3 truncate">
                        {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {lead.email}</span>}
                        {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</span>}
                        {lead.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {lead.location}</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : query.trim() ? (
              <div className="py-14 text-center text-sm text-gray-500">
                No results found for "{query}"
              </div>
            ) : (
              <div className="py-14 text-center text-sm text-gray-400">
                Type to start searching across the CRM
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
