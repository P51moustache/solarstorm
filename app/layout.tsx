import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/components/providers/AuthProvider';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#00D084',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://solarstorm.app'),
  title: {
    default: 'SolarStorm - Aurora & Space Weather Tracker',
    template: '%s | SolarStorm',
  },
  description: 'Track solar activity, aurora forecasts, and space weather in real-time. Get Kp index updates, solar wind data, and aurora probability maps.',
  keywords: ['aurora', 'northern lights', 'solar storm', 'space weather', 'kp index', 'solar wind', 'NOAA', 'geomagnetic'],
  authors: [{ name: 'SolarStorm' }],
  creator: 'SolarStorm',
  publisher: 'SolarStorm',
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'SolarStorm',
    title: 'SolarStorm - Aurora & Space Weather Tracker',
    description: 'Track solar activity, aurora forecasts, and space weather in real-time.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SolarStorm - Aurora Tracker',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SolarStorm - Aurora & Space Weather Tracker',
    description: 'Track solar activity, aurora forecasts, and space weather in real-time.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
