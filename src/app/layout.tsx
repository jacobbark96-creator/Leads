import type { Metadata } from 'next';
import { Inter, Darker_Grotesque } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../components/AuthProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const darkerGrotesque = Darker_Grotesque({ subsets: ['latin'], variable: '--font-darker-grotesque' });

export const metadata: Metadata = {
  title: 'Openlead | High-Converting Exclusive Leads for Contractors',
  description: 'Stop fighting over shared data. Openlead generates exclusive, pre-qualified leads for Solar, Roofing, and Home Services directly to your CRM.',
  keywords: ['contractor leads', 'exclusive leads', 'solar leads', 'roofing leads', 'home services marketing', 'openlead', 'UK contractor leads'],
  authors: [{ name: 'Openlead' }],
  creator: 'Openlead',
  publisher: 'Openlead',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://openlead.co.uk'),
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://openlead.co.uk',
    siteName: 'Openlead',
    title: 'Openlead | Exclusive Leads for Contractors',
    description: 'Stop fighting over shared data. Openlead generates exclusive, pre-qualified leads for Solar, Roofing, and Home Services directly to your CRM.',
    images: [
      {
        url: '/openlead-emailheader.png',
        width: 1200,
        height: 630,
        alt: 'Openlead - Scale With High-Intent Leads',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Openlead | Exclusive Leads for Contractors',
    description: 'Stop fighting over shared data. Openlead generates exclusive, pre-qualified leads for Solar, Roofing, and Home Services directly to your CRM.',
    images: ['/openlead-emailheader.png'],
    creator: '@openlead',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/openlead-favicon.svg',
    shortcut: '/openlead-favicon.svg',
    apple: '/openlead-favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://pznqrbfgrvfmkdprifst.supabase.co" />
      </head>
      <body className={`${inter.className} ${inter.variable} ${darkerGrotesque.variable}`}>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}