import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  // Use the environment variable for production URL, fallback to localhost for dev
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://openlead.com';

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
