import type { Metadata } from 'next';
import { Archivo_Black, Barlow, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import { LINKS } from '@/lib/links';
import { CursorGlow } from '@/components/CursorGlow';
import { ScrollProgress } from '@/components/ScrollProgress';
import './globals.css';

// Archivo Black is the wide, heavy poster face the whole layout hangs off. Barlow
// keeps copy readable while a clock is running; JetBrains carries every figure.
const display = Archivo_Black({ subsets: ['latin'], weight: '400', variable: '--font-display' });
const body = Barlow({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-mono' });

const SITE = 'https://brawlzz.com';
const DESCRIPTION =
  'Two memecoins launch at the same second, priced in the same tokenized stock. '
  + 'One hour later the side that hit the higher market cap takes both tokens’ creator fees, paid in stock.';

export const metadata: Metadata = {
  title: { default: 'Brawlz', template: '%s · Brawlz' },
  description: DESCRIPTION,
  applicationName: 'Brawlz',
  ...(SITE ? { metadataBase: new URL(SITE) } : {}),
  // './' resolves per route, so every page declares itself canonical rather
  // than every page claiming to be the home page.
  alternates: { canonical: './' },
  openGraph: { title: 'Brawlz: two coins enter, one gets paid', description: DESCRIPTION, siteName: 'Brawlz', type: 'website', ...(SITE ? { url: SITE } : {}) },
  twitter: {
    card: 'summary_large_image',
    ...(LINKS.handle ? { site: LINKS.handle, creator: LINKS.handle } : {}),
    title: 'Brawlz: two coins enter, one gets paid', description: DESCRIPTION,
  },
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#000000' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The head script adds `motion` to <html> before React hydrates, so the
    // server HTML and the client tree legitimately differ on className. The class
    // is a no-JS guard rather than a motion preference: without it, reveal
    // animations would leave content at opacity 0 for anyone whose JS failed.
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)"
              + "document.documentElement.classList.add('motion')}catch(e){}",
          }}
        />
      </head>
      <body>
        <div className="arena" aria-hidden="true" />
        <ScrollProgress />
        <CursorGlow />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
