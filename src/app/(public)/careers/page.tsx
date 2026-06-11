import React from 'react';
import { supabase } from '@/lib/supabase';
import { Briefcase, MapPin, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Metadata } from 'next';

export const runtime = 'edge';
export const revalidate = 3600; // Revalidate every hour

export const metadata: Metadata = {
  title: 'Careers | Join the Openlead Team',
  description: 'Help us revolutionize the lead generation industry. We\'re always looking for talented individuals to join our mission.',
};

async function getJobs() {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'published')
    .eq('is_internal', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching jobs:', error);
    return [];
  }
  return data || [];
}

export default async function CareersPage() {
  const jobs = await getJobs();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-24">
      {/* Hero Section */}
      <div className="text-center mb-20">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-openlead-blue/5 border border-openlead-blue/10 text-openlead-blue text-xs font-black uppercase tracking-widest mb-6">
          <Briefcase className="w-3.5 h-3.5" />
          Careers at Openlead
        </div>
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-none mb-8">
          Build the future of <br />
          <span className="text-openlead-blue">lead generation.</span>
        </h1>
        <p className="max-w-2xl mx-auto text-xl text-slate-500 font-medium leading-relaxed">
          We're looking for ambitious builders, creative thinkers, and problem solvers to join our mission in revolutionizing the industry.
        </p>
      </div>

      {jobs.length > 0 ? (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <div key={job.id} className="group relative bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-500 flex flex-col h-full overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity">
                <Briefcase className="w-24 h-24 text-openlead-blue" />
              </div>
              
              <div className="flex-1 relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <span className="px-3 py-1 rounded-full bg-openlead-blue/10 text-openlead-blue text-[10px] font-black uppercase tracking-widest">
                    {job.type}
                  </span>
                </div>
                
                <h3 className="text-2xl font-black text-slate-900 mb-6 tracking-tight leading-tight group-hover:text-openlead-blue transition-colors">
                  {job.title}
                </h3>
                
                <div className="flex flex-col gap-4 mb-8">
                  <div className="flex items-center gap-3 text-slate-500 font-bold text-sm">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                      <MapPin className="w-4 h-4 text-slate-400" />
                    </div>
                    {job.location}
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 font-bold text-sm">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                      <Clock className="w-4 h-4 text-slate-400" />
                    </div>
                    {job.salary_range}
                  </div>
                </div>
                
                <p className="text-slate-500 line-clamp-3 mb-8 font-medium leading-relaxed">
                  {job.description}
                </p>
              </div>

              <Link 
                href={`/careers/${job.id}`} 
                className="relative z-10 w-full inline-flex items-center justify-center px-8 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-openlead-blue shadow-lg shadow-slate-900/10 hover:shadow-blue-500/20 transition-all group/btn"
              >
                View Details
                <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="max-w-2xl mx-auto text-center py-24 bg-white rounded-[40px] border border-slate-100 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Briefcase className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">No open positions today</h3>
          <p className="text-slate-500 font-medium mb-8">We're always growing. Check back soon or send us a speculative application.</p>
          <Link href="mailto:careers@openlead.com" className="inline-flex items-center font-black text-openlead-blue hover:underline">
            Get in touch
            <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Culture Teaser */}
      <div className="mt-32 p-12 md:p-20 bg-slate-900 rounded-[48px] relative overflow-hidden text-center md:text-left">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-openlead-blue/20 to-transparent pointer-events-none" />
        <div className="relative z-10 grid md:grid-cols-2 items-center gap-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-6 tracking-tight leading-tight">
              A culture built for <br />
              <span className="text-openlead-blue">high performance.</span>
            </h2>
            <p className="text-slate-400 text-lg font-medium leading-relaxed mb-8">
              We value speed, autonomy, and radical transparency. Join a team where your work has immediate impact.
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-8">
              <div>
                <p className="text-3xl font-black text-white tracking-tight">100%</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Remote Friendly</p>
              </div>
              <div>
                <p className="text-3xl font-black text-white tracking-tight">Unlimited</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Vacation Policy</p>
              </div>
              <div>
                <p className="text-3xl font-black text-white tracking-tight">Top-tier</p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Compensation</p>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="aspect-square rounded-[32px] overflow-hidden border-8 border-white/5 shadow-2xl">
              <img 
                src="https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Modern+minimalist+office+collaborative+workspace+luxury+lighting+high+resolution&image_size=square" 
                alt="Openlead Culture" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
