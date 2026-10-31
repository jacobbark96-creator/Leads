"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useDivisionStore } from '@/store/divisionStore';
import { Loader2, Plus, GripVertical, Building, MapPin, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function ResidentialOverview() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { activeDivisionId } = useDivisionStore();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [installers, setInstallers] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  
  // Filters
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedInstaller, setSelectedInstaller] = useState('all');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRegionName, setNewRegionName] = useState('');
  const [newInstallerName, setNewInstallerName] = useState('');
  const [postcodePrefixes, setPostcodePrefixes] = useState('');

  const COLUMNS = [
    { id: 'fresh', title: 'Fresh' },
    { id: 'qualified', title: 'Qualified' },
    { id: 'designing', title: 'Designing' },
    { id: 'booked', title: 'Booked' },
    { id: 'pitched', title: 'Pitched' },
    { id: 'sold', title: 'Sold' },
    { id: 'sent to installer', title: 'Sent to Installer' },
    { id: 'declined', title: 'Declined' }
  ];

  useEffect(() => {
    if (activeDivisionId) {
      fetchData();
    }
  }, [selectedRegion, selectedInstaller, activeDivisionId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: leadsData }, { data: installersData }, { data: regionsData }] = await Promise.all([
        supabase.from('leads')
          .select('*, installers(name), regions(name)')
          .in('status', ['new', ...COLUMNS.map(c => c.id)])
          .eq('building_type', 'Residential')
          .eq('division_id', activeDivisionId),
        supabase.from('installers').select('*'),
        supabase.from('regions').select('*')
      ]);

      let filteredLeads = leadsData || [];
      if (selectedRegion !== 'all') {
        filteredLeads = filteredLeads.filter(l => l.region_id === selectedRegion);
      }
      if (selectedInstaller !== 'all') {
        filteredLeads = filteredLeads.filter(l => l.installer_id === selectedInstaller);
      }

      setLeads(filteredLeads);
      setInstallers(installersData || []);
      setRegions(regionsData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, lead: any) => {
    e.dataTransfer.setData('leadId', lead.id);
  };

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;

    // Optimistic
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l));

    // If dragged to 'fresh', update as 'fresh' so it stays consistent, 
    // or keep 'new' if we want it to remain unassigned for reps?
    // Usually 'fresh' on overview = 'new' on reps side if it's unassigned.
    const newStatus = status === 'fresh' ? 'new' : status;

    const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', leadId);
    if (error) {
      toast.error('Failed to move lead');
      fetchData(); // revert
    }
  };

  const handleAddRegionInstaller = async () => {
    if (!newRegionName || !newInstallerName || !postcodePrefixes) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      // 1. Create installer
      const { data: installerData, error: instError } = await supabase
        .from('installers')
        .insert([{ name: newInstallerName }])
        .select()
        .single();
        
      if (instError) throw instError;

      // 2. Create Region
      const prefixes = postcodePrefixes.split(',').map(p => p.trim().toUpperCase());
      const { data: regionData, error: regError } = await supabase
        .from('regions')
        .insert([{ 
          name: newRegionName, 
          installer_id: installerData.id,
          postcode_prefixes: prefixes
        }])
        .select()
        .single();

      if (regError) throw regError;

      toast.success('Region and Installer added successfully!');
      setIsModalOpen(false);
      setNewRegionName('');
      setNewInstallerName('');
      setPostcodePrefixes('');
      fetchData();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    }
  };

  // Stats
  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter(l => l.status !== 'new' && l.status !== 'fresh' && l.status !== 'declined').length;
  const pitchedLeads = leads.filter(l => ['pitched', 'sold', 'sent to installer'].includes(l.status)).length;
  const soldLeads = leads.filter(l => ['sold', 'sent to installer'].includes(l.status)).length;

  const qualifyRate = totalLeads ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;
  const pitchRate = qualifiedLeads ? Math.round((pitchedLeads / qualifiedLeads) * 100) : 0;
  const salesRate = pitchedLeads ? Math.round((soldLeads / pitchedLeads) * 100) : 0;

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#F9FAFB] overflow-hidden">
      <div className="px-4 py-3 shrink-0 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Residential Overview</h1>
            <p className="text-xs text-gray-500">Manage all residential operations and installer assignments</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Add Region/Installer
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div className="bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">Total Leads</p>
            <p className="text-lg font-bold text-gray-900">{totalLeads}</p>
          </div>
          <div className="bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">Qualify Rate</p>
            <p className="text-lg font-bold text-blue-600">{qualifyRate}%</p>
          </div>
          <div className="bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">Pitch Rate</p>
            <p className="text-lg font-bold text-indigo-600">{pitchRate}%</p>
          </div>
          <div className="bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">Sales Rate</p>
            <p className="text-lg font-bold text-emerald-600">{salesRate}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-xs bg-white focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Regions</option>
            {regions.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <select
            value={selectedInstaller}
            onChange={(e) => setSelectedInstaller(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-xs bg-white focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Installers</option>
            {installers.map(i => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex gap-3 h-full min-w-max">
          {COLUMNS.map(col => {
            const colLeads = leads.filter(l => col.id === 'fresh' ? (l.status === 'fresh' || l.status === 'new') : l.status === col.id);
            return (
              <div 
                key={col.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, col.id)}
                className="w-36 flex flex-col h-full bg-gray-50/50 rounded-lg border border-gray-200 shrink-0"
              >
                <div className="p-2 border-b border-gray-200 flex items-center justify-between shrink-0 bg-gray-50/80 rounded-t-lg">
                  <h3 className="font-bold text-gray-700 text-[11px] uppercase tracking-wider">{col.title}</h3>
                  <span className="bg-white text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-gray-200 shadow-sm">{colLeads.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                  {colLeads.map(lead => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead)}
                      onClick={() => router.push(`/sales-crm/leads/${lead.id}`)}
                      className="bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <h4 className="font-semibold text-xs text-gray-900 line-clamp-1 pr-2">{lead.name}</h4>
                        <GripVertical className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                      {lead.location && (
                        <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                          <MapPin className="w-3 h-3 shrink-0 text-gray-400" />
                          <span className="truncate">{lead.location}</span>
                        </div>
                      )}
                      {lead.regions?.name && (
                        <div className="mt-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 uppercase tracking-wider">
                          {lead.regions.name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
            >
              <h2 className="text-xl font-bold mb-4">Add Region & Installer</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Region Name</label>
                  <input
                    type="text"
                    value={newRegionName}
                    onChange={e => setNewRegionName(e.target.value)}
                    placeholder="e.g. North West"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Installer Name</label>
                  <input
                    type="text"
                    value={newInstallerName}
                    onChange={e => setNewInstallerName(e.target.value)}
                    placeholder="e.g. John Doe Solar"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postcode Prefixes (comma separated)</label>
                  <input
                    type="text"
                    value={postcodePrefixes}
                    onChange={e => setPostcodePrefixes(e.target.value)}
                    placeholder="e.g. M, WA, WN"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Any new leads matching these postcodes will automatically be assigned to this region.</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddRegionInstaller}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save & Assign
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
