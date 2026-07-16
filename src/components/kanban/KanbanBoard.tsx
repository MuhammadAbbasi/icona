'use client';

import { useState, useRef } from 'react';
import { KanbanColumn } from './KanbanColumn';
import type { KanbanColumnMeta } from '@/lib/utils';
import type { KanbanProject } from './KanbanProjectCard';

interface Props {
  initialProjects: KanbanProject[];
  initialColumns: KanbanColumnMeta[];
  canDrag: boolean;
  canEditColumns: boolean;
}

export function KanbanBoard({ initialProjects, initialColumns, canDrag, canEditColumns }: Props) {
  const [projects, setProjects] = useState(initialProjects);
  const [columns, setColumns] = useState(initialColumns);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const draggedId = useRef<string | null>(null);
  const prevStatus = useRef<string | null>(null);

  const grouped = Object.fromEntries(
    columns.map((col) => [
      col.id,
      projects.filter((p) => p.status === col.id),
    ])
  );

  async function handleRename(colId: string, label: string): Promise<boolean> {
    const prev = columns.find((c) => c.id === colId)?.label ?? '';
    if (label === prev) return true;

    // Optimistic update
    setColumns((cols) => cols.map((c) => (c.id === colId ? { ...c, label } : c)));

    try {
      const res = await fetch(`/api/board/columns/${colId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) throw new Error('failed');
      return true;
    } catch {
      // Revert
      setColumns((cols) => cols.map((c) => (c.id === colId ? { ...c, label: prev } : c)));
      return false;
    }
  }

  function handleDragStart(id: string, status: string) {
    draggedId.current = id;
    prevStatus.current = status;
  }

  function handleDragOver(e: React.DragEvent, colId: string) {
    e.preventDefault();
    if (dragOver !== colId) setDragOver(colId);
  }

  function handleDragLeave() {
    setDragOver(null);
  }

  async function handleDrop(e: React.DragEvent, colId: string) {
    e.preventDefault();
    setDragOver(null);

    const id = draggedId.current;
    const old = prevStatus.current;
    if (!id || !old || colId === old) return;

    // Optimistic update
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: colId } : p))
    );
    draggedId.current = null;

    try {
      const res = await fetch(`/api/projects/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: colId }),
      });
      if (!res.ok) throw new Error('failed');
    } catch {
      // Revert
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: old } : p))
      );
    }
  }

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {columns.map((col) => (
        <KanbanColumn
          key={col.id}
          column={col}
          projects={grouped[col.id] ?? []}
          isDragOver={dragOver === col.id}
          canDrag={canDrag}
          canEdit={canEditColumns}
          onRename={handleRename}
          onDragStart={handleDragStart}
          onDragOver={(e) => handleDragOver(e, col.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, col.id)}
        />
      ))}
    </div>
  );
}
