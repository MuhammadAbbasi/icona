'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FolderOpen, ListTodo, CheckSquare, Loader2, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchResult {
  type: 'project' | 'task' | 'subtask';
  id: string;
  title: string;
  href: string;
  breadcrumb: string[];
}

const TYPE_META = {
  project: { icon: FolderOpen,   label: 'Project',  color: 'text-indigo-500' },
  task:    { icon: ListTodo,     label: 'Task',     color: 'text-amber-500'  },
  subtask: { icon: CheckSquare,  label: 'Subtask',  color: 'text-emerald-500'},
};

export function GlobalSearch() {
  const router = useRouter();
  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState<SearchResult[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [open,        setOpen]        = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch with debounce ───────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setActiveIndex(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // ── Click outside to close ────────────────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Navigate to result ────────────────────────────────────────────────────
  const navigate = useCallback((href: string) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    router.push(href);
  }, [router]);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0) navigate(results[activeIndex].href);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative hidden md:flex items-center">
      <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      {loading && (
        <Loader2 className="absolute right-3 h-3.5 w-3.5 text-muted-foreground animate-spin pointer-events-none z-10" />
      )}
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search projects, tasks, subtasks…"
        className="pl-9 pr-8 h-8 w-64 text-sm bg-muted/50 border-0 focus-visible:ring-1"
        autoComplete="off"
      />

      {showDropdown && (
        <div className="absolute top-full left-0 mt-1.5 w-[420px] max-h-[420px] overflow-y-auto rounded-xl border bg-popover shadow-lg z-50">
          {results.length === 0 && !loading && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {results.length > 0 && (() => {
            const grouped: Record<string, SearchResult[]> = { project: [], task: [], subtask: [] };
            results.forEach((r) => grouped[r.type].push(r));

            return (['project', 'task', 'subtask'] as const)
              .filter((type) => grouped[type].length > 0)
              .map((type) => {
                const meta = TYPE_META[type];
                const Icon = meta.icon;
                let offset = 0;
                if (type === 'task')    offset = grouped.project.length;
                if (type === 'subtask') offset = grouped.project.length + grouped.task.length;

                return (
                  <div key={type}>
                    {/* Group header */}
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30 border-b border-border/40 sticky top-0">
                      {meta.label}s
                    </div>

                    {grouped[type].map((result, i) => {
                      const globalIndex = offset + i;
                      const isActive    = globalIndex === activeIndex;
                      return (
                        <button
                          key={result.id}
                          className={cn(
                            'w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent',
                            isActive && 'bg-accent'
                          )}
                          onMouseEnter={() => setActiveIndex(globalIndex)}
                          onClick={() => navigate(result.href)}
                        >
                          <Icon className={cn('h-4 w-4 flex-shrink-0 mt-0.5', meta.color)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {result.title}
                            </p>
                            {result.breadcrumb.length > 0 && (
                              <p className="flex items-center flex-wrap gap-0.5 mt-0.5 text-[11px] text-muted-foreground">
                                {result.breadcrumb.map((crumb, ci) => (
                                  <span key={ci} className="flex items-center gap-0.5">
                                    {ci > 0 && <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/40 flex-shrink-0" />}
                                    <span className="truncate max-w-[120px]">{crumb}</span>
                                  </span>
                                ))}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              });
          })()}
        </div>
      )}
    </div>
  );
}
