import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Briefcase, MapPin, Clock, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Props {
  params: Promise<{ id: string }>;
}

async function getJob(id: string) {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .eq('is_internal', false)
    .single();

  if (error || !data) return null;
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id);

  if (!job) {
    return {
      title: 'Job Not Found | Openlead',
    };
  }

  return {
    title: `${job.title} | Careers at Openlead`,
    description: job.description.substring(0, 160),
    openGraph: {
      title: job.title,
      description: job.description.substring(0, 160),
    },
  };
}

export default async function JobPage({ params }: Props) {
  const { id } = await params;
  const job = await getJob(id);

  if (!job) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link 
        href="/careers" 
        className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-openlead-blue transition-colors mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to all positions
      </Link>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header Section */}
        <div className="p-8 md:p-12 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 text-openlead-blue mb-6">
            <Briefcase className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wider">{job.type}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-6 leading-tight">
            {job.title}
          </h1>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2 text-slate-600 font-medium">
              <MapPin className="w-5 h-5 text-slate-400" />
              {job.location}
            </div>
            <div className="flex items-center gap-2 text-slate-600 font-medium">
              <Clock className="w-5 h-5 text-slate-400" />
              {job.salary_range}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8 md:p-12 space-y-12">
          {/* Description */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">About the Role</h2>
            <div className="text-slate-600 leading-relaxed whitespace-pre-wrap">
              {job.description}
            </div>
          </section>

          {/* Requirements */}
          {job.requirements && (
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Requirements</h2>
              <div className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {job.requirements}
              </div>
            </section>
          )}

          {/* Benefits */}
          {job.benefits && (
            <section className="bg-emerald-50/50 rounded-2xl p-6 md:p-8 border border-emerald-100">
              <h2 className="text-xl font-bold text-emerald-900 mb-6 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Benefits
              </h2>
              <div className="text-emerald-800 leading-relaxed whitespace-pre-wrap">
                {job.benefits}
              </div>
            </section>
          )}

          {/* Application CTA */}
          <div className="pt-8 border-t border-slate-100 text-center">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Interested in this position?</h3>
            <p className="text-slate-500 mb-8">Click the button below to start your application process.</p>
            <button className="inline-flex items-center justify-center px-10 py-4 bg-openlead-blue text-white font-black rounded-2xl hover:bg-openlead-blue/90 shadow-xl shadow-blue-500/20 hover:-translate-y-1 transition-all">
              Apply for this role
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
