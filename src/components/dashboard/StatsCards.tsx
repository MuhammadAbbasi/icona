import { FolderKanban, CheckCircle2, ClipboardList, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface StatsCardsProps {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  overallProgress: number;
}

const stats = (p: StatsCardsProps) => [
  {
    title: 'Total Projects',
    value: p.totalProjects,
    sub: `${p.activeProjects} active`,
    icon: FolderKanban,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    trend: '+2 this month',
  },
  {
    title: 'Total Tasks',
    value: p.totalTasks,
    sub: `${p.completedTasks} completed`,
    icon: ClipboardList,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    trend: `${p.totalTasks - p.completedTasks} remaining`,
  },
  {
    title: 'Completed',
    value: p.completedTasks,
    sub: `of ${p.totalTasks} tasks`,
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    trend: 'Up 12% this week',
  },
  {
    title: 'Overall Progress',
    value: `${p.overallProgress}%`,
    sub: 'Across all projects',
    icon: TrendingUp,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    progress: p.overallProgress,
  },
];

export function StatsCards(props: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats(props).map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="relative overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={cn('p-2.5 rounded-xl', stat.bg)}>
                  <Icon className={cn('h-5 w-5', stat.color)} />
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {stat.trend}
                </span>
              </div>
              <div className="space-y-0.5">
                <div className="text-3xl font-bold text-foreground tracking-tight">{stat.value}</div>
                <div className="text-sm font-medium text-foreground/80">{stat.title}</div>
                <div className="text-xs text-muted-foreground">{stat.sub}</div>
              </div>
              {stat.progress !== undefined && (
                <div className="mt-3">
                  <Progress value={stat.progress} className="h-1.5" />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
