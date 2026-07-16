import Link from 'next/link';
import { ArrowRight, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { STATUS_CONFIG, PRIORITY_CONFIG, cn } from '@/lib/utils';
import type { ProjectStatus, Priority } from '@/types';

interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  priority: string;
  progress: number;
  company: { name: string };
  domains: Array<{ tasks: Array<{ status: string }> }>;
}

export function RecentProjects({ projects }: { projects: ProjectSummary[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle>Recent Projects</CardTitle>
        <Button variant="ghost" size="sm" asChild className="text-xs gap-1.5 text-muted-foreground">
          <Link href="/projects">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {projects.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No projects yet. Create one to get started.
            </div>
          )}
          {projects.map((project) => {
            const statusCfg = STATUS_CONFIG[project.status as ProjectStatus];
            const priorityCfg = PRIORITY_CONFIG[project.priority as Priority];
            const totalTasks = project.domains.flatMap((d) => d.tasks).length;
            const doneTasks = project.domains.flatMap((d) => d.tasks).filter((t) => t.status === 'DONE').length;

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-muted/40 transition-colors group"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5 text-primary/60" />
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {project.name}
                    </span>
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-md', statusCfg?.color)}>
                      {statusCfg?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{project.company.name}</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-xs text-muted-foreground">{doneTasks}/{totalTasks} tasks</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className={cn('text-xs font-medium flex items-center gap-1', priorityCfg?.color)}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', priorityCfg?.dot)} />
                      {priorityCfg?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={project.progress} className="h-1 flex-1" />
                    <span className="text-xs font-medium text-muted-foreground w-8 text-right">
                      {project.progress}%
                    </span>
                  </div>
                </div>

                <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
