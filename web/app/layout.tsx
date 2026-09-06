import type { Metadata } from 'next';
import { Pixelify_Sans, Nunito, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import { CursorGlow } from '@/components/CursorGlow';
import { ScrollProgress } from '@/components/ScrollProgress';
import './globals.css';

// Pixelify carries the blocky wordmark look for headings; Nunito keeps body copy
// friendly and readable, and JetBrains stays on the numbers, where a pixel face
// would cost more legibility than it is worth.
const display = Pixelify_Sans({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display' });
const body = Nunito({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-mono' });

/** The live host. Absolute URLs in the social card are built from this. */
const SITE = 'https://totemzapp.com';

const DESCRIPTION =
  'Put tokenized stock in the vault. Totem launches one mascot coin per club, priced in the stock ' +
  'itself, so every trade of it sends fees back to the vault as more stock.';

export const metadata: Metadata = {
  title: { default: 'Totem', template: '%s · Totem' },
  description: DESCRIPTION,
  applicationName: 'Totem',
  ...(SITE ? { metadataBase: new URL(SITE) } : {}),
  openGraph: {
    title: 'Totem — your meme buys your stock',
    description: DESCRIPTION,
    siteName: 'Totem',
    type: 'website',
    ...(SITE ? { url: SITE } : {}),
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Totem — your meme buys your stock',
    description: DESCRIPTION,
  },
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#FFD9B0' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Enables the scroll-reveal styles only when JS can actually run them.
            Without this the page would render blank if the script failed. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)" +
              "document.documentElement.classList.add('motion')}catch(e){}",
          }}
        />
      </head>
      <body>
        <div className="sky" aria-hidden="true" />
        <ScrollProgress />
        <CursorGlow />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
