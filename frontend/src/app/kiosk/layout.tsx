import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KEPOS Self-Service Kiosk',
  description: 'Pemesanan Mandiri KEPOS Kiosk Terminal',
};

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground antialiased font-sans select-none overflow-x-hidden">
      {children}
    </div>
  );
}
