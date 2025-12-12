import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aivo Creator Portal',
  description: 'Create and manage marketplace content for Aivo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  );
}
