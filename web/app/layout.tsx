import type { Metadata } from 'next';
import { Chakra_Petch, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const display = Chakra_Petch({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-display' });
const body = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-mono' });

const DESCRIPTION =
  'Put tokenized stock in the jar. Pyro launches one mascot coin per club, priced in the stock itself, ' +
  'so every trade of it sends fees back to the jar as more stock.';

export const metadata: Metadata = {
  title: { default: 'Pyro', template: '%s · Pyro' },
  description: DESCRIPTION,
  applicationName: 'Pyro',
  openGraph: {
    title: 'Pyro — your meme buys your stock',
    description: DESCRIPTION,
    siteName: 'Pyro',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pyro — your meme buys your stock',
    description: DESCRIPTION,
  },
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#FBF9F6' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
