"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Briefcase, MapPin, Clock, ArrowRight, Sparkles } from 'lucide-react';

interface Job {
  id: string;
  title: string;
  description: string;
  benefits: string;
  requirements: string;
  location: string;
  salary_range: string;
  type: string;
  external_link?: string;
  created_at: string;
}

export default function IntranetCareersPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJobs() {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'published')
        .eq('is_internal', true)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setJobs(data);
      }
      setLoading(false);
    }

    fetchJobs();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Internal Positions</h1>
          <p className="text-gray-500 text-sm mt-1">Exclusive career opportunities for the Openlead team.</p>
        </div>
        <div className="bg-emerald-50 px-4 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Internal Only</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      ) : jobs.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white rounded-3xl border border-gray-100 p-8 hover:shadow-lg hover:border-emerald-100 transition-all group flex flex-col h-full">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-emerald-600 mb-4">
                  <Briefcase className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-widest">{job.type}</span>
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 mb-4">{job.title}</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                    <MapPin className="w-3.5 h-3.5" />
                    {job.location}
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    {job.salary_range}
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Description</h4>
                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{job.description}</p>
                  </div>
                  {job.requirements && (
                    <div>
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Requirements</h4>
                      <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{job.requirements}</p>
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={() => {
                  if (job.external_link) {
                    window.open(job.external_link, '_blank', 'noopener,noreferrer');
                  } else {
                    window.location.href = `mailto:careers@openlead.com?subject=Internal Application: ${job.title}`;
                  }
                }}
                className="w-full inline-flex items-center justify-center px-6 py-3 bg-emerald-50 text-emerald-700 font-bold rounded-2xl hover:bg-emerald-600 hover:text-white transition-all group/btn"
              >
                {job.external_link ? 'Apply on Flowmingo' : 'Apply Internally'}
                <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-1">No internal openings</h3>
          <p className="text-gray-500 text-sm">We'll notify you when new internal roles become available.</p>
        </div>
      )}
    </div>
  );
}
