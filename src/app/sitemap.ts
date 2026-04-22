import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  // Use the production URL explicitly for SEO
  const baseUrl = 'https://openlead.co.uk';

  // Core static public routes
  const routes = [
    '',          // Home page
    '/about',    // About Us page
    '/services', // Services / What We Do page
    '/morals',   // Our Morals page
    '/login',    // Login page
  ];

  const sitemapEntries = routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  // If you ever add a public blog or public lead directory in the future,
  // you would fetch those dynamic items from Supabase here and append them
  // to the `sitemapEntries` array before returning.

  return sitemapEntries;
}
