import React from 'react';
import { Metadata } from 'next';
import { PressListClient } from './PressListClient';
import { BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Removed 'edge' runtime to allow Node.js environment variables resolution on Vercel build
export const runtime = 'edge';

export const metadata: Metadata = {
  title: 'Press Centre | Openlead',
  description: 'Stay up to date with the latest news, updates, and insights from the Openlead team.',
};

async function getPosts() {
  const { data, error } = await supabase
    .from('press_posts')
    .select('id, title, slug, seo_description, image_url, created_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching press posts:', error);
    return [];
  }
  return data || [];
}

export default async function PressCentrePage() {
  const posts = await getPosts();

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6">
            Press <span className="text-openlead-blue">Centre</span>
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Stay up to date with the latest news, updates, and insights from the Openlead team.
          </p>
        </div>

        {posts.length > 0 ? (
          <PressListClient posts={posts} />
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
            <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No news yet</h3>
            <p className="text-slate-500">Check back soon for the latest updates.</p>
          </div>
        )}
      </div>
    </div>
  );
}
