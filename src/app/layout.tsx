import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kurs — Multi-currency Price Widget',
  description: 'Show prices in any currency, get paid in USDC.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-[var(--font-dm-sans)]">{children}</body>
    </html>
  );
}
