import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Sañcāra — Event Impact Intelligence',
  description: 'Event Impact Forecasting & Response Intelligence System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-0 lg:ml-64 p-4 sm:p-7 lg:p-9 overflow-auto min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
