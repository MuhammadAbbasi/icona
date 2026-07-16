'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, AlertTriangle, AlertCircle, Calendar, Check, Loader2, Building2, ChevronDown } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlobalSearch } from './GlobalSearch';

interface HeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  center?: React.ReactNode;
  ownCompanies?: Array<{ id: string; name: string }>;
}

interface AlertItem {
  id: string;
  type: 'deadline' | 'missing';
  title: string;
  message: string;
  link: string;
  projectId: string;
  projectName: string;
  severity: 'high' | 'medium' | 'low';
}

export function Header({ title, description, action, center, ownCompanies }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch alerts
  async function fetchAlerts() {
    setLoading(true);
    try {
      const res = await fetch('/api/alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  }

  // Fetch on mount
  useEffect(() => {
    fetchAlerts();
    // Poll alerts every 60 seconds
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Severity color mappings
  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'high':
        return {
          bg: 'bg-red-500/10 dark:bg-red-500/20',
          text: 'text-red-600 dark:text-red-400',
          border: 'border-red-500/20',
          dot: 'bg-red-500',
        };
      case 'medium':
        return {
          bg: 'bg-amber-500/10 dark:bg-amber-500/20',
          text: 'text-amber-600 dark:text-amber-400',
          border: 'border-amber-500/20',
          dot: 'bg-amber-500',
        };
      case 'low':
      default:
        return {
          bg: 'bg-blue-500/10 dark:bg-blue-500/20',
          text: 'text-blue-600 dark:text-blue-400',
          border: 'border-blue-500/20',
          dot: 'bg-blue-500',
        };
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-md px-6 gap-4">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-foreground truncate">{title}</h1>
        {description && (
          <p className="text-xs text-muted-foreground hidden sm:block">{description}</p>
        )}
      </div>

      {center && (
        <div className="hidden md:flex flex-1 justify-center max-w-md mx-4 animate-fade-in">
          {center}
        </div>
      )}

      <div className="flex items-center gap-3 flex-shrink-0">
        <GlobalSearch />

        {ownCompanies && ownCompanies.length > 0 && (
          <CompanyFilterDropdown companies={ownCompanies} />
        )}

        <div className="relative" ref={dropdownRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="relative hover:bg-muted/80 rounded-full"
            title="Alerts & Deadlines"
          >
            <Bell className="h-4.5 w-4.5 text-foreground/80" />
            {alerts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </Button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-[400px] rounded-xl border border-border bg-popover text-popover-foreground shadow-xl z-50 overflow-hidden animate-in fade-in-50 slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">Alerts & Deadlines</span>
                  {alerts.length > 0 && (
                    <Badge variant="danger" className="px-1.5 py-0 text-[10px] font-bold tabular-nums">
                      {alerts.length}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchAlerts}
                  disabled={loading}
                  className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                >
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Refresh'}
                </Button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
                {loading && alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                    <span className="text-xs">Loading alerts...</span>
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-muted-foreground">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                      <Check className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-foreground">All Caught Up!</p>
                    <p className="text-xs mt-1">No deadlines approaching or missing project details found.</p>
                  </div>
                ) : (
                  alerts.map((alert) => {
                    const styles = getSeverityStyles(alert.severity);
                    return (
                      <Link
                        key={alert.id}
                        href={alert.link}
                        onClick={() => setIsOpen(false)}
                        className="flex items-start gap-3 p-3.5 hover:bg-muted/40 transition-colors text-left"
                      >
                        <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${styles.bg} ${styles.text}`}>
                          {alert.type === 'deadline' ? (
                            <Calendar className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {alert.title}
                            </span>
                            <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {alert.message}
                          </p>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {action}
      </div>
    </header>
  );
}

interface Company {
  id: string;
  name: string;
}

function CompanyFilterDropdown({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Read currently selected companyIds from URL
  const selectedIds = searchParams.get('companyIds')
    ? searchParams.get('companyIds')!.split(',').filter(Boolean)
    : [];

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (id: string) => {
    let nextIds: string[];
    if (selectedIds.includes(id)) {
      nextIds = selectedIds.filter((x) => x !== id);
    } else {
      nextIds = [...selectedIds, id];
    }

    const params = new URLSearchParams(searchParams.toString());
    if (nextIds.length > 0) {
      params.set('companyIds', nextIds.join(','));
    } else {
      params.delete('companyIds');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('companyIds');
    router.push(`${pathname}?${params.toString()}`);
  };

  const isAllSelected = selectedIds.length === 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 px-3 gap-2 text-xs font-semibold border-border hover:bg-muted/80 rounded-lg text-foreground/80 transition-all"
        title="Filter by Own Company"
      >
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span>
          {isAllSelected
            ? 'All Companies'
            : selectedIds.length === 1
            ? companies.find((c) => c.id === selectedIds[0])?.name || '1 Company'
            : `${selectedIds.length} Companies`}
        </span>
        <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl z-50 p-2 animate-in fade-in-50 slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border/60 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">My Companies</span>
            {!isAllSelected && (
              <button
                onClick={handleClear}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="space-y-0.5">
            {companies.map((c) => {
              const isChecked = selectedIds.includes(c.id);
              return (
                <label
                  key={c.id}
                  className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer text-xs font-medium text-foreground/80 hover:bg-muted/60"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(c.id)}
                    className="hidden"
                  />
                  <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${isChecked ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-transparent'}`}>
                    {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                  <span className="truncate">{c.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
