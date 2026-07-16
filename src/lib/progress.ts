import { prisma } from './prisma';
import { lineAmount, effectiveQuantity, effectiveRate } from './utils';

/**
 * Recalculates a project's completion percentage.
 *
 * Progress is value-weighted: the share of total BOQ line value (quantity × rate)
 * that has been completed, measured at the priced-line (subtask) level. This
 * reflects real delivered value rather than treating every line equally — a
 * high-value line moves the bar more than a trivial one.
 *
 * Fallbacks keep the bar sensible before any pricing exists:
 *   • subtasks but no priced amounts yet → completed-subtask count / total subtasks
 *   • no subtasks at all (task-only)      → completed-task count / total tasks
 */
export async function recalculateProjectProgress(projectId: string) {
  const tasks = await prisma.task.findMany({
    where: { domain: { projectId } },
    select: {
      status: true,
      subtasks: {
        select: {
          completed: true, quantity: true, completedQuantity: true, rate: true,
          quantityRevisions: { select: { revisionIndex: true, quantity: true, rate: true } },
        },
      },
    },
  });

  const subtasks = tasks.flatMap((t) => t.subtasks);
  const hasUncompletedTasks = tasks.some((t) => t.status !== 'DONE');
  const hasUncompletedSubtasks = subtasks.some((s) => !s.completed);

  let progress: number;

  if (subtasks.length > 0) {
    // Value is measured on the effective (latest-revised) quantity × rate.
    const totalValue = subtasks.reduce((sum, s) => sum + lineAmount(s), 0);

    if (totalValue > 0) {
      // Value earned = completed quantity × effective rate. A fully-done line
      // credits its whole amount; a partially-done line credits only the portion
      // completed. Completed quantity is capped at the effective quantity so a
      // downward revision below already-completed work clamps the line to 100%.
      const earnedValue = subtasks.reduce((sum, s) => {
        const effQty = effectiveQuantity(s);
        const rawDone = s.completedQuantity != null
          ? s.completedQuantity
          : (s.completed ? effQty : 0);
        const doneQty = Math.min(rawDone, effQty);
        return sum + doneQty * effectiveRate(s);
      }, 0);
      progress = Math.round((earnedValue / totalValue) * 100);
    } else {
      // No pricing entered yet — fall back to completed-line count.
      const done = subtasks.filter((s) => s.completed).length;
      progress = Math.round((done / subtasks.length) * 100);
    }
  } else {
    // Task-only project (no priced lines) — fall back to completed-task count.
    const done = tasks.filter((t) => t.status === 'DONE').length;
    progress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
  }

  // Cap progress if there is outstanding work
  if (progress >= 100 && (hasUncompletedTasks || hasUncompletedSubtasks)) {
    progress = 99;
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { progress },
  });
}
