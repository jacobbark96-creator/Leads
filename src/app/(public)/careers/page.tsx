"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Briefcase, MapPin, Clock, ArrowRight } from 'lucide-react';

import Link from 'next/link';

interface Job {
  id: string;
  title: string;
  description: string;
  benefits: string;
  requirements: string;
  location: string;
  salary_range: string;
  type: string;
  created_at: string;
}

export default function CareersPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJobs() {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'published')
        .eq('is_internal', false)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setJobs(data);
      }
      setLoading(false);
    }

    fetchJobs();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
          Join the <span className="text-openlead-blue">Openlead</span> Team
        </h1>
        <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
          Help us revolutionize the lead generation industry. We're always looking for talented individuals to join our mission.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-openlead-blue"></div>
        </div>
      ) : jobs.length > 0 ? (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 hover:shadow-md transition-shadow flex flex-col h-full">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-openlead-blue mb-4">
                  <Briefcase className="w-5 h-5" />
                  <span className="text-sm font-bold uppercase tracking-wider">{job.type}</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">{job.title}</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-slate-600 text-sm">
                    <MapPin className="w-4 h-4" />
                    {job.location}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 text-sm">
                    <Clock className="w-4 h-4" />
                    {job.salary_range}
                  </div>
                </div>
                <p className="text-slate-600 line-clamp-3 mb-8">
                  {job.description}
                </p>
              </div>
              <Link href={`/careers/${job.id}`} className="w-full inline-flex items-center justify-center px-6 py-3 border border-openlead-blue text-openlead-blue font-bold rounded-xl hover:bg-openlead-blue hover:text-white transition-all group">
                View Details & Apply
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No open positions right now</h3>
          <p className="text-slate-500">Check back later or follow us for updates.</p>
        </div>
      )}
    </div>
  );
}
