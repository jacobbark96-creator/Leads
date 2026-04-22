import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://openlead.co.uk';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin-crm/', '/sales-crm/', '/client-portal/', '/staff/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}