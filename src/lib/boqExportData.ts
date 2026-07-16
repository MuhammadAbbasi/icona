// Gathers everything the revised-BOQ workbook needs for a project: every priced
// line (original-sourced + extras), the revision rounds, and the measurement
// breakdowns. Shared by the direct export route and the Documents "generate"
// action so both produce an identical workbook.

import { prisma } from './prisma';
import type { ExportLine, ExportMeasurementBlock, ExportRevision } from './boqExport';

export async function getBoqExportInputs(projectId: string): Promise<{
  lines: ExportLine[];
  revisions: ExportRevision[];
  measurements: ExportMeasurementBlock[];
}> {
  const measurementSelect = {
    description: true, no: true, length: true, width: true, height: true, computed: true,
  } as const;

  const [subtasks, taskItems, revisions] = await Promise.all([
    prisma.subtask.findMany({
      where: { task: { domain: { projectId } } },
      select: {
        title: true, description: true, unit: true, quantity: true, rate: true,
        sourceSheet: true, sourceRow: true,
        quantityRevisions: { select: { revisionIndex: true, quantity: true, rate: true } },
        measurements: { select: measurementSelect, orderBy: { order: 'asc' } },
        task: { select: { title: true, domain: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    // Task-level measured/priced items (a section that is itself a single line).
    prisma.task.findMany({
      where: { domain: { projectId }, quantity: { not: null } },
      select: {
        title: true, unit: true, quantity: true, rate: true,
        domain: { select: { name: true } },
        subtasks: { select: { id: true }, take: 1 },
        measurements: { select: measurementSelect, orderBy: { order: 'asc' } },
      },
    }),
    prisma.boqRevision.findMany({
      where: { projectId }, orderBy: { index: 'asc' }, select: { index: true, label: true },
    }),
  ]);

  const lines: ExportLine[] = subtasks.map((s) => ({
    domain: s.task.domain.name,
    task: s.task.title,
    title: s.title,
    description: s.description,
    unit: s.unit,
    sourceSheet: s.sourceSheet,
    sourceRow: s.sourceRow,
    quantity: s.quantity,
    rate: s.rate,
    quantityRevisions: s.quantityRevisions,
  }));

  // A task carries its own quantity only when it has no priced subtasks.
  const taskLevel = taskItems.filter((t) => t.subtasks.length === 0);
  for (const t of taskLevel) {
    lines.push({
      domain: t.domain.name, task: t.title, title: t.title, description: null,
      unit: t.unit, sourceSheet: null, sourceRow: null, quantity: t.quantity, rate: t.rate,
      quantityRevisions: [],
    });
  }

  const measurements: ExportMeasurementBlock[] = [];
  const pushBlock = (domain: string, task: string, lineTitle: string, unit: string | null, rows: typeof subtasks[number]['measurements']) => {
    if (!rows.length) return;
    measurements.push({
      domain, task, lineTitle, unit, rows,
      total: rows.reduce((a, m) => a + (m.computed ?? 0), 0),
    });
  };
  // A subtask's parent task supplies the task context; a measured task with no
  // subtasks is its own line, so its task and line title are the same.
  for (const s of subtasks) pushBlock(s.task.domain.name, s.task.title, s.title, s.unit, s.measurements);
  for (const t of taskLevel) pushBlock(t.domain.name, t.title, t.title, t.unit, t.measurements);

  return { lines, revisions, measurements };
}
