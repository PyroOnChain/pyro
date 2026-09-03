import type { Metadata } from 'next';
import { Anton, Inter, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { BRAND } from '@/lib/config';

// Self-hosted at build time by next/font. A <link> to Google Fonts would add a
// render-blocking request to a third party on every first paint.
const display = Anton({ subsets: ['latin'], weight: '400', variable: '--font-display', display: 'swap' });
const sans = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sans', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono', display: 'swap' });

const DESCRIPTION =
  'A memecoin whose creator fees are collected in ETH and spent on whole shares of tokenized NVDA. '
  + 'The treasury is one public address, so every share it owns can be checked on-chain.';

const TITLE = `${BRAND.name}: the treasury climbs up`;

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: DESCRIPTION,
  applicationName: BRAND.name,
  metadataBase: new URL(BRAND.site),
  alternates: { canonical: '/' },
  openGraph: { title: TITLE, description: DESCRIPTION, siteName: BRAND.name, type: 'website', url: BRAND.site },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    ...(BRAND.x ? { site: `@${BRAND.x.split('/').pop()}`, creator: `@${BRAND.x.split('/').pop()}` } : {}),
  },
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#08090B' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
