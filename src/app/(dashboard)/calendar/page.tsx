'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import {
  CalendarDays, RefreshCw, Plus, Filter, CheckSquare, Square,
  MapPin, Users, Clock, AlertTriangle, CheckCircle, Briefcase,
  ChevronRight, Calendar as CalendarIcon, UserCheck, ShieldAlert,
  Loader2, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Helper for deterministic color generation per employee ID (Odoo convention)
const EMPLOYEE_COLORS = [
  '#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
  '#06B6D4', '#6366F1', '#14B8A6', '#F97316', '#64748B',
];

function getEmployeeColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return EMPLOYEE_COLORS[Math.abs(hash) % EMPLOYEE_COLORS.length];
}

interface CalendarEventItem {
  id: string;
  orgId: string;
  projectId: string | null;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  type: string;
  sourceTaskId: string | null;
  sourceSiteVisitId: string | null;
  sourceKey: string | null;
  createdById: string | null;
  attendees: { user: { id: string; name: string; avatar: string | null } }[];
  project: { id: string; name: string } | null;
}

interface ProjectItem {
  id: string;
  name: string;
}

interface EmployeeItem {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
}

export default function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const calendarRef = useRef<FullCalendar>(null);

  const [rawEvents, setRawEvents] = useState<CalendarEventItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('EMPLOYEE');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters State
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    'MEETING', 'SITE_VISIT', 'SITE_VISIT_PLANNED', 'TRAVEL', 'LEAVE',
    'TASK_DEADLINE', 'PROJECT_DEADLINE', 'OTHER'
  ]);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState('MEETING');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newAllDay, setNewAllDay] = useState(false);
  const [newProjectId, setNewProjectId] = useState('');
  const [newAttendeeIds, setNewAttendeeIds] = useState<string[]>([]);
  const [savingEvent, setSavingEvent] = useState(false);

  // Read URL query params on mount
  useEffect(() => {
    const projParam = searchParams.get('projects');
    const userParam = searchParams.get('users');
    if (projParam) setSelectedProjectIds(projParam.split(','));
    if (userParam) setSelectedUserIds(userParam.split(','));
  }, [searchParams]);

  // Fetch Calendar Data
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/calendar');
      if (res.ok) {
        const json = await res.json();
        setRawEvents(json.events || []);
        setProjects(json.projects || []);
        setEmployees(json.employees || []);
        setSyncedAt(json.calendarSyncedAt || null);
        setUserRole(json.userRole || 'EMPLOYEE');

        // Default: Select all projects if none selected yet
        if (selectedProjectIds.length === 0 && json.projects?.length > 0) {
          setSelectedProjectIds(json.projects.map((p: ProjectItem) => p.id));
        }
      } else {
        setError('Failed to load calendar events.');
      }
    } catch {
      setError('Network error fetching calendar data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isStaff = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'].includes(userRole);
  const isAdminOrManager = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(userRole);

  // Sync Calendar Handler
  const handleSync = async () => {
    setSyncing(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccess(json.message);
        setSyncedAt(json.syncedAt);
        await fetchData();
      } else {
        setError(json.error || 'Failed to sync calendar.');
      }
    } catch {
      setError('Network error syncing calendar.');
    } finally {
      setSyncing(false);
    }
  };

  // Client-Side Event Filtering (Instant response without re-fetching)
  const filteredEvents = useMemo(() => {
    return rawEvents.filter((ev) => {
      // 1. Project filter
      if (ev.projectId && selectedProjectIds.length > 0) {
        if (!selectedProjectIds.includes(ev.projectId)) return false;
      }

      // 2. Event type filter
      if (!selectedTypes.includes(ev.type)) return false;

      // 3. Employee filter
      if (selectedUserIds.length > 0) {
        const attendeeUserIds = ev.attendees.map((a) => a.user.id);
        const creatorId = ev.createdById;
        const matchesUser =
          attendeeUserIds.some((id) => selectedUserIds.includes(id)) ||
          (creatorId && selectedUserIds.includes(creatorId));

        // Note: PROJECT_DEADLINE has no attendee -> show if all employees selected or projects match
        if (ev.type === 'PROJECT_DEADLINE') return true;
        if (!matchesUser && attendeeUserIds.length > 0) return false;
      }

      return true;
    });
  }, [rawEvents, selectedProjectIds, selectedUserIds, selectedTypes]);

  // Convert filtered items to FullCalendar format
  const fullCalendarEvents = useMemo(() => {
    return filteredEvents.map((ev) => {
      // Determine primary attendee or creator for coloring
      const primaryUserId = ev.attendees[0]?.user.id || ev.createdById || 'default';
      const eventColor = getEmployeeColor(primaryUserId);

      let titlePrefix = '';
      if (ev.type === 'TASK_DEADLINE') titlePrefix = '📋 ';
      else if (ev.type === 'PROJECT_DEADLINE') titlePrefix = '🚩 ';
      else if (ev.type === 'SITE_VISIT' || ev.type === 'SITE_VISIT_PLANNED') titlePrefix = '🏗️ ';
      else if (ev.type === 'MEETING') titlePrefix = '🤝 ';
      else if (ev.type === 'TRAVEL') titlePrefix = '🚗 ';
      else if (ev.type === 'LEAVE') titlePrefix = '🏖️ ';

      return {
        id: ev.id,
        title: `${titlePrefix}${ev.title}`,
        start: ev.startAt,
        end: ev.endAt || undefined,
        allDay: ev.allDay,
        backgroundColor: ev.type.includes('DEADLINE') ? '#1A365D' : eventColor,
        borderColor: eventColor,
        textColor: '#FFFFFF',
        extendedProps: {
          rawEvent: ev,
        },
        editable: isStaff && !ev.sourceKey, // Only staff can drag authored events
      };
    });
  }, [filteredEvents, isStaff]);

  // Upcoming 7 Days Deadlines
  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return rawEvents
      .filter((ev) => {
        const dt = new Date(ev.startAt);
        return (
          dt >= now &&
          dt <= nextWeek &&
          ['TASK_DEADLINE', 'PROJECT_DEADLINE'].includes(ev.type)
        );
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [rawEvents]);

  // Event Drop / Drag-to-Reschedule Handler
  const handleEventDrop = async (info: any) => {
    if (!isStaff) return info.revert();

    const rawEvent = info.event.extendedProps.rawEvent;
    if (rawEvent.sourceKey && !rawEvent.sourceTaskId) {
      setError('Derived project deadlines cannot be dragged directly.');
      return info.revert();
    }

    try {
      const res = await fetch('/api/calendar/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rawEvent.id,
          startAt: info.event.start.toISOString(),
          endAt: info.event.end ? info.event.end.toISOString() : null,
        }),
      });

      if (res.ok) {
        setSuccess('Event schedule updated.');
        await fetchData();
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error || 'Failed to update schedule.');
        info.revert();
      }
    } catch {
      setError('Network error rescheduling event.');
      info.revert();
    }
  };

  // Create Event Submit Handler
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newStart) return;

    setSavingEvent(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          type: newType,
          startAt: newStart,
          endAt: newEnd || null,
          allDay: newAllDay,
          projectId: newProjectId || null,
          attendeeIds: newAttendeeIds,
        }),
      });

      if (res.ok) {
        setSuccess('Event created successfully.');
        setIsCreateModalOpen(false);
        setNewTitle('');
        setNewDescription('');
        setNewStart('');
        setNewEnd('');
        setNewProjectId('');
        setNewAttendeeIds([]);
        await fetchData();
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error || 'Failed to create event.');
      }
    } catch {
      setError('Network error creating event.');
    } finally {
      setSavingEvent(false);
    }
  };

  // Sync URL Params on filter toggles
  const updateUrlParams = (projs: string[], usrs: string[]) => {
    const params = new URLSearchParams();
    if (projs.length > 0) params.set('projects', projs.join(','));
    if (usrs.length > 0) params.set('users', usrs.join(','));
    router.replace(`/calendar?${params.toString()}`, { scroll: false });
  };

  const toggleProjectFilter = (pId: string) => {
    const next = selectedProjectIds.includes(pId)
      ? selectedProjectIds.filter((id) => id !== pId)
      : [...selectedProjectIds, pId];
    setSelectedProjectIds(next);
    updateUrlParams(next, selectedUserIds);
  };

  const toggleUserFilter = (uId: string) => {
    const next = selectedUserIds.includes(uId)
      ? selectedUserIds.filter((id) => id !== uId)
      : [...selectedUserIds, uId];
    setSelectedUserIds(next);
    updateUrlParams(selectedProjectIds, next);
  };

  const toggleTypeFilter = (tKey: string) => {
    setSelectedTypes((prev) =>
      prev.includes(tKey) ? prev.filter((k) => k !== tKey) : [...prev, tKey]
    );
  };

  const formatSyncedAgo = (isoStr: string | null) => {
    if (!isoStr) return 'Not synced yet';
    const mins = Math.floor((new Date().getTime() - new Date(isoStr).getTime()) / 60000);
    if (mins < 1) return 'Synced just now';
    if (mins === 1) return 'Synced 1 min ago';
    if (mins < 60) return `Synced ${mins} mins ago`;
    const hrs = Math.floor(mins / 60);
    return `Synced ${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Workspace Calendar</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Unified schedule for project deadlines, site visits, team meetings, and task milestones
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdminOrManager && (
            <Button
              variant="outline"
              size="sm"
              disabled={syncing}
              onClick={handleSync}
              className="gap-2 text-xs"
              title="Rebuild derived task & project deadline events"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : 'text-primary'}`} />
              {syncing ? 'Syncing…' : 'Sync Calendar'}
              <span className="text-[10px] text-muted-foreground font-normal border-l pl-2">
                {formatSyncedAgo(syncedAt)}
              </span>
            </Button>
          )}

          {isStaff && (
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-1.5 text-xs bg-primary hover:bg-primary-dark text-white"
            >
              <Plus className="h-4 w-4" /> New Event
            </Button>
          )}
        </div>
      </div>

      {/* Error & Success Alerts */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 rounded-md p-3">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Main Grid & Rail Container */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        {/* Left: FullCalendar Grid */}
        <Card className="p-4 shadow-sm border-border/80 min-h-[650px] flex flex-col">
          {loading ? (
            <div className="flex flex-col items-center justify-center flex-1 py-24 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <span className="text-xs font-medium">Loading calendar schedule…</span>
            </div>
          ) : (
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay',
              }}
              events={fullCalendarEvents}
              editable={isStaff}
              selectable={isStaff}
              eventDrop={handleEventDrop}
              height="auto"
              aspectRatio={1.6}
            />
          )}
        </Card>

        {/* Right: Odoo Parity Filter Rail & Upcoming Rail */}
        <div className="space-y-6">
          {/* Odoo Checkbox Filter Rail */}
          <Card>
            <CardHeader className="py-3.5 px-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <CardTitle className="text-xs font-bold uppercase tracking-wider">Filters</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-5 text-xs">
              {/* Filter 1: Projects */}
              <div className="space-y-2">
                <div className="flex items-center justify-between font-semibold text-foreground border-b pb-1">
                  <span>Projects</span>
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = projects.map((p) => p.id);
                      const next = selectedProjectIds.length === allIds.length ? [] : allIds;
                      setSelectedProjectIds(next);
                      updateUrlParams(next, selectedUserIds);
                    }}
                    className="text-[11px] text-primary hover:underline"
                  >
                    {selectedProjectIds.length === projects.length ? 'Clear' : 'Select All'}
                  </button>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {projects.map((proj) => {
                    const isChecked = selectedProjectIds.includes(proj.id);
                    return (
                      <label
                        key={proj.id}
                        onClick={() => toggleProjectFilter(proj.id)}
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="h-3.5 w-3.5 rounded border-input accent-primary cursor-pointer"
                        />
                        <span className="truncate">{proj.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Filter 2: Employees (Odoo colored dot convention) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between font-semibold text-foreground border-b pb-1">
                  <span>Employees</span>
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = employees.map((e) => e.id);
                      const next = selectedUserIds.length === allIds.length ? [] : allIds;
                      setSelectedUserIds(next);
                      updateUrlParams(selectedProjectIds, next);
                    }}
                    className="text-[11px] text-primary hover:underline"
                  >
                    {selectedUserIds.length === employees.length ? 'Clear' : 'Select All'}
                  </button>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {employees.map((emp) => {
                    const isChecked = selectedUserIds.includes(emp.id);
                    const color = getEmployeeColor(emp.id);
                    return (
                      <label
                        key={emp.id}
                        onClick={() => toggleUserFilter(emp.id)}
                        className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="h-3.5 w-3.5 rounded border-input accent-primary cursor-pointer"
                          />
                          <span className="truncate text-foreground">{emp.name}</span>
                        </div>
                        <span
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                          title={`Color code for ${emp.name}`}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Filter 3: Event Types */}
              <div className="space-y-2">
                <div className="font-semibold text-foreground border-b pb-1">
                  Event Types
                </div>
                <div className="space-y-1.5">
                  {[
                    { key: 'MEETING', label: '🤝 Meetings' },
                    { key: 'SITE_VISIT', label: '🏗️ Site Visits' },
                    { key: 'TRAVEL', label: '🚗 Travel' },
                    { key: 'LEAVE', label: '🏖️ Leave' },
                    { key: 'TASK_DEADLINE', label: '📋 Task Deadlines' },
                    { key: 'PROJECT_DEADLINE', label: '🚩 Project Deadlines' },
                  ].map((t) => (
                    <label
                      key={t.key}
                      onClick={() => toggleTypeFilter(t.key)}
                      className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(t.key)}
                        onChange={() => {}}
                        className="h-3.5 w-3.5 rounded border-input accent-primary cursor-pointer"
                      />
                      <span>{t.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming 7-Day Deadlines Rail */}
          <Card>
            <CardHeader className="py-3 px-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-xs font-bold uppercase tracking-wider">Upcoming Deadlines (7 Days)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-2.5 text-xs">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-muted-foreground text-center py-3">No upcoming deadlines in the next 7 days.</p>
              ) : (
                upcomingDeadlines.slice(0, 5).map((d) => (
                  <div key={d.id} className="p-2 rounded bg-muted/40 border border-border/50 space-y-1">
                    <div className="font-medium text-foreground truncate">{d.title}</div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{new Date(d.startAt).toLocaleDateString()}</span>
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                        {d.type === 'TASK_DEADLINE' ? 'Task' : 'Project'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Event Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-foreground">Create Standalone Event</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              <div className="space-y-1">
                <Label htmlFor="evt-title">Title *</Label>
                <Input
                  id="evt-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Architectural Site Review"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="evt-type">Event Type</Label>
                  <select
                    id="evt-type"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                  >
                    <option value="MEETING">Meeting</option>
                    <option value="SITE_VISIT_PLANNED">Site Visit</option>
                    <option value="TRAVEL">Travel</option>
                    <option value="LEAVE">Leave / Out of Office</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="evt-project">Project (Optional)</Label>
                  <select
                    id="evt-project"
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                  >
                    <option value="">-- Personal / General --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="evt-start">Start Date *</Label>
                  <Input
                    id="evt-start"
                    type="datetime-local"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="evt-end">End Date</Label>
                  <Input
                    id="evt-end"
                    type="datetime-local"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="evt-desc">Description</Label>
                <textarea
                  id="evt-desc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background p-2 text-xs"
                  placeholder="Notes, agenda, or location details..."
                />
              </div>

              <div className="space-y-1">
                <Label>Attendees (Colleagues)</Label>
                <div className="max-h-28 overflow-y-auto border rounded p-2 space-y-1">
                  {employees.map((emp) => (
                    <label key={emp.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={newAttendeeIds.includes(emp.id)}
                        onChange={(e) => {
                          if (e.target.checked) setNewAttendeeIds([...newAttendeeIds, emp.id]);
                          else setNewAttendeeIds(newAttendeeIds.filter((id) => id !== emp.id));
                        }}
                        className="h-3.5 w-3.5 rounded border-input accent-primary cursor-pointer"
                      />
                      <span>{emp.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={savingEvent}>
                  {savingEvent ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Event'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
