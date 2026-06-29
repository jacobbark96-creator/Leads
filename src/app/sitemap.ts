import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';
export const revalidate = 3600; // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://openlead.co.uk';

  // Core static public routes
  const staticRoutes = [
    '',
    '/about',
    '/services',
    '/morals',
    '/careers',
    '/press',
    '/roi-calculator',
    '/privacy',
    '/terms',
    '/anti-bribery',
    '/login',
  ];

  const staticEntries = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString().split('T')[0],
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  // Fetch dynamic press posts
  const { data: posts } = await supabase
    .from('press_posts')
    .select('slug, updated_at')
    .eq('is_published', true);

  const pressEntries = (posts || []).map((post) => ({
    url: `${baseUrl}/press/${post.slug}`,
    lastModified: new Date(post.updated_at || new Date()).toISOString().split('T')[0],
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // Fetch dynamic job posts (strictly public and published only)
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, updated_at')
    .eq('status', 'published')
    .eq('is_internal', false);

  const jobEntries = (jobs || []).map((job) => ({
    url: `${baseUrl}/careers/${job.id}`,
    lastModified: new Date(job.updated_at || new Date()).toISOString().split('T')[0],
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticEntries, ...pressEntries, ...jobEntries];
}
