import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';

import { 
  Briefcase, 
  MapPin, 
  Clock, 
  CheckCircle, 
  ArrowLeft, 
  Sparkles, 
  ShieldCheck, 
  Zap,
  Globe,
  Wallet
} from 'lucide-react';
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
      images: ['https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Modern%20minimalist%20office%20workspace%20with%20collaborative%20energy%20professional%20aesthetic%20high%20resolution&image_size=landscape_16_9'],
    },
  };
}

export default async function JobPage({ params }: Props) {
  const { id } = await params;
  const job = await getJob(id);

  if (!job) {
    notFound();
  }

  const heroImageUrl = `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent('A modern, high-tech office environment with natural light, collaborative workspace, professional and minimalist aesthetic, soft bokeh, high resolution, photography')}&image_size=landscape_16_9`;

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Hero Header */}
      <div className="relative h-[40vh] min-h-[400px] w-full overflow-hidden bg-slate-900">
        <img 
          src={heroImageUrl} 
          alt="Office Environment" 
          className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
        
        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12">
          <Link 
            href="/careers" 
            className="inline-flex items-center text-sm font-bold text-white/70 hover:text-white transition-colors mb-8 group w-fit"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Careers
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 rounded-full bg-openlead-blue/20 border border-openlead-blue/30 text-openlead-blue text-[10px] font-black uppercase tracking-widest">
                  {job.type}
                </span>
                <span className="flex items-center gap-1.5 text-white/60 text-xs font-medium">
                  <Globe className="w-3.5 h-3.5" />
                  Openlead Global
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none mb-6">
                {job.title}
              </h1>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2 text-white/80 font-bold text-sm">
                  <MapPin className="w-4 h-4 text-openlead-blue" />
                  {job.location}
                </div>
                <div className="flex items-center gap-2 text-white/80 font-bold text-sm">
                  <Wallet className="w-4 h-4 text-openlead-blue" />
                  {job.salary_range}
                </div>
              </div>
            </div>
            
            <button className="md:hidden w-full py-4 bg-openlead-blue text-white font-black rounded-2xl shadow-2xl shadow-blue-500/20 active:scale-[0.98] transition-all">
              Apply Now
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Details */}
          <div className="lg:col-span-8 space-y-16">
            {/* About Section */}
            <section className="bg-white rounded-[32px] p-8 md:p-12 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded-xl bg-blue-50">
                  <Sparkles className="w-6 h-6 text-openlead-blue" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">About the Role</h2>
              </div>
              <div className="prose prose-slate max-w-none">
                <p className="text-lg text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {job.description}
                </p>
              </div>
            </section>

            {/* Requirements Section */}
            {job.requirements && (
              <section className="bg-white rounded-[32px] p-8 md:p-12 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 rounded-xl bg-amber-50">
                    <Zap className="w-6 h-6 text-amber-500" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">What You'll Need</h2>
                </div>
                <div className="text-lg text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {job.requirements}
                </div>
              </section>
            )}

            {/* Benefits Section */}
            {job.benefits && (
              <section className="bg-emerald-50/50 rounded-[32px] p-8 md:p-12 border border-emerald-100">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 rounded-xl bg-emerald-100">
                    <ShieldCheck className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-black text-emerald-900 tracking-tight">The Perks</h2>
                </div>
                <div className="text-lg text-emerald-800 leading-relaxed whitespace-pre-wrap">
                  {job.benefits}
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Sticky CTA */}
          <div className="lg:col-span-4">
            <div className="sticky top-32 space-y-6">
              <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                <h3 className="text-xl font-black text-slate-900 mb-2">Ready to apply?</h3>
                <p className="text-sm text-slate-500 mb-8">Join our fast-growing team and help us build the future of lead generation.</p>
                
                <div className="space-y-4">
                  <button className="w-full py-5 bg-openlead-blue text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-openlead-blue/90 hover:-translate-y-1 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    Submit Application
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </button>
                  <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
                    Takes less than 5 minutes
                  </p>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-50 space-y-4">
                  <div className="flex items-center gap-3 text-slate-600">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-bold">Fast-track response</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-bold">Remote friendly</span>
                  </div>
                </div>
              </div>

              {/* Share Card */}
              <div className="bg-slate-900 rounded-[32px] p-8 text-white">
                <h4 className="text-sm font-black uppercase tracking-widest mb-4">Know someone?</h4>
                <p className="text-xs text-white/60 mb-6">Share this opportunity with your network and help them find their next big role.</p>
                <button className="w-full py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all">
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
