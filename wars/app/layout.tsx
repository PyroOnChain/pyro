import type { Metadata } from 'next';
import { Anton, Barlow, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import { CursorGlow } from '@/components/CursorGlow';
import { ScrollProgress } from '@/components/ScrollProgress';
import './globals.css';

// Anton for the versus-screen headlines, Barlow for copy that has to be read
// while a clock is running, JetBrains for every figure on the page.
const display = Anton({ subsets: ['latin'], weight: '400', variable: '--font-display' });
const body = Barlow({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-mono' });

const SITE = 'https://stockwars.fun';
const DESCRIPTION =
  'Two memecoins launch at the same second, priced in the same tokenized stock. '
  + 'One hour later the side that hit the higher market cap takes both tokens’ creator fees, paid in stock.';

export const metadata: Metadata = {
  title: { default: 'Stock Wars', template: '%s · Stock Wars' },
  description: DESCRIPTION,
  applicationName: 'Stock Wars',
  metadataBase: new URL(SITE),
  openGraph: { title: 'Stock Wars — two coins enter, one gets paid', description: DESCRIPTION, siteName: 'Stock Wars', type: 'website', url: SITE },
  twitter: { card: 'summary_large_image', title: 'Stock Wars — two coins enter, one gets paid', description: DESCRIPTION },
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#0A0C12' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
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
