import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export const metadata = {
  title: 'ICONA Super Admin Dashboard',
  description: 'Central control plane for ICONA platform administrators and founders.',
};

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The /admin/api/* routes already gate on SUPER_ADMIN (adminAuth.ts), but
  // that alone leaves any signed-in tenant user able to load this page shell
  // (middleware only checks "is logged in", not role). Gate the page itself
  // too, so a non-super-admin is redirected before render, not left staring
  // at a shell full of failed fetches.
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.role !== 'SUPER_ADMIN') redirect('/board');

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">{children}</div>
    </div>
  );
}
