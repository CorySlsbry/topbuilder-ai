import type { Metadata, Viewport } from 'next';
import { Outfit, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { PageviewBeacon } from '@/components/platform/pageview-beacon';

// Outfit = clean geometric display/sans (no generic Inter). JetBrains Mono for
// all numerals/metrics in the dashboard + charts (tabular, enterprise feel).
const sans = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const SITE_DESC =
  'Six self-learning AI agents installed on the ServiceTitan you already run. Booking and Dispatch agents that beat ServiceTitan’s own, plus Financial, Inventory, Workforce, and Documents agents it never built. $8,000 Founding-25 install, then a monthly priced to your team. Board-ready or it’s free. Buildertrend via custom build; Procore in early access.';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://topbuilderai.com'),
  title: {
    default: 'Top Builder AI · Six self-learning AI agents on your ServiceTitan',
    template: '%s · Top Builder AI',
  },
  description: SITE_DESC,
  applicationName: 'Top Builder AI',
  keywords: [
    'AI agents for ServiceTitan',
    'self-learning AI agents for contractors',
    'ServiceTitan AI agents alternative',
    'AI booking agent for contractors',
    'AI dispatch and routing for ServiceTitan',
    'construction back office AI',
    'AI for HVAC plumbing electrical contractors',
    'Buildertrend AI',
    'Procore AI',
  ],
  authors: [{ name: 'Cory Salisbury' }],
  creator: 'Salisbury Bookkeeping LLC',
  publisher: 'Salisbury Bookkeeping LLC',
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  openGraph: {
    title: 'Top Builder AI · Six self-learning AI agents on your ServiceTitan',
    description: SITE_DESC,
    siteName: 'Top Builder AI',
    url: 'https://topbuilderai.com',
    type: 'website',
    locale: 'en_US',
    images: [{ url: '/logo.svg', alt: 'Top Builder AI' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Top Builder AI · Six self-learning AI agents on your ServiceTitan',
    description: SITE_DESC,
    images: ['/logo.svg'],
  },
  other: {
    // WebMCP discovery — advertise the read-only MCP endpoint to agents.
    'mcp-server': 'https://topbuilderai.com/mcp',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable} font-sans antialiased`}>
        {children}
        <PageviewBeacon />
      </body>
    </html>
  );
}
