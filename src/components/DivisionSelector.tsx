import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useDivisionStore } from '@/store/divisionStore';
import { ChevronDown, Building2 } from 'lucide-react';

export const DivisionSelector = () => {
  const { profile } = useAuthStore();
  const { activeDivisionId, setActiveDivisionId } = useDivisionStore();
  const [divisions, setDivisions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchDivisions = async () => {
      const { data } = await supabase.from('divisions').select('*').order('name');
      if (data) {
        setDivisions(data);
      }
    };

    if (profile?.role === 'super_admin') {
      fetchDivisions();
    }
  }, [profile]);

  if (profile?.role !== 'super_admin') return null;

  const currentDivision = activeDivisionId === 'all' 
    ? { name: 'All Divisions' } 
    : divisions.find(d => d.id === activeDivisionId) || { name: 'Select Division' };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-900 border border-gray-200"
      >
        <Building2 className="w-4 h-4 text-gray-500" />
        <span className="max-w-[120px] truncate">{currentDivision.name}</span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
          <button
            onClick={() => { setActiveDivisionId('all'); setIsOpen(false); }}
            className={`w-full text-left px-4 py-2 text-sm font-medium ${activeDivisionId === 'all' ? 'text-blue-700 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            All Divisions
          </button>
          {divisions.map(division => (
            <button
              key={division.id}
              onClick={() => { setActiveDivisionId(division.id); setIsOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm font-medium ${activeDivisionId === division.id ? 'text-blue-700 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {division.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
