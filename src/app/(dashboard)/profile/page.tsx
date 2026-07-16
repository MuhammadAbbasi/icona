export const dynamic = 'force-dynamic'
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Mail, Phone, MapPin, Briefcase, Building2, Users, CalendarDays, FolderKanban,
} from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm';
import { getInitials, ROLE_CONFIG, cn } from '@/lib/utils';
import type { Role } from '@/types';

interface Props { params: { id: string } }

export const metadata = { title: 'Profile' };

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/60 last:border-0">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{label}</span>
      <span className="text-sm text-foreground font-medium truncate">{value || <span className="text-muted-foreground/50 font-normal">Not set</span>}</span>
    </div>
  );
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      company: { select: { name: true } },
      project: { select: { id: true, name: true, status: true } }, // freelancer's engaged project
      assignedTasks: {
        select: { domain: { select: { project: { select: { id: true, name: true, status: true } } } } },
      },
    },
  });
  if (!user) redirect('/login');

  // Distinct projects the user is part of: assigned tasks + any direct engagement.
  const projectMap = new Map<string, { id: string; name: string; status: string }>();
  for (const t of user.assignedTasks) {
    const p = t.domain.project;
    if (!projectMap.has(p.id)) projectMap.set(p.id, p);
  }
  if (user.project && !projectMap.has(user.project.id)) projectMap.set(user.project.id, user.project);
  const projects = Array.from(projectMap.values());

  const roleCfg = ROLE_CONFIG[user.role as Role];

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Profile" description="Your account details, projects and security" />

      <div className="flex-1 p-6 space-y-6 animate-fade-in max-w-2xl">
        {/* Identity */}
        <Card>
          <CardContent className="p-6 flex items-center gap-5">
            <AvatarUpload
              userId={user.id}
              userName={user.name}
              initialAvatar={user.avatar}
              size="xl"
            />
            <div className="space-y-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground truncate">{user.name}</h2>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                {roleCfg && (
                  <span className={cn('inline-block text-xs font-medium px-2 py-0.5 rounded-md', roleCfg.color)}>
                    {roleCfg.label}
                  </span>
                )}
                <span className={cn('text-[11px] font-medium px-1.5 py-0.5 rounded-md',
                  user.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400')}>
                  {user.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-lg border border-border p-3">
              <InfoRow icon={Mail} label="Email" value={user.email} />
              <InfoRow icon={Phone} label="Phone" value={user.phone} />
              <InfoRow icon={MapPin} label="Address" value={user.address} />
              <InfoRow icon={Briefcase} label="Job Title" value={user.position} />
              <InfoRow icon={Users} label="Department" value={user.department} />
              <InfoRow icon={Building2} label="Company" value={user.company?.name} />
              <InfoRow icon={CalendarDays} label="Joined" value={format(new Date(user.createdAt), 'dd MMM yyyy')} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              To update these details, contact an administrator.
            </p>
          </CardContent>
        </Card>

        {/* Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-muted-foreground" /> Projects ({projects.length})
            </CardTitle>
            <CardDescription>Projects you are part of.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-1.5">
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Not assigned to any project yet.</p>
            ) : (
              projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/40 transition-colors">
                  <span className="text-sm text-foreground truncate">{p.name}</span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{p.status.replace(/_/g, ' ')}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Change password */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change Password</CardTitle>
            <CardDescription>
              Passwords are encrypted with bcrypt (cost factor 12) before storage. Choose at least 8 characters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
