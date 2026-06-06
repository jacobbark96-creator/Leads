"use client";
import React, { useEffect, useState } from 'react';
import { FileText, Link as LinkIcon, Table, Plus, Search, ExternalLink } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useAuthStore } from '../../../../store/authStore';
import { IntranetResource } from '../../../../types';
import { AddResourceModal } from '../../../../components/AddResourceModal';
import toast from 'react-hot-toast';

export default function ResourcesPage() {
  const { profile } = useAuthStore();
  const [resources, setResources] = useState<IntranetResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchResources = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('intranet_resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast.error('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-8 h-8 text-red-500" />;
      case 'excel': return <Table className="w-8 h-8 text-green-500" />;
      case 'link': return <LinkIcon className="w-8 h-8 text-blue-500" />;
      default: return <FileText className="w-8 h-8 text-gray-500" />;
    }
  };

  const getBadgeForType = (type: string) => {
    switch (type) {
      case 'pdf': return <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-100 rounded-full">PDF Document</span>;
      case 'excel': return <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-100 rounded-full">Spreadsheet</span>;
      case 'link': return <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 rounded-full">External Link</span>;
      default: return null;
    }
  };

  const filteredResources = resources.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Staff Resources</h2>
          <p className="text-sm text-gray-500 mt-1">Access company documents, links, and spreadsheets.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          
          {profile?.role === 'super_admin' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Resource
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200 border-dashed">
          <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-sm font-medium text-gray-900">No resources found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery ? 'Try adjusting your search terms.' : 'Super admins haven\'t uploaded any resources yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredResources.map((resource) => (
            <a
              key={resource.id}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col h-full hover:border-emerald-200 relative"
            >
              <div className="absolute top-4 right-4 text-gray-300 group-hover:text-emerald-500 transition-colors">
                <ExternalLink className="w-4 h-4" />
              </div>
              
              <div className="flex items-start gap-4 mb-3">
                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-emerald-50 transition-colors shrink-0">
                  {getIconForType(resource.resource_type)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors mb-1 pr-6 truncate">
                    {resource.title}
                  </h3>
                  {getBadgeForType(resource.resource_type)}
                </div>
              </div>
              
              <div className="flex-1">
                {resource.description ? (
                  <p className="text-sm text-gray-500 line-clamp-3">
                    {resource.description}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No description provided.</p>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <span>Added {new Date(resource.created_at).toLocaleDateString()}</span>
              </div>
            </a>
          ))}
        </div>
      )}

      {isAddModalOpen && (
        <AddResourceModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onResourceAdded={fetchResources}
        />
      )}
    </div>
  );
}
