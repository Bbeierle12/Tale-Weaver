
import type { Metadata } from 'next';
import { Literata } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

const literata = Literata({
  subsets: ['latin'],
  variable: '--font-literata',
});

export const metadata: Metadata = {
  title: 'Tale Weaver',
  description: 'An AI-powered ecosystem simulator and narrative playground',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${literata.variable} dark`}>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
