'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Trash2, Loader2, FolderPlus, Sparkles, FileSpreadsheet,
  PencilLine, Upload, Square, CheckSquare, Settings2, X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { findBoqTemplate, BOQ_TEMPLATE, TemplateDomain } from '@/lib/templates';
import { formatPKR, cn } from '@/lib/utils';
import type { ParsedBoq } from '@/lib/boqParser';

interface Company { id: string; name: string; type: string; }
interface Props { open: boolean; onOpenChange: (v: boolean) => void; companies: Company[]; }

const DOMAIN_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const DEFAULT_DOMAINS = BOQ_TEMPLATE.map((d) => d.label);

interface DomainEntry { name: string; color: string; importTemplate: boolean; customTasks?: any[]; saveTemplateToDb?: boolean; }

export function AddProjectModal({ open, onOpenChange, companies }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [ownerCompanyId, setOwnerCompanyId] = useState('');
  const ownCompanies = companies.filter((c) => c.type === 'MAIN');
  const clientCompanies = companies.filter((c) => c.type === 'CLIENT');
  const [status, setStatus] = useState('UNDER_REVIEW');
  const [priority, setPriority] = useState('MEDIUM');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  
  // Custom templates fetched from DB
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [domains, setDomains] = useState<DomainEntry[]>(
    DEFAULT_DOMAINS.map((name, i) => ({ name, color: DOMAIN_COLORS[i], importTemplate: false }))
  );

  // Template editor modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorDomainIndex, setEditorDomainIndex] = useState<number | null>(null);

  // Step-2 initialization method
  const [method, setMethod] = useState<'manual' | 'excel'>('manual');
  const [boqFile, setBoqFile] = useState<File | null>(null);
  const [boqPreview, setBoqPreview] = useState<ParsedBoq | null>(null);
  const [selectedDomains, setSelectedDomains] = useState<Set<number>>(new Set());
  const [parsing, setParsing] = useState(false);
  const [includeZeroQty, setIncludeZeroQty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch custom templates on mount
  useEffect(() => {
    async function loadCustomTemplates() {
      try {
        const res = await fetch('/api/templates');
        if (res.ok) {
          const data = await res.json();
          setCustomTemplates(data);
        }
      } catch (err) {
        console.error('Failed to load custom templates:', err);
      }
    }
    loadCustomTemplates();
  }, [open]);

  // Default ownerCompanyId to "ICON SERVICES" if found in companies
  useEffect(() => {
    if (open && companies && ownCompanies.length > 0 && !ownerCompanyId) {
      const iconServices = ownCompanies.find((c) => c.name.toLowerCase() === 'icon services');
      if (iconServices) {
        setOwnerCompanyId(iconServices.id);
      } else {
        setOwnerCompanyId(ownCompanies[0].id);
      }
    }
  }, [open, companies, ownCompanies, ownerCompanyId]);

  // Dynamic template finder that checks custom templates first
  const getTemplate = (domainName: string) => {
    const clean = domainName.trim().toLowerCase();
    const custom = customTemplates.find(
      (t) => t.label.toLowerCase() === clean || t.aliases.some((a: string) => a.toLowerCase() === clean)
    );
    if (custom) return custom;
    return findBoqTemplate(domainName);
  };

  async function runBoqPreview(file: File, includeZero = includeZeroQty) {
    setParsing(true); setError(''); setBoqPreview(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('includeZeroQty', String(includeZero));
      const res = await fetch('/api/boq/preview', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Could not parse the file');
      const parsed: ParsedBoq = await res.json();
      setBoqPreview(parsed);
      setSelectedDomains(new Set(parsed.domains.map((_, i) => i)));
    } catch (e: any) {
      setError(e.message || 'Could not parse the file');
      setBoqFile(null);
    } finally {
      setParsing(false);
    }
  }

  function onFileChange(file: File | null) {
    setBoqFile(file);
    setBoqPreview(null);
    setError('');
    if (file) runBoqPreview(file);
  }

  function toggleIncludeZeroQty(value: boolean) {
    setIncludeZeroQty(value);
    if (boqFile) runBoqPreview(boqFile, value);
  }

  function toggleDomain(i: number) {
    setSelectedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  const selectedTotal = boqPreview
    ? boqPreview.domains.reduce((s, d, i) => (selectedDomains.has(i) ? s + d.amount : s), 0)
    : 0;

  function addDomain() {
    setDomains((prev) => [...prev, { name: '', color: DOMAIN_COLORS[prev.length % DOMAIN_COLORS.length], importTemplate: false }]);
  }

  function removeDomain(i: number) {
    setDomains((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateDomain(i: number, field: 'name' | 'color', value: string) {
    setDomains((prev) => prev.map((d, idx) => {
      if (idx !== i) return d;
      const next = { ...d, [field]: value };
      // A renamed domain may no longer match a template — drop the flag and custom tasks if so.
      if (field === 'name') {
        const tpl = getTemplate(value);
        if (!tpl) {
          next.importTemplate = false;
          next.customTasks = undefined;
        }
      }
      return next;
    }));
  }

  function toggleImport(i: number, value: boolean) {
    setDomains((prev) => prev.map((d, idx) => (idx === i ? { ...d, importTemplate: value } : d)));
  }

  function resetForm() {
    setStep(1); setName(''); setDescription(''); setCompanyId(''); setOwnerCompanyId('');
    setStatus('UNDER_REVIEW'); setPriority('MEDIUM'); setStartDate(''); setEndDate('');
    setBudget(''); setError('');
    setDomains(DEFAULT_DOMAINS.map((name, i) => ({ name, color: DOMAIN_COLORS[i], importTemplate: false })));
    setMethod('manual'); setBoqFile(null); setBoqPreview(null); setSelectedDomains(new Set()); setParsing(false); setIncludeZeroQty(false);
  }

  async function handleSubmit() {
    if (!name.trim() || !companyId || !ownerCompanyId) { setError('Project name, client, and executing company are required.'); return; }
    if (method === 'excel' && (!boqPreview || selectedDomains.size === 0)) {
      setError('Upload a BOQ file and select at least one domain to import.'); return;
    }
    setIsLoading(true); setError('');

    try {
      // Save any custom templates marked to be saved in DB
      for (const d of domains) {
        if (d.saveTemplateToDb && d.customTasks && d.customTasks.length > 0) {
          await fetch('/api/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              label: d.name.trim(),
              tasks: d.customTasks,
            }),
          });
        }
      }

      // Excel mode creates a bare project, then imports the parsed hierarchy into it.
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, description, companyId, ownerCompanyId, status, priority,
          startDate: startDate || null,
          endDate: endDate || null,
          budget: budget ? parseFloat(budget) : null,
          domains: method === 'manual'
            ? domains
                .filter((d) => d.name.trim())
                .map((d) => ({
                  name: d.name.trim(),
                  color: d.color,
                  importTemplate: d.importTemplate,
                  customTasks: d.customTasks || null
                }))
            : [],
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const project = await res.json();

      if (method === 'excel' && boqFile) {
        const fd = new FormData();
        fd.append('file', boqFile);
        fd.append('selected', JSON.stringify(Array.from(selectedDomains)));
        fd.append('includeZeroQty', String(includeZeroQty));
        const imp = await fetch(`/api/projects/${project.id}/import-boq`, { method: 'POST', body: fd });
        if (!imp.ok) throw new Error((await imp.json().catch(() => ({})))?.error || 'BOQ import failed');
      }

      onOpenChange(false);
      resetForm();
      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch (e: any) {
      setError(e.message || 'Failed to create project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleConfigureTemplate(index: number) {
    setEditorDomainIndex(index);
    setEditorOpen(true);
  }

  function handleSaveTemplate(tasks: any[], saveToDb: boolean) {
    if (editorDomainIndex === null) return;
    setDomains((prev) => prev.map((d, i) => {
      if (i !== editorDomainIndex) return d;
      return {
        ...d,
        importTemplate: true,
        customTasks: tasks,
        saveTemplateToDb: saveToDb
      };
    }));
    setEditorOpen(false);
    setEditorDomainIndex(null);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto overflow-x-hidden pr-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-primary" />
              {name.trim() ? name.trim() : 'New Project'}
            </DialogTitle>
            <DialogDescription>
              Step {step} of 2 | {step === 1 ? 'Project Details' : 'Domains & Scope'}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex gap-2 mb-1">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-border'}`}
              />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="proj-name">Project Name *</Label>
                <Input id="proj-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. DHA Residential Complex - Block C" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="proj-desc">Description</Label>
                <Textarea id="proj-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief overview of project scope…" rows={3} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Executing Own Company *</Label>
                  <Select value={ownerCompanyId} onValueChange={setOwnerCompanyId}>
                    <SelectTrigger><SelectValue placeholder="Select own company…" /></SelectTrigger>
                    <SelectContent>
                      {ownCompanies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Client / Customer *</Label>
                  <Select value={companyId} onValueChange={setCompanyId}>
                    <SelectTrigger><SelectValue placeholder="Select client…" /></SelectTrigger>
                    <SelectContent>
                      {clientCompanies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[
                        ['UNDER_REVIEW', 'Under Review'],
                        ['CONTRACT_FILLED', 'Contract Filled'],
                        ['ONGOING', 'Ongoing'],
                        ['UNDER_CUSTOMER_REVIEW', 'Under Customer Review'],
                        ['COMPLETED', 'Completed'],
                      ].map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['LOW','MEDIUM','HIGH','CRITICAL'].map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="start">Start Date</Label>
                  <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="block" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end">End Date</Label>
                  <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="block" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="budget">Expected Budget (PKR)</Label>
                <Input id="budget" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. 45000000" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 pt-2 pr-1">
              {/* Initialization method */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button" onClick={() => setMethod('manual')}
                  className={cn('flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    method === 'manual' ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:bg-muted/50')}
                >
                  <PencilLine className="h-4 w-4" /> Define manually
                </button>
                <button
                  type="button" onClick={() => setMethod('excel')}
                  className={cn('flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    method === 'excel' ? 'border-primary bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:bg-muted/50')}
                >
                  <FileSpreadsheet className="h-4 w-4" /> Import BOQ Excel
                </button>
              </div>

            {method === 'manual' && (
              <>
              <p className="text-sm text-muted-foreground">
                Define work domains (categories) for this project. Tasks are added after project creation, or import a standard BOQ template per domain below (no quantities).
              </p>
              <div className="space-y-2">
                {domains.map((domain, i) => {
                  const tpl = getTemplate(domain.name);
                  const subCount = tpl ? tpl.tasks.reduce((n: number, t: any) => n + t.subtasks.length, 0) : 0;
                  const hasCustomTasks = domain.customTasks && domain.customTasks.length > 0;
                  return (
                    <div key={i} className="rounded-lg border border-border/60 p-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={domain.color}
                          onChange={(e) => updateDomain(i, 'color', e.target.value)}
                          className="h-9 w-9 rounded-md border border-input cursor-pointer bg-transparent p-1"
                          title="Domain color"
                        />
                        <Input
                          value={domain.name}
                          onChange={(e) => updateDomain(i, 'name', e.target.value)}
                          placeholder={`Domain ${i + 1} name`}
                          className="flex-1"
                        />
                        {domain.name.trim() !== '' && !tpl && (
                          <Button
                            type="button" variant="subtle" size="sm"
                            onClick={() => handleConfigureTemplate(i)}
                            className="gap-1 flex-shrink-0 text-xs text-primary"
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                            {hasCustomTasks ? 'Edit Template' : 'Configure Template'}
                          </Button>
                        )}
                        <Button
                          variant="ghost" size="icon-sm"
                          onClick={() => removeDomain(i)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {tpl && (
                        <label className="flex items-center gap-2 text-xs cursor-pointer select-none pl-1 text-foreground/90">
                          <input
                            type="checkbox"
                            checked={domain.importTemplate}
                            onChange={(e) => toggleImport(i, e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-input accent-primary"
                          />
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          Import <span className="font-medium">{tpl.label}</span> template
                          <span className="text-muted-foreground">({tpl.tasks.length} tasks · {subCount} subtasks, no quantities)</span>
                        </label>
                      )}

                      {!tpl && hasCustomTasks && (
                        <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 pl-1 font-medium">
                          <Sparkles className="h-3.5 w-3.5" />
                          Custom template configured ({domain.customTasks!.length} tasks · {domain.customTasks!.reduce((n: number, t: any) => n + t.subtasks.length, 0)} subtasks)
                          {domain.saveTemplateToDb && <span className="text-[10px] text-muted-foreground ml-1">(will save for future projects)</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <Button variant="outline" size="sm" onClick={addDomain} className="gap-2 w-full">
                <Plus className="h-4 w-4" /> Add Domain
              </Button>
              </>
            )}

            {method === 'excel' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Upload a BOQ workbook (.xlsx). Domains, tasks, subtasks, units, quantities and rates are detected automatically: review and confirm below.
                </p>

                <input
                  ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button" onClick={() => fileInputRef.current?.click()} disabled={parsing}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground hover:border-primary/40 hover:bg-muted/30 transition-colors disabled:opacity-70"
                >
                  {parsing
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Parsing {boqFile?.name}…</>
                    : boqFile
                    ? <><FileSpreadsheet className="h-4 w-4 text-primary" /> {boqFile.name} (click to replace)</>
                    : <><Upload className="h-4 w-4" /> Click to upload BOQ Excel (.xlsx)</>}
                </button>

                <label className="flex items-center gap-2 text-xs cursor-pointer select-none text-foreground/90">
                  <input
                    type="checkbox"
                    checked={includeZeroQty}
                    disabled={parsing}
                    onChange={(e) => toggleIncludeZeroQty(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-input accent-primary"
                  />
                  Include items with 0 quantity
                  <span className="text-muted-foreground">(otherwise empty/zero lines are skipped)</span>
                </label>

                {boqPreview && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Detected {boqPreview.domainCount} domains · {boqPreview.taskCount} tasks · {boqPreview.subtaskCount} subtasks
                    </p>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto overflow-x-hidden pr-2">
                      {boqPreview.domains.map((d, i) => {
                        const on = selectedDomains.has(i);
                        return (
                          <button
                            type="button" key={i} onClick={() => toggleDomain(i)}
                            className={cn('w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors mr-1',
                              on ? 'border-primary/40 bg-primary/5' : 'border-border/60 opacity-60 hover:opacity-100')}
                          >
                            {on
                              ? <CheckSquare className="h-4 w-4 text-primary flex-shrink-0" />
                              : <Square className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-medium text-foreground truncate">{d.name}</span>
                              <span className="block text-[11px] text-muted-foreground">{d.tasks.length} tasks · {d.subtaskCount} subtasks</span>
                            </span>
                            <span className="text-xs font-semibold tabular-nums text-foreground flex-shrink-0 ml-2">{formatPKR(d.amount)}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/15 px-4 py-2.5 mr-1">
                      <span className="text-sm text-muted-foreground">Estimated total ({selectedDomains.size} selected)</span>
                      <span className="text-sm font-bold text-foreground">{formatPKR(selectedTotal)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
            )}
            {step === 1 ? (
              <Button
                onClick={() => { if (!name.trim() || !companyId || !ownerCompanyId) { setError('Project name, client, and executing company are required.'); return; } setError(''); setStep(2); }}
                className="flex-1"
              >
                Continue
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isLoading || parsing} className="flex-1">
                {isLoading
                  ? <><Loader2 className="h-4 w-4 animate-spin" />{method === 'excel' ? 'Importing…' : 'Creating…'}</>
                  : method === 'excel' ? 'Create & Import' : 'Create Project'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Embedded Custom Template Configuration Sub-Dialog */}
      {editorDomainIndex !== null && (
        <CustomTemplateEditorModal
          open={editorOpen}
          onOpenChange={(v) => { setEditorOpen(v); if (!v) setEditorDomainIndex(null); }}
          domainName={domains[editorDomainIndex]?.name || ''}
          existingTasks={domains[editorDomainIndex]?.customTasks || []}
          onSave={handleSaveTemplate}
        />
      )}
    </>
  );
}

/* ─── Custom Template Editor Sub-Component ───────────────────────────────────── */
interface EditorTask {
  id: string;
  title: string;
  subtasks: Array<{ id: string; title: string; unit: string; rate: string }>;
}

interface EditorProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  domainName: string;
  existingTasks: any[];
  onSave: (tasks: any[], saveToDb: boolean) => void;
}

function CustomTemplateEditorModal({ open, onOpenChange, domainName, existingTasks, onSave }: EditorProps) {
  const [tasks, setTasks] = useState<EditorTask[]>([]);
  const [saveToDb, setSaveToDb] = useState(true);

  // Initialize editor tasks from existing ones, or load a blank default task
  useEffect(() => {
    if (existingTasks && existingTasks.length > 0) {
      setTasks(
        existingTasks.map((t: any, ti: number) => ({
          id: `task-${ti}-${Date.now()}`,
          title: t.title,
          subtasks: t.subtasks.map((s: any, si: number) => ({
            id: `sub-${ti}-${si}-${Date.now()}`,
            title: s.title,
            unit: s.unit || '',
            rate: s.rate != null ? String(s.rate) : '',
          })),
        }))
      );
    } else {
      setTasks([{ id: `task-0-${Date.now()}`, title: '', subtasks: [] }]);
    }
  }, [existingTasks, open]);

  function addTask() {
    setTasks((prev) => [...prev, { id: `task-${prev.length}-${Date.now()}`, title: '', subtasks: [] }]);
  }

  function removeTask(tid: string) {
    setTasks((prev) => prev.filter((t) => t.id !== tid));
  }

  function updateTaskTitle(tid: string, title: string) {
    setTasks((prev) => prev.map((t) => (t.id === tid ? { ...t, title } : t)));
  }

  function addSubtask(tid: string) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== tid) return t;
        return {
          ...t,
          subtasks: [
            ...t.subtasks,
            { id: `sub-${t.subtasks.length}-${Date.now()}`, title: '', unit: '', rate: '' },
          ],
        };
      })
    );
  }

  function removeSubtask(tid: string, sid: string) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== tid) return t;
        return { ...t, subtasks: t.subtasks.filter((s) => s.id !== sid) };
      })
    );
  }

  function updateSubtask(tid: string, sid: string, field: 'title' | 'unit' | 'rate', value: string) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== tid) return t;
        return {
          ...t,
          subtasks: t.subtasks.map((s) => (s.id === sid ? { ...s, [field]: value } : s)),
        };
      })
    );
  }

  function handleSave() {
    // Filter out empty tasks and subtasks, formatting them back to standard templates
    const formatted = tasks
      .filter((t) => t.title.trim())
      .map((t) => ({
        title: t.title.trim(),
        subtasks: t.subtasks
          .filter((s) => s.title.trim())
          .map((s) => ({
            title: s.title.trim(),
            unit: s.unit.trim() || null,
            rate: s.rate.trim() ? parseFloat(s.rate) : null,
          })),
      }));

    onSave(formatted, saveToDb);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Configure Template: {domainName}</DialogTitle>
          </div>
          <DialogDescription>
            Specify the default section tasks and priced subtask rows that should load when this domain is added.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {tasks.map((task, ti) => (
            <div key={task.id} className="border border-border/80 rounded-xl p-3.5 bg-muted/20 space-y-3 relative">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground w-16">Task {ti + 1}:</span>
                <Input
                  value={task.title}
                  onChange={(e) => updateTaskTitle(task.id, e.target.value)}
                  placeholder="e.g. Brick Masonry Works"
                  className="flex-1 h-8 text-sm"
                />
                <Button
                  variant="ghost" size="icon-sm"
                  onClick={() => removeTask(task.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Subtasks block */}
              <div className="pl-6 space-y-2">
                {task.subtasks.length > 0 && (
                  <div className="grid grid-cols-[1fr_70px_100px_32px] gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <div>Subtask Title</div>
                    <div>Unit</div>
                    <div>Rate (PKR)</div>
                    <div />
                  </div>
                )}
                {task.subtasks.map((sub) => (
                  <div key={sub.id} className="grid grid-cols-[1fr_70px_100px_32px] gap-2 items-center">
                    <Input
                      value={sub.title}
                      onChange={(e) => updateSubtask(task.id, sub.id, 'title', e.target.value)}
                      placeholder="Priced row description..."
                      className="h-8 text-xs"
                    />
                    <Input
                      value={sub.unit}
                      onChange={(e) => updateSubtask(task.id, sub.id, 'unit', e.target.value)}
                      placeholder="Sft"
                      className="h-8 text-xs"
                    />
                    <Input
                      type="number"
                      value={sub.rate}
                      onChange={(e) => updateSubtask(task.id, sub.id, 'rate', e.target.value)}
                      placeholder="e.g. 260"
                      className="h-8 text-xs"
                    />
                    <Button
                      variant="ghost" size="icon-sm"
                      onClick={() => removeSubtask(task.id, sub.id)}
                      className="text-muted-foreground hover:text-destructive h-8 w-8"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline" size="sm"
                  onClick={() => addSubtask(task.id)}
                  className="h-7 text-xs gap-1 border-dashed mt-1"
                >
                  <Plus className="h-3 w-3" /> Add subtask line
                </Button>
              </div>
            </div>
          ))}

          <Button variant="subtle" onClick={addTask} className="w-full h-9 text-xs gap-1">
            <Plus className="h-4 w-4" /> Add Task Section
          </Button>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none font-medium text-foreground/80">
            <input
              type="checkbox"
              checked={saveToDb}
              onChange={(e) => setSaveToDb(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            Save this template for future projects
          </label>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} className="px-5">Save Configuration</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
