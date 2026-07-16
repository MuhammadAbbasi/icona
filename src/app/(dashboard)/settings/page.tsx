export const dynamic = 'force-dynamic'
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Header } from '@/components/layout/Header';
import { SettingsForm } from '@/components/settings/SettingsForm';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Settings" description="Customize your profile, notification preferences, and global configurations" />
      <div className="flex-1 p-6 animate-fade-in">
        <SettingsForm />
      </div>
    </div>
  );
}
