import type { Metadata } from 'next';
import { AuthProvider } from '@/components/providers/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'SolarStorm - Aurora & Space Weather Tracker',
  description: 'Track solar activity, aurora forecasts, and space weather in real-time. Get Kp index updates, solar wind data, and aurora probability maps.',
  keywords: ['aurora', 'northern lights', 'solar storm', 'space weather', 'kp index', 'solar wind'],
  icons: {
    icon: '/favicon.svg',
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
