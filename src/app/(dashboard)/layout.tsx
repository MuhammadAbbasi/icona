import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Providers } from '@/components/providers/Providers';
import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient';
import { AssistantWidget } from '@/components/assistant/AssistantWidget';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <Providers>
      <DashboardLayoutClient>
        {children}
        <AssistantWidget />
      </DashboardLayoutClient>
    </Providers>
  );
}
