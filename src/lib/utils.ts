import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  if (amount >= 10_000_000) {
    const val = amount / 10_000_000;
    return `${Number(val.toFixed(2))} Cr`;
  }
  if (amount >= 100_000) {
    const val = amount / 100_000;
    return `${Number(val.toFixed(2))} Lac`;
  }
  return new Intl.NumberFormat('en-PK').format(amount);
}

export function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

// ── BOQ amount rollups ──────────────────────────────────────────────
// A priced line item's amount = quantity × rate. "Rate Only" items
// (quantity 0/empty) naturally contribute 0.
//
// Quantities and rates may be revised in ordered rounds (variation orders).
// `quantity`/`rate` are the original (R0) baseline; `quantityRevisions` carries
// the per-round changes. The "effective" value is the latest revision that
// applies, falling back to the original. An explicit `effectiveQuantity`/
// `effectiveRate` override (precomputed on the server) wins when no round bound
// is given.
type QtyRevision = { revisionIndex: number; quantity: number; rate?: number | null };
type Priced = {
  quantity?: number | null;
  rate?: number | null;
  effectiveQuantity?: number | null;
  effectiveRate?: number | null;
  quantityRevisions?: QtyRevision[] | null;
};

/** Effective quantity at-or-before `uptoIndex` (default: latest round). */
export function effectiveQuantity(item: Priced, uptoIndex = Infinity): number {
  if (uptoIndex === Infinity && item.effectiveQuantity != null) return item.effectiveQuantity;
  let best: QtyRevision | undefined;
  for (const r of item.quantityRevisions ?? []) {
    if (r.revisionIndex <= uptoIndex && (!best || r.revisionIndex > best.revisionIndex)) best = r;
  }
  if (best && best.quantity != null) return best.quantity;
  return item.quantity ?? 0;
}

/** Effective unit rate at-or-before `uptoIndex` — only rounds that actually
 *  changed the rate count; otherwise the rate carries forward from the original. */
export function effectiveRate(item: Priced, uptoIndex = Infinity): number {
  if (uptoIndex === Infinity && item.effectiveRate != null) return item.effectiveRate;
  let best: QtyRevision | undefined;
  for (const r of item.quantityRevisions ?? []) {
    if (r.revisionIndex <= uptoIndex && r.rate != null && (!best || r.revisionIndex > best.revisionIndex)) best = r;
  }
  if (best && best.rate != null) return best.rate;
  return item.rate ?? 0;
}

export function lineAmount(item: Priced): number {
  return effectiveQuantity(item) * effectiveRate(item);
}

export function sumAmounts(items: Priced[]): number {
  return items.reduce((total, item) => total + lineAmount(item), 0);
}

// Original (R0) figures — used for the "old value" side of every comparison.
export function originalLineAmount(item: Priced): number {
  return (item.quantity ?? 0) * (item.rate ?? 0);
}

export function sumOriginalAmounts(items: Priced[]): number {
  return items.reduce((total, item) => total + originalLineAmount(item), 0);
}

// Precise PKR figure (BOQ totals are shown in full, not Lac/Cr).
export function formatPKR(amount: number) {
  return `PKR ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(amount)}`;
}

// Worth-of-work breakdown for a project (or domain): total estimated value,
// value already earned (completed), and value still outstanding.
// A line item's value is "earned" when its subtask is ticked complete, or its
// parent task is marked DONE (the whole section is finished).
type ValuedTask = {
  status?: string | null;
  subtasks: Array<Priced & { completed?: boolean | null }>;
};

export function workValue(tasks: ValuedTask[]): { total: number; completed: number; remaining: number } {
  let total = 0;
  let completed = 0;
  for (const task of tasks) {
    const taskDone = task.status === 'DONE';
    for (const sub of task.subtasks) {
      const amount = lineAmount(sub);
      total += amount;
      if (taskDone || sub.completed) completed += amount;
    }
  }
  return { total, completed, remaining: total - completed };
}

// Kanban project phases
export const KANBAN_COLUMNS = [
  { id: 'UNDER_REVIEW',          label: 'Under Review',           accent: 'bg-slate-500',   ring: 'ring-slate-500/20',   text: 'text-slate-600 dark:text-slate-400',   border: 'border-slate-200 dark:border-slate-700' },
  { id: 'CONTRACT_FILLED',       label: 'Contract Filled',        accent: 'bg-violet-500',  ring: 'ring-violet-500/20',  text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800' },
  { id: 'ONGOING',               label: 'Ongoing',                accent: 'bg-indigo-500',  ring: 'ring-indigo-500/20',  text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
  { id: 'UNDER_CUSTOMER_REVIEW', label: 'Under Customer Review',  accent: 'bg-amber-500',   ring: 'ring-amber-500/20',   text: 'text-amber-600 dark:text-amber-400',   border: 'border-amber-200 dark:border-amber-800' },
  { id: 'COMPLETED',             label: 'Completed',              accent: 'bg-emerald-500', ring: 'ring-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
] as const;

export type KanbanStatus = typeof KANBAN_COLUMNS[number]['id'];

export type KanbanColumnMeta = {
  id: string;
  label: string;
  accent: string;
  ring: string;
  text: string;
  border: string;
};

// Merge the fixed column definitions with admin-customized labels.
export function mergeColumnLabels(
  overrides: Array<{ id: string; label: string }>
): KanbanColumnMeta[] {
  const labelMap = Object.fromEntries(overrides.map((o) => [o.id, o.label]));
  return KANBAN_COLUMNS.map((col) => ({
    ...col,
    label: labelMap[col.id] ?? col.label,
  }));
}

// Task-level statuses (inside project detail)
export const TASK_STATUS_CONFIG = {
  TODO:        { label: 'To Do',       color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  REVIEW:      { label: 'Review',      color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  DONE:        { label: 'Done',        color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  BLOCKED:     { label: 'Blocked',     color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
} as const;

export const PRIORITY_CONFIG = {
  LOW:      { label: 'Low',      color: 'text-slate-500', dot: 'bg-slate-400' },
  MEDIUM:   { label: 'Medium',   color: 'text-amber-600', dot: 'bg-amber-400' },
  HIGH:     { label: 'High',     color: 'text-orange-600', dot: 'bg-orange-500' },
  CRITICAL: { label: 'Critical', color: 'text-rose-600',  dot: 'bg-rose-500' },
} as const;

export const ROLE_CONFIG = {
  SUPER_ADMIN:{ label: 'Super Admin',   color: 'bg-blue-600 text-white font-bold' },
  ADMIN:      { label: 'Admin',         color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400' },
  MANAGER:    { label: 'Manager',       color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' },
  EMPLOYEE:   { label: 'Employee',      color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' },
  FREELANCER: { label: 'Project Based', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400' },
  CLIENT:     { label: 'Client',        color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
} as const;

// Keep for backward compat in project detail
export const STATUS_CONFIG = {
  ...TASK_STATUS_CONFIG,
  UNDER_REVIEW:          { label: 'Under Review',          color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  CONTRACT_FILLED:       { label: 'Contract Filled',       color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  ONGOING:               { label: 'Ongoing',               color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  UNDER_CUSTOMER_REVIEW: { label: 'Under Customer Review', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  COMPLETED:             { label: 'Completed',             color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
} as const;
