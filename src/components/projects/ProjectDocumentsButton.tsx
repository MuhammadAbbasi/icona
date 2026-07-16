'use client';

import { useState, useEffect, useCallback } from 'react';
import { FolderOpen, FileSpreadsheet, FileText, Download, Trash2, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface DocItem {
  id: string;
  category: string;
  originalName: string;
  label: string | null;
  revisionIndex: number | null;
  sizeBytes: number | null;
  createdAt: string | Date;
  createdByName?: string | null;
  downloadUrl: string;
  isOriginal: boolean;
}

interface Props {
  projectId: string;
  canManage: boolean;
  hasOriginalFile: boolean;
}

function fmtSize(n: number | null): string {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const CATEGORY_LABEL: Record<string, string> = {
  ORIGINAL_BOQ: 'Original BOQ',
  REVISED_BOQ: 'Revised BOQ',
  CONTRACT: 'Contract',
  REVISED_CONTRACT: 'Revised Contract',
  BANK_STATEMENT: 'Bank Statement',
  OTHER: 'Document',
};

export function ProjectDocumentsButton({ projectId, canManage, hasOriginalFile }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [original, setOriginal] = useState<DocItem | null>(null);
  const [documents, setDocuments] = useState<DocItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/documents`);
      if (!res.ok) throw new Error('Failed to load documents');
      const data = await res.json();
      setOriginal(data.original);
      setDocuments(data.documents ?? []);
    } catch (e: any) {
      setError(e.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  async function generate() {
    setGenerating(true); setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/generate`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to generate revised BOQ');
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to generate revised BOQ');
    } finally {
      setGenerating(false);
    }
  }

  async function remove(id: string) {
    setDeletingId(id); setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (e: any) {
      setError(e.message || 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  }

  const rows = [original, ...documents].filter(Boolean) as DocItem[];

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-2 text-xs font-semibold h-9 border-border bg-card"
      >
        <FolderOpen className="h-4 w-4 text-primary" />
        Documents
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Project Documents
            </DialogTitle>
            <DialogDescription>
              Original BOQ and generated revised-BOQ exports. Contracts and statements can be added here later.
            </DialogDescription>
          </DialogHeader>

          {canManage && hasOriginalFile && (
            <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <div className="text-sm">
                <p className="font-medium text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" /> Generate revised BOQ
                </p>
                <p className="text-xs text-muted-foreground">Builds the current workbook (revision columns + Extra Works, Measurements, Revisions tabs) and saves a snapshot.</p>
              </div>
              <Button size="sm" onClick={generate} disabled={generating} className="gap-2 flex-shrink-0">
                {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <>Generate</>}
              </Button>
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {rows.length} document{rows.length === 1 ? '' : 's'}
            </p>
            <button onClick={load} className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <div className="space-y-2">
            {loading && !rows.length ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : !rows.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No documents yet.</p>
            ) : (
              rows.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5 hover:border-primary/30 transition-colors">
                  {d.isOriginal
                    ? <FileText className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    : <FileSpreadsheet className="h-5 w-5 text-emerald-500 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{d.label || d.originalName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {CATEGORY_LABEL[d.category] ?? d.category} · {fmtDate(d.createdAt)}
                      {d.sizeBytes ? ` · ${fmtSize(d.sizeBytes)}` : ''}
                      {d.createdByName ? ` · ${d.createdByName}` : ''}
                    </p>
                  </div>
                  <a href={d.downloadUrl} className="flex-shrink-0">
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                      <Download className="h-3.5 w-3.5" /> Download
                    </Button>
                  </a>
                  {canManage && !d.isOriginal && (
                    <button
                      onClick={() => remove(d.id)}
                      disabled={deletingId === d.id}
                      title="Delete"
                      className="text-muted-foreground hover:text-destructive p-1 flex-shrink-0"
                    >
                      {deletingId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
