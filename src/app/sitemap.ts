import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

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

  return [...staticEntries, ...pressEntries];
}
