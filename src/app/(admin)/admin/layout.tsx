import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AssistantWidget } from '@/components/assistant/AssistantWidget';

export const metadata = {
  title: 'ICONA Super Admin Dashboard',
  description: 'Central control plane for ICONA platform administrators and founders.',
};

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.role !== 'SUPER_ADMIN') redirect('/board');

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 font-sans">
        {children}
      </div>
      {/* Enables AI Copilot Assistant for System Administrator across Super Admin Portal */}
      <AssistantWidget />
    </div>
  );
}
