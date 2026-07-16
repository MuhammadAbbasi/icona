'use client';

import Link from 'next/link';
import { Building2, GripVertical, Layers3, CheckSquare, Wallet, Banknote, HandCoins } from 'lucide-react';
import { cn, PRIORITY_CONFIG, workValue, formatPKR, formatCurrency } from '@/lib/utils';
import type { Priority } from '@/types';

export interface KanbanProject {
  id: string;
  name: string;
  status: string;
  priority: string;
  progress: number;
  budget?: number | null;
  received?: number;
  outstandingLiabilities?: number;
  company: { name: string };
  ownerCompany?: { name: string } | null;
  domains: Array<{
    tasks: Array<{
      status: string;
      subtasks: Array<{ completed: boolean; quantity: number | null; rate: number | null }>;
    }>;
  }>;
}

interface Props {
  project: KanbanProject;
  canDrag: boolean;
  onDragStart: (id: string, status: string) => void;
}

export function KanbanProjectCard({ project, canDrag, onDragStart }: Props) {
  const priorityCfg = PRIORITY_CONFIG[project.priority as Priority];
  const allTasks = project.domains.flatMap((d) => d.tasks);
  const doneTasks = allTasks.filter((t) => t.status === 'DONE').length;
  const value = workValue(allTasks);

  const budget = project.budget ?? 0;
  const received = project.received ?? 0;
  const collectionPct = budget > 0 ? Math.min(100, (received / budget) * 100) : 0;
  const outstandingLiabilities = project.outstandingLiabilities ?? 0;

  return (
    <div
      draggable={canDrag}
      onDragStart={canDrag ? () => onDragStart(project.id, project.status) : undefined}
      className={cn(
        'group bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm',
        'hover:border-primary/40 hover:shadow-md transition-all duration-150',
        canDrag && 'cursor-grab active:cursor-grabbing active:opacity-60 active:scale-[0.97]'
      )}
    >
      {/* Drag handle + priority */}
      <div className="flex items-center justify-between">
        <span className={cn('flex items-center gap-1.5 text-[11px] font-medium', priorityCfg?.color)}>
          <span className={cn('h-1.5 w-1.5 rounded-full', priorityCfg?.dot)} />
          {priorityCfg?.label}
        </span>
        {canDrag && (
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
        )}
      </div>

      {/* Project name — clickable */}
      <Link href={`/projects/${project.id}`} onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-foreground leading-snug hover:text-primary transition-colors line-clamp-2">
          {project.name}
        </h3>
      </Link>

      {/* Executing Company & Client */}
      <div className="space-y-1">
        {project.ownerCompany?.name && (
          <div className="flex items-center gap-1.5 text-xs text-foreground/80 font-medium">
            <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-primary/70" />
            <span className="truncate">{project.ownerCompany.name}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {project.ownerCompany?.name ? (
            <>
              <span className="w-3.5 flex-shrink-0 text-center text-[10px] text-muted-foreground/40 font-bold">•</span>
              <span className="truncate">Client: {project.company.name}</span>
            </>
          ) : (
            <>
              <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{project.company.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
        <span className="flex items-center gap-1">
          <Layers3 className="h-3 w-3" />
          {project.domains.length} domains
        </span>
        <span className="flex items-center gap-1">
          <CheckSquare className="h-3 w-3" />
          {doneTasks}/{allTasks.length} tasks
        </span>
        <span className="font-semibold text-foreground">{project.progress}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${project.progress}%` }}
        />
      </div>

      {/* Cost — total estimated, with worth of work done vs remaining */}
      {value.total > 0 && (
        <div className="pt-2 border-t border-border/60 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Wallet className="h-3 w-3" /> Total cost
            </span>
            <span className="font-semibold text-foreground tabular-nums">{formatPKR(value.total)}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-emerald-600 dark:text-emerald-400">
              Done {formatPKR(value.completed)}
            </span>
            <span className="text-muted-foreground">
              Remaining {formatPKR(value.remaining)}
            </span>
          </div>
        </div>
      )}

      {/* Collection progress — client payments received vs contract budget */}
      {budget > 0 && (
        <div className="pt-2 border-t border-border/60 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Banknote className="h-3 w-3" /> Collected
            </span>
            <span className="font-semibold text-foreground tabular-nums">{Math.round(collectionPct)}%</span>
          </div>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${collectionPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-emerald-600 dark:text-emerald-400">PKR {formatCurrency(received)}</span>
            <span className="text-muted-foreground">of PKR {formatCurrency(budget)}</span>
          </div>
        </div>
      )}

      {/* Liabilities / Outstanding Loans */}
      {outstandingLiabilities > 0 && (
        <div className="pt-2 border-t border-border/60 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
              <HandCoins className="h-3.5 w-3.5" /> Payables/Loans
            </span>
            <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {formatPKR(outstandingLiabilities)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
