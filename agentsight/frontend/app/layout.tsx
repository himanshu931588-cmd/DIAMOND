import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgentSight — AI Agent Security & Containment',
  description: 'Real-time eBPF interception, AI policy generation, and behavioral containment for autonomous AI agents.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0F172A] text-slate-100 antialiased selection:bg-sky-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
