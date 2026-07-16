export const dynamic = 'force-dynamic'
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import {
  ArrowLeft, Users, Mail, Briefcase, FolderKanban, ListChecks,
  CheckCircle2, Building2, ChevronRight,
} from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/Header';
import { TeamWorkersManager } from '@/components/teams/TeamWorkersManager';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  getInitials, ROLE_CONFIG, STATUS_CONFIG, PRIORITY_CONFIG, cn,
} from '@/lib/utils';
import type { Role, ProjectStatus, Priority } from '@/types';

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props) {
  const team = await prisma.team.findUnique({ where: { id: params.id }, select: { name: true } });
  return { title: team?.name ?? 'Team' };
}

export default async function TeamDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'MANAGER'].includes(session?.user?.role ?? '')) redirect('/');

  const team = await prisma.team.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true, name: true, email: true, role: true, avatar: true,
              company: { select: { name: true } },
              _count: { select: { assignedTasks: true } },
            },
          },
        },
      },
      workers: {
        select: {
          id: true,
          name: true,
          role: true,
          phone: true,
          notes: true,
          dailyWage: true,
        },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!team) notFound();

  const memberIds = team.members.map((m) => m.user.id);

  // Tasks assigned to any team member → derive the projects this team works on
  const tasks = memberIds.length
    ? await prisma.task.findMany({
        where: { assigneeId: { in: memberIds } },
        select: {
          id: true,
          status: true,
          assigneeId: true,
          domain: {
            select: {
              project: {
                select: {
                  id: true, name: true, status: true, priority: true, progress: true,
                  company: { select: { name: true } },
                },
              },
            },
          },
        },
      })
    : [];

  // Per-member task stats (within this team's scope = all their assigned tasks)
  const memberStats = new Map<string, { total: number; done: number }>();
  for (const t of tasks) {
    if (!t.assigneeId) continue;
    const s = memberStats.get(t.assigneeId) ?? { total: 0, done: 0 };
    s.total += 1;
    if (t.status === 'DONE') s.done += 1;
    memberStats.set(t.assigneeId, s);
  }

  // Aggregate projects the team touches
  type ProjAgg = {
    id: string; name: string; status: string; priority: string; progress: number;
    company: string; taskCount: number; doneCount: number; memberIds: Set<string>;
  };
  const projectMap = new Map<string, ProjAgg>();
  for (const t of tasks) {
    const p = t.domain?.project;
    if (!p) continue;
    const agg = projectMap.get(p.id) ?? {
      id: p.id, name: p.name, status: p.status, priority: p.priority, progress: p.progress,
      company: p.company.name, taskCount: 0, doneCount: 0, memberIds: new Set<string>(),
    };
    agg.taskCount += 1;
    if (t.status === 'DONE') agg.doneCount += 1;
    if (t.assigneeId) agg.memberIds.add(t.assigneeId);
    projectMap.set(p.id, agg);
  }
  const projects = Array.from(projectMap.values()).sort((a, b) => b.taskCount - a.taskCount);

  const memberById = new Map(team.members.map((m) => [m.user.id, m.user]));
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'DONE').length;

  const stats = [
    { label: 'Members', value: team.members.length, icon: Users, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { label: 'Projects', value: projects.length, icon: FolderKanban, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { label: 'Total Tasks', value: totalTasks, icon: ListChecks, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Completed', value: doneTasks, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <Header title={team.name} description={`${team.members.length} member${team.members.length !== 1 ? 's' : ''}`} />

      <div className="flex-1 p-6 space-y-6 animate-fade-in">
        <Link href="/teams" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Teams
        </Link>

        {/* Hero */}
        <div className="p-5 rounded-xl border bg-card flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
            <Users className="h-7 w-7 text-violet-500" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-foreground">{team.name}</h2>
            {team.description
              ? <p className="text-sm text-muted-foreground leading-relaxed mt-1">{team.description}</p>
              : <p className="text-sm text-muted-foreground/60 italic mt-1">No description</p>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0', s.bg)}>
                  <s.icon className={cn('h-5 w-5', s.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground leading-none">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Members */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Members</h3>
            <span className="text-xs text-muted-foreground">({team.members.length})</span>
          </div>

          {team.members.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center rounded-xl border border-dashed">
              <Users className="h-8 w-8 text-muted-foreground/20 mb-2" />
              <p className="text-sm text-muted-foreground">No members in this team yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {team.members.map(({ user }) => {
                const roleCfg = ROLE_CONFIG[user.role as Role];
                const st = memberStats.get(user.id) ?? { total: 0, done: 0 };
                const pct = st.total ? Math.round((st.done / st.total) * 100) : 0;
                return (
                  <Card key={user.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11">
                          <AvatarFallback className="text-sm bg-primary/10 text-primary font-semibold">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-foreground truncate">{user.name}</p>
                          <span className={cn('inline-block text-[11px] font-medium px-1.5 py-0.5 rounded-md mt-0.5', roleCfg?.color)}>
                            {roleCfg?.label}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <p className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3.5 w-3.5 flex-shrink-0" /> {user.email}
                        </p>
                        {user.company?.name && (
                          <p className="flex items-center gap-1.5 truncate">
                            <Building2 className="h-3.5 w-3.5 flex-shrink-0" /> {user.company.name}
                          </p>
                        )}
                        <p className="flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5 flex-shrink-0" /> {user._count.assignedTasks} assigned task{user._count.assignedTasks !== 1 ? 's' : ''}
                        </p>
                      </div>

                      {st.total > 0 && (
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">{st.done}/{st.total} done</span>
                            <span className="font-medium text-foreground">{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Workers */}
        <section className="space-y-3 border-t border-border/60 pt-6">
          <TeamWorkersManager teamId={team.id} initialWorkers={team.workers as any} canEdit={['ADMIN', 'MANAGER'].includes(session?.user?.role ?? '')} />
        </section>

        {/* Projects */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Projects</h3>
            <span className="text-xs text-muted-foreground">({projects.length})</span>
          </div>

          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center rounded-xl border border-dashed">
              <FolderKanban className="h-8 w-8 text-muted-foreground/20 mb-2" />
              <p className="text-sm text-muted-foreground">
                No projects yet: this team has no tasks assigned across any project.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {projects.map((p) => {
                const statusCfg = STATUS_CONFIG[p.status as ProjectStatus];
                const priorityCfg = PRIORITY_CONFIG[p.priority as Priority];
                const involved = Array.from(p.memberIds).map((id) => memberById.get(id)).filter(Boolean);
                return (
                  <Link key={p.id} href={`/projects/${p.id}`} className="group">
                    <Card className="h-full hover:shadow-md hover:border-primary/30 transition-all duration-150">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">{p.name}</h4>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                              <Building2 className="h-3 w-3 flex-shrink-0" /> {p.company}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-md', statusCfg?.color)}>
                            {statusCfg?.label}
                          </span>
                          <span className={cn('text-[11px] font-medium flex items-center gap-1', priorityCfg?.color)}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', priorityCfg?.dot)} />
                            {priorityCfg?.label}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">{p.doneCount}/{p.taskCount} team task{p.taskCount !== 1 ? 's' : ''} done</span>
                            <span className="font-medium text-foreground">{p.progress}%</span>
                          </div>
                          <Progress value={p.progress} className="h-1.5" />
                        </div>

                        <div className="flex items-center gap-1.5 pt-0.5">
                          <div className="flex -space-x-2">
                            {involved.slice(0, 5).map((u) => (
                              <Avatar key={u!.id} className="h-6 w-6 ring-2 ring-card">
                                <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">
                                  {getInitials(u!.name)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          {involved.length > 5 && (
                            <span className="text-[11px] text-muted-foreground">+{involved.length - 5}</span>
                          )}
                          <span className="text-[11px] text-muted-foreground ml-auto">
                            {involved.length} member{involved.length !== 1 ? 's' : ''} working
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
