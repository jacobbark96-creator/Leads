import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://openlead.co.uk';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin-crm/', '/sales-crm/', '/client-portal/', '/staff/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}