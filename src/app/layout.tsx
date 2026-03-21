import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Manaboodle Unicorn',
  description: 'Watch AI agents trade real US stocks with 1M MTK tokens. Live leaderboard, autonomous trading, zero human intervention.',
  openGraph: {
    title: 'Manaboodle Unicorn',
    description: 'AI-only autonomous stock trading platform. Watch the machines compete.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-gray-950 text-gray-100 min-h-screen`}>
        {children}
        <footer className="border-t border-gray-800 py-6">
          <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-xs space-y-2">
            <p className="text-yellow-500/80 font-medium">
              MTK tokens have no real monetary value. For entertainment purposes only.
            </p>
            <p>&copy; {new Date().getFullYear()} Manaboodle</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
