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
  Wallet,
  Building2,
  Calendar,
  Users2
} from 'lucide-react';
import Link from 'next/link';
import { JobPageClient } from './JobPageClient';
import { ShareButton } from './ShareButton';
import { HeroImage } from './HeroImage';

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

  // Improved AI Image Prompt - Simplified for reliability
  const heroImageUrl = "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Modern+minimalist+tech+office+collaborative+workspace+luxury+lighting+high+resolution&image_size=landscape_16_9";

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-openlead-blue/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-emerald-400/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10">
        {/* Modern SaaS Hero */}
        <div className="relative pt-12 pb-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link 
              href="/careers" 
              className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-openlead-blue transition-all mb-12 group"
            >
              <div className="p-2 rounded-full bg-white shadow-sm border border-slate-100 mr-3 group-hover:bg-openlead-blue/5 transition-colors">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              </div>
              Back to Careers
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <span className="px-4 py-1.5 rounded-full bg-openlead-blue text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20">
                      {job.type}
                    </span>
                    <span className="px-4 py-1.5 rounded-full bg-white border border-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Actively Hiring
                    </span>
                  </div>
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.1]">
                    {job.title}
                  </h1>
                  <div className="flex flex-wrap gap-8 pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                        <MapPin className="w-5 h-5 text-openlead-blue" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location</p>
                        <p className="text-sm font-black text-slate-900">{job.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                        <Wallet className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Salary</p>
                        <p className="text-sm font-black text-slate-900">{job.salary_range}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <JobPageClient job={{ id: job.id, title: job.title }} variant="hero" />
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-tr from-openlead-blue/20 to-emerald-400/20 blur-3xl rounded-[40px] opacity-50" />
                <div className="relative aspect-[16/10] rounded-[40px] overflow-hidden border-[8px] border-white shadow-2xl">
                  <HeroImage src={heroImageUrl} alt="Openlead Culture" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white">
                    <div className="flex items-center gap-4">
                      <div className="flex -space-x-3">
                        {[1,2,3].map(i => (
                          <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                            <img src={`https://i.pravatar.cc/100?u=${i + 10}`} alt="Team" />
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-xs font-bold">Join 50+ teammates</p>
                        <p className="text-[10px] opacity-70 uppercase tracking-widest">at Openlead Global</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-8 space-y-12">
              {/* Modern Bento-style Sections */}
              <div className="bg-white rounded-[40px] p-10 md:p-14 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-500">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-openlead-blue" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">The Opportunity</h2>
                </div>
                <div className="prose prose-slate max-w-none">
                  <p className="text-lg text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                    {job.description}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {job.requirements && (
                  <div className="bg-white rounded-[40px] p-10 shadow-sm border border-slate-100 group hover:border-openlead-blue/20 transition-all duration-500">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                      <Zap className="w-6 h-6 text-amber-500" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">Requirements</h3>
                    <div className="text-slate-600 leading-relaxed whitespace-pre-wrap text-sm font-medium">
                      {job.requirements}
                    </div>
                  </div>
                )}

                <div className="bg-slate-900 rounded-[40px] p-10 text-white relative overflow-hidden group">
                  <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-openlead-blue/20 blur-3xl rounded-full" />
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                    <Building2 className="w-6 h-6 text-openlead-blue" />
                  </div>
                  <h3 className="text-2xl font-black mb-6 tracking-tight">Our Culture</h3>
                  <p className="text-sm text-slate-400 leading-relaxed font-medium">
                    We're a team of innovators, thinkers, and builders. We value transparency, high-autonomy, and speed. Join us in shaping the future of lead generation.
                  </p>
                </div>
              </div>

              {job.benefits && (
                <div className="bg-emerald-50/50 rounded-[40px] p-10 md:p-14 border border-emerald-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 opacity-5">
                    <ShieldCheck className="w-48 h-48 text-emerald-600" />
                  </div>
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h2 className="text-3xl font-black text-emerald-900 tracking-tight">Perks & Benefits</h2>
                  </div>
                  <div className="text-lg text-emerald-800 leading-relaxed whitespace-pre-wrap font-bold">
                    {job.benefits}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-4">
              <div className="sticky top-32 space-y-6">
                <div className="bg-white rounded-[40px] p-10 shadow-2xl shadow-slate-200/60 border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-openlead-blue to-emerald-400" />
                  
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Apply Today</h3>
                      <p className="text-sm text-slate-500 mt-2 font-medium">Be part of the next chapter of Openlead's growth.</p>
                    </div>

                    <JobPageClient job={{ id: job.id, title: job.title }} />

                    <div className="pt-8 border-t border-slate-50 space-y-4">
                      <div className="flex items-center gap-4 text-slate-600">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="text-sm font-bold">48h response time</span>
                      </div>
                      <div className="flex items-center gap-4 text-slate-600">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Users2 className="w-4 h-4 text-openlead-blue" />
                        </div>
                        <span className="text-sm font-bold">Multiple openings</span>
                      </div>
                      <div className="flex items-center gap-4 text-slate-600">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="text-sm font-bold">Immediate start</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[40px] p-10 text-white shadow-xl shadow-slate-900/20">
                  <h4 className="text-lg font-black tracking-tight mb-4">Refer a Friend</h4>
                  <p className="text-sm text-slate-400 mb-8 font-medium leading-relaxed">Know the perfect candidate? Share this role with them and help us find great talent.</p>
                  <ShareButton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
