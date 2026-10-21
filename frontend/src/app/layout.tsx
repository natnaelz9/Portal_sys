import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Temerachi Coffee Export Portal',
  description: 'Coffee export management system for Temerachi',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
