'use client';

import { useEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { KanbanProjectCard, type KanbanProject } from './KanbanProjectCard';

interface ColumnMeta {
  id: string;
  label: string;
  accent: string;
  text: string;
  border: string;
}

interface Props {
  column: ColumnMeta;
  projects: KanbanProject[];
  isDragOver: boolean;
  canDrag: boolean;
  canEdit: boolean;
  onRename: (colId: string, label: string) => Promise<boolean>;
  onDragStart: (id: string, status: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}

export function KanbanColumn({ column, projects, isDragOver, canDrag, canEdit, onRename, onDragStart, onDragOver, onDragLeave, onDrop }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(column.label);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEditing() {
    setDraft(column.label);
    setEditing(true);
  }

  async function commit() {
    const next = draft.trim();
    if (!next || next === column.label) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const ok = await onRename(column.id, next);
    setSaving(false);
    if (ok) setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditing(false);
    }
  }

  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Column header */}
      <div className="group flex items-center gap-2.5 mb-3 px-1">
        <span className={`h-2.5 w-2.5 rounded-full ${column.accent} flex-shrink-0`} />
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            disabled={saving}
            maxLength={40}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            className={`flex-1 min-w-0 text-sm font-semibold ${column.text} bg-transparent border-b border-current/40 outline-none leading-tight disabled:opacity-60`}
          />
        ) : (
          <>
            <h2 className={`text-sm font-semibold ${column.text} flex-1 leading-tight truncate`}>
              {column.label}
            </h2>
            {canEdit && (
              <button
                type="button"
                onClick={startEditing}
                aria-label={`Rename ${column.label} column`}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-foreground transition-opacity flex-shrink-0"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </>
        )}
        <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5 min-w-[22px] text-center">
          {projects.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        className={`flex-1 min-h-[200px] rounded-xl border-2 border-dashed p-2 space-y-2.5 transition-all duration-150 ${
          isDragOver
            ? `${column.border} bg-muted/60 scale-[1.01]`
            : 'border-transparent'
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {projects.length === 0 && !isDragOver && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50">
            No projects
          </div>
        )}
        {projects.map((project) => (
          <KanbanProjectCard
            key={project.id}
            project={project}
            canDrag={canDrag}
            onDragStart={onDragStart}
          />
        ))}
      </div>
    </div>
  );
}
