# ICONA Calendar - Feature Plan

Planning doc only - nothing in this file is built yet. Written 2026-07-20,
revised same day with the external-login answer (Path A), the sync-button
decision, and Odoo-style filtering. Grounded in the actual schema
(`prisma/schema.prisma`) and existing conventions (`Sidebar.tsx`,
`deadline-checker.ts`, `SiteVisit`).

## Confirmed decisions

| Question | Decision |
|---|---|
| What's on the calendar | **Both**: auto-populated from existing dates (task due dates, project end dates, logged site visits) **and** manually created standalone events. |
| Visibility control granularity | **Per-project, per-role toggle** (not per individual external user). |
| Can external roles write to the calendar | **View-only.** Freelancers/subcontractors/clients never create or edit entries. |
| UI richness | **Full calendar grid** - month/week/day views with drag-to-reschedule. |
| External logins | **Path A confirmed** - freelancers and subcontractors get real personal credentials, read-only, fenced to their assigned projects. |
| How the calendar gets its data | **Materialized + explicit sync button.** Not re-derived by query on every page load. |
| Filtering | **Odoo-style**: all-projects / one-project, all-employees / one-employee, plus event-type toggles. |

> **Correction to row 1**, which earlier read "task/subtask due dates":
> `Subtask` has no `dueDate` field (only `completed`/`completedAt`), so
> subtasks cannot produce deadline events. The three derivable sources are
> `Task.dueDate`, `Project.endDate` and `SiteVisit.date`.

---

## 0. External logins (Path A - confirmed)

The earlier draft recommended Path B (tokenized share links) on the
assumption that Path A meant a schema migration. Re-checked the schema and
that assumption was wrong, so the objection to Path A mostly evaporates:

- `User.role` is a **plain `String`** with a comment listing values
  (`schema.prisma:20`), *not* a Prisma enum. Adding `FREELANCER` and
  `SUBCONTRACTOR` is editing that comment plus the places that gate on role.
  No enum migration, no `db push` risk.
- `Subcontractor` already carries `email` (`schema.prisma:998`), and
  `SubcontractorEngagement` (`schema.prisma:1025`) is already a per-project
  access list. The "which projects can this subcontractor see" question is
  answered by a table that exists.
- `User.projectId` already exists and is commented *"optional project a
  freelancer is engaged on"* (`schema.prisma:32`). Freelancer scoping is
  answered by a column that exists.

So Path A is: two new role strings, one nullable `userId` on
`Subcontractor`, and one shared access-scope helper. That is smaller than
building, securing, and revoking a parallel token system - Path B is now
the *more* expensive option, so it is dropped.

### Access scope - extend the existing helper, do NOT write a new one

**Correction to an earlier draft of this doc**, which proposed a new
`src/lib/project-scope.ts` exporting `visibleProjectIds()`. That was written
without checking, and it was wrong: `src/lib/projectAccess.ts` already
exists and already does this job.

```ts
// src/lib/projectAccess.ts - ALREADY IN THE REPO
export function getProjectScope(user: ApiUser): Record<string, any>
export async function canAccessProject(user: ApiUser, projectId: string): Promise<boolean>
```

It already handles `ADMIN`/`MANAGER` (unrestricted), `CLIENT` (own company),
`EMPLOYEE` **and `FREELANCER`** (engaged projects OR projects containing an
assigned task) - and it already applies `deletedAt: null`, which a
hand-written replacement would almost certainly forget, quietly exposing
soft-deleted projects on the calendar.

A second access helper alongside it would be two sources of truth for the
same security boundary - the exact failure mode where one gets a fix and the
other doesn't. So:

- **Add one case** to `getProjectScope` for `SUBCONTRACTOR`:
  `{ ...base, subcontractorEngagements: { some: { subcontractor: { userId: user.id } } } }`
- **Add nothing else.** No new file, no `'ALL'` sentinel, no id-array
  materialization.

The calendar query then uses it as a *relation* filter, so there is never a
list of project ids to build or pass around:

```ts
where: {
  orgId: user.orgId,
  startAt: { gte: from, lte: to },
  OR: [
    { project: { is: getProjectScope(user) } },   // project events, scoped
    { projectId: null, createdById: user.id },    // personal events
  ],
}
```

`ProjectCalendarVisibility` is then a second `AND` clause layered on top for
external roles only - scope decides *which projects*, visibility decides
*whether the calendar of those projects is shared*.

Schema delta for Path A - one field:

```prisma
model Subcontractor {
  // ...existing fields...
  userId String? @unique   // set when this subcontractor is given portal credentials
  user   User?   @relation("SubcontractorAccount", fields: [userId], references: [id])
}
```

Freelancers need no new field - they are already `User` rows with
`paymentType` set and `projectId` pointing at their engagement. Giving one
credentials is setting `role = 'FREELANCER'` and sending the existing
invite/verification email. Reuse the current signup-verification flow
(`emailVerified` gates login already) rather than inventing a second one.

**What these two roles can do: read. Nothing else.** They see their
project(s)' calendar and the project data attached to those events. No
create, no edit, no drag-to-reschedule, no other module. Enforce that
server-side in the route, not by hiding buttons.

---

## 1. Data model (additive, no changes to existing models except one relation)

```prisma
// A calendar entry. Auto-derived rows (from Task.dueDate, Project.endDate,
// SiteVisit.date) are represented as CalendarEvent rows too - rebuilt by
// syncCalendar (section 1b), so there is one query to render a calendar,
// not four merged in application code.
model CalendarEvent {
  id           String   @id @default(cuid())
  orgId        String
  org          Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  projectId    String?  // null = a personal/company event not tied to a project
  project      Project? @relation(fields: [projectId], references: [id], onDelete: Cascade)

  title        String
  description  String?  @db.Text
  startAt      DateTime
  endAt        DateTime?          // null = a point-in-time deadline marker, not a range
  allDay       Boolean  @default(false)

  // Derived types are rebuilt by sync; authored types are never touched by it.
  //   derived:  TASK_DEADLINE | PROJECT_DEADLINE | SITE_VISIT
  //   authored: MEETING | TRAVEL | SITE_VISIT_PLANNED | LEAVE | OTHER
  type         String
  sourceTaskId String?            // set when type = TASK_DEADLINE, for click-through
  sourceSiteVisitId String?       // set when type = SITE_VISIT

  // Set on derived rows only. Lets sync find and replace exactly what it owns
  // without ever touching a row a human typed. Null = authored by a person.
  sourceKey    String?            // e.g. "TASK_DEADLINE:clx123"

  // Nullable: derived rows have no human author. Making this required would
  // force sync to invent a "system user" to attribute machine-made rows to.
  createdById  String?
  createdBy    User?    @relation("CalendarEventCreator", fields: [createdById], references: [id])
  // Attendees: who this event is "individual" to, beyond the shared project view.
  // Empty = visible to everyone with project access (a true "shared" event).
  attendees    CalendarEventAttendee[]

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([sourceKey])
  @@index([orgId])
  @@index([projectId])
  @@index([startAt])
  @@index([orgId, startAt])   // the query the calendar page actually runs
}

model CalendarEventAttendee {
  id      String        @id @default(cuid())
  eventId String
  event   CalendarEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  userId  String
  user    User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([eventId, userId])
  @@index([userId])
}

// Per-project, per-role visibility toggle (the confirmed "simple" model).
// One row per (project, role) that's been explicitly turned on; absence =
// not visible (safe default - a new project starts fully private to staff).
model ProjectCalendarVisibility {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  viewerRole String  // "CLIENT" today; "FREELANCER" / "SUBCONTRACTOR" reserved pending the Path A/B decision
  visible   Boolean  @default(true)
  updatedAt DateTime @updatedAt

  @@unique([projectId, viewerRole])
}
```

Why auto-derived events are *materialized* rows (not computed on the fly by
UNIONing four tables at read time): a single project can be visible to a
dozen people across staff + client + external roles, and the calendar is
read far more often than tasks/visits are written - one indexed table beats
four joined queries on every page load. This is the confirmed "it doesn't
re-query every time" requirement: `CalendarEvent` **is** the cache.

## 1b. Sync - one button, one function

The earlier draft kept derived rows fresh with an upsert hook inside each of
`tasks/[id]`, `projects/[id]`, and the site-visit route. Dropping that in
favour of a single reconcile function, per the confirmed sync-button
decision. Three scattered hooks is three places to forget one (and there are
more write paths than three - bulk import, board drag, BOQ-driven task
creation); one function that rebuilds derived rows is a smaller diff and
cannot silently miss a caller.

```ts
// src/lib/calendar-sync.ts
// Rebuilds the derived slice of CalendarEvent for one org. Authored events
// (sourceKey = null) are never read, never written, never deleted.
export async function syncCalendar(orgId: string) {
  const derived = [
    ...await tasksWithDueDates(orgId),      // -> TASK_DEADLINE
    ...await projectsWithEndDates(orgId),   // -> PROJECT_DEADLINE
    ...await siteVisits(orgId),             // -> SITE_VISIT
  ]  // each row carries a stable sourceKey like "TASK_DEADLINE:<id>"

  await prisma.$transaction([
    // Delete derived rows whose source is gone or lost its date.
    prisma.calendarEvent.deleteMany({
      where: { orgId, sourceKey: { not: null, notIn: derived.map(d => d.sourceKey) } },
    }),
    ...derived.map(d => prisma.calendarEvent.upsert({
      where: { sourceKey: d.sourceKey }, create: { ...d, orgId }, update: d,
    })),
  ])

  await prisma.organization.update({
    where: { id: orgId }, data: { calendarSyncedAt: new Date() },
  })
}
```

Add one field so the button can report freshness:

```prisma
model Organization {
  calendarSyncedAt DateTime?   // last successful calendar sync
}
```

**Where it runs:**

1. **The Sync button** - `POST /api/calendar/sync`, ADMIN/MANAGER only,
   scoped to the caller's `orgId`. Button sits in the calendar toolbar
   showing "Synced 4 minutes ago" from `calendarSyncedAt`.
2. **Nightly** - called from the existing `deadline-checker.ts` cron before
   it sends its digest, so an org that never presses the button still self-heals.

**Watch out: `Project.orgId` is nullable** (`schema.prisma:305`) - legacy
rows from before multi-tenancy have it unset. A sync keyed on `orgId` will
silently skip those projects and their tasks, and the calendar will look
mysteriously empty for an org that still has legacy data. Either backfill
`orgId` first or resolve the org via `project.company.orgId` as a fallback.
Assert a non-zero derived-row count in the sync self-check so this shows up
as a failure rather than an empty grid.

`ponytail:` full rebuild per org, single transaction. Fine at ICONA's scale
(SME projects, thousands of rows, not millions). If an org's sync ever gets
slow, narrow it to a date window (`startAt > now - 90d`) before reaching for
incremental diffing - the window fix is one `where` clause and buys years.

**Trade-off, stated plainly:** a task's due date changed at 10:00 does not
appear on the calendar until someone syncs or the nightly run fires. That is
the direct consequence of the confirmed "save the results, don't query every
time" decision, and it is the normal behaviour for a synced calendar. If
near-live accuracy turns out to matter more than the simplicity, the upgrade
is to call `syncCalendar` (or a single-source variant) at the end of the
task/project/site-visit write routes - the same three hooks as the original
plan, added back only if the lag is actually felt.

**Employee attribution.** Derived rows get attendees so the per-employee
filter works uniformly: `TASK_DEADLINE` -> the task's assignee,
`SITE_VISIT` -> the visiting user, `PROJECT_DEADLINE` -> no attendee (a
project milestone belongs to the project, not a person).

**Not in scope:** two-way Google Calendar sync (the "Sincronizza con Google"
button in the Odoo reference). This sync button reconciles ICONA's own data
into ICONA's calendar. Google sync is OAuth, token refresh, conflict
resolution and webhook handling - a separate project. Say the word if it's
actually wanted.

## 2. "Shared" vs "individual" calendar - what the words actually mean here

- **Shared (project) calendar**: every `CalendarEvent` where
  `projectId = X` and the viewer has access to project X (staff always;
  external roles only if `ProjectCalendarVisibility` says so for their role).
  No `attendees` filtering - if you can see the project, you see its events.
- **Individual calendar**: a personal view = the union of (a) events where
  the user is in `attendees`, (b) events on any project they're assigned to
  (via `Project.engagedUsers`/`Team`), and (c) `projectId: null` events they
  created for themselves (a private reminder, not tied to any project).
- One `/calendar` page, **not two separate URLs**: a view toggle ("My
  Calendar" / "Project: X") over the same FullCalendar instance, consistent
  with how e.g. Google Calendar layers "my calendar" and "team calendars."

## 2b. Filters - Odoo parity (all-vs-individual, both axes)

Matching the reference screenshot: a right-hand rail of checkbox lists, and
the grid reflects them instantly.

| Filter | Options | Default |
|---|---|---|
| **Projects** | "All projects" master checkbox + one row per project in scope | All |
| **Employees** | "All employees" master checkbox + one row per colleague, avatar + colour dot | Just me |
| **Event types** | Meetings, Site visits, Travel, Leave / out of office, Task deadlines, Project deadlines | All |

**All of this filtering is client-side, over events already in memory.** The
page fetches once per visible date range (`GET /api/calendar?from=&to=`) and
every checkbox is an `Array.filter` on that result. Ticking a colleague or
switching project does not hit the network. This is the second half of the
"doesn't fetch by queries every time" requirement - the first half is
`CalendarEvent` being materialized, this half is not re-fetching on every
toggle.

A month of events for one SME org is a few hundred rows - trivially small in
memory, and it makes the filters feel instant. `ponytail:` if an org ever
has a month heavy enough that this is slow, move the *project* filter
server-side first (it cuts the most rows) and keep the rest client-side.

Colour comes from the **employee**, not the event type (Odoo's convention,
visible in the screenshot's per-person dots) - one stable colour per user id
so the same person is the same colour every session. Event *type* is
conveyed by the icon/border instead, so the two dimensions do not fight for
the same visual channel.

Filter state lives in the **URL query string** (`?project=x&users=a,b`), not
component state - shareable, back-button-correct, survives refresh, and
costs nothing beyond reading `useSearchParams`. Skipped: persisting filter
preferences per user in the DB. Add when someone complains they re-tick the
same boxes daily.

Employees create their own **meetings, site visits, travel and leave** as
authored events (`type` values in section 1). These are ordinary
`CalendarEvent` rows with `attendees` - no separate model per activity kind,
because nothing behaves differently per kind beyond its icon and its filter
checkbox. Add a dedicated model only when one of them grows real fields of
its own (e.g. leave needing an approval workflow - which is an HR feature,
not a calendar one).

## 3. Deadline surfacing - extends existing infrastructure, doesn't replace it

`src/lib/deadline-checker.ts` today only scans `Project.endDate` for its
email digest. Extend it (same file, same cron, one more query) to also scan
`Task.dueDate` for tasks not yet `DONE`, using the same
overdue/due-today/upcoming buckets it already computes for projects. The
calendar page adds an "Upcoming Deadlines" rail (next 7 days, pulled from
`CalendarEvent` where `type` is `TASK_DEADLINE`/`PROJECT_DEADLINE` and
`startAt` is in that window) - same underlying data, one for email, one for
the in-app view.

Reminder lead time should follow the existing per-user preference pattern
already on `User` (`taskAssignNotifications`, `dailyTaskDigest`,
`projectCompletionAlert`): add `deadlineReminderDays Int @default(3)` next to
them, editable from the same Settings screen (`SettingsForm.tsx`), rather
than inventing a separate preferences surface for the calendar.

## 4. Navigation

New sidebar item in `Sidebar.tsx`'s `navItems`, positioned right after
"Project Board" (highest-traffic, most closely related):

```ts
{ href: '/calendar', label: 'Calendar', icon: CalendarDays,
  roles: ['SUPER_ADMIN','ADMIN','MANAGER','EMPLOYEE','CLIENT','FREELANCER','SUBCONTRACTOR'] },
```

`CLIENT`, `FREELANCER` and `SUBCONTRACTOR` are all included - each has real
login under Path A, and each sees a view-only calendar fenced by
`getProjectScope()` (section 0).

For freelancers and subcontractors the calendar is likely their *entire*
sidebar - they have no business on the board, ledger, BOQ or settings. Their
`navItems` filter should leave them with Calendar plus their project(s) and
nothing else, which the existing `roles` array on each nav item already
expresses. No new nav mechanism needed.

### Super admin's calendar

Per the ask ("important for superadmin profile"): the super admin is a
**platform operator**, not a member of any tenant's project - their
"calendar" is not the same shared/individual model above. Recommend folding
this into the `/admin` Overview (see `docs/admin_layout.md` section 8,
backlog item 5 - cron/background-job health) as a **cross-tenant deadline
health summary** ("14 projects platform-wide are overdue," "next
deadline-checker run: in 6h") rather than a literal calendar grid of every
tenant's events - a super admin does not need Skyline Infrastructure's
Tuesday site-visit on their screen, they need to know the reminder system is
running and nothing platform-wide is silently broken.

## 5. Permissions summary

| Role | Shared (project) calendar | Individual calendar | Create/edit events | Sync button |
|---|---|---|---|---|
| ADMIN / MANAGER | Full, all their org's projects | Yes | Yes, any project in their org | Yes |
| EMPLOYEE | Projects they're assigned to | Yes | Yes, their own + assigned projects | No |
| CLIENT | Only if `ProjectCalendarVisibility` allows, their own company's projects only | No (clients don't get a personal calendar - project-scoped only) | No - view-only, confirmed | No |
| FREELANCER | Their engaged project only (`User.projectId`) | No | No - view-only, confirmed | No |
| SUBCONTRACTOR | Their engaged projects only (via `SubcontractorEngagement`) | No | No - view-only, confirmed | No |
| SUPER_ADMIN | Not the tenant calendar - see section 4's cross-tenant health summary instead | N/A | N/A | Per-org, from `/admin` |

Two gates, both server-side, both enforced in the route rather than the UI:
**scope** (`getProjectScope()`, section 0) decides which events come back
at all; **`ProjectCalendarVisibility`** then decides whether an external
role sees a project it's technically attached to. An external role must pass
both. Note the safe default - absence of a visibility row means *not*
visible, so attaching a freelancer to a project does not silently expose its
calendar until an admin turns it on.

## 6. UI: FullCalendar (new dependency, justified)

No calendar library exists in `package.json` today. A hand-rolled
month/week/day grid with drag-to-reschedule is a large, well-solved problem
not worth re-inventing (month-grid math, week/day view switching, drag
constraints, event-overlap layout).

Surveyed the current options (July 2026):

| Library | Licence | Verdict |
|---|---|---|
| **FullCalendar** core | MIT, ~19k stars, >1M weekly downloads | **Pick.** Month/week/day + drag-to-reschedule in the free tier. |
| FullCalendar Premium | Commercial, from $480 | Not needed - see below. |
| Schedule-X | Free core, **per-project** paid subscription for resource views | Nice API, but the licence is per-project-forever. Avoid the trap. |
| react-big-calendar | MIT | Solid fallback; needs more glue for drag-to-reschedule. |

Install: `@fullcalendar/react` + `@fullcalendar/daygrid` +
`@fullcalendar/timegrid` + `@fullcalendar/interaction`. All MIT.

**Why the paid resource plugins are not needed**, despite this being a
"filter by employee and project" feature: FullCalendar's premium
`resource-timeline` / `resource-timegrid` views are for rendering *resources
as columns or swimlanes* (a Gantt-style grid, one lane per person). What
section 2b describes is a normal calendar with checkboxes that filter the
event array - which is `events.filter(...)` before handing the array to the
free `dayGrid`/`timeGrid` views. Odoo's screenshot is doing exactly this: a
plain month grid, filtered. Worth being explicit, because "resource
filtering" sounds like it needs the resource plugins and it does not.

Style it with the existing semantic tokens per `AGENTS.md` - FullCalendar
themes via CSS variables (`--fc-event-bg-color`, `--fc-border-color`, etc.),
so map those to the ICONA palette in `globals.css` instead of hardcoding
literal colours or shipping FullCalendar's stock theme.

Skipped: the mini month-picker in the screenshot's top-right. A native
`<input type="month">` jumps the grid to a month in one line; add the fancy
picker if anyone misses it.

Drag-to-reschedule writes back through the *existing* update routes (moving
a `TASK_DEADLINE` event calls the same `PATCH /api/tasks/[id]` that already
handles `dueDate`, not a new endpoint) - the calendar is a view and editor
over data that already has an owner, not a second source of truth for it.

## 7. Suggested build order

1. Schema: `CalendarEvent`, `CalendarEventAttendee`, `ProjectCalendarVisibility`, `User.deadlineReminderDays`, `Organization.calendarSyncedAt`, `Subcontractor.userId`. `db push`.
2. **Extend** `src/lib/projectAccess.ts` with a `SUBCONTRACTOR` case (section 0). Do not create a second scope helper. **Ships with a test** asserting each role gets exactly the projects it should and no more, including that an unknown role falls through to the restrictive branch rather than the unrestricted one. This is the security boundary for the whole feature; it is the one piece that must not be trusted to review alone. Add the new test file to the `"test"` script in `package.json` - it hardcodes its file list, so a new test that isn't added there never runs in CI.
3. `src/lib/calendar-sync.ts` - `syncCalendar(orgId)` + `POST /api/calendar/sync`. Self-check: run it twice, assert the row count is stable (idempotent) and that an authored event survives both runs untouched.
4. `/api/calendar?from=&to=` (list, scoped by `getProjectScope()` + `ProjectCalendarVisibility`) + `/api/calendar/events` (authored CRUD, staff only).
5. `/calendar` page: FullCalendar grid, sync button with "synced N ago", filter rail (section 2b), sidebar nav entry.
6. Roles: `FREELANCER` / `SUBCONTRACTOR` added to the role comment and nav gating; credential issuing reuses the existing invite + `emailVerified` flow.
7. Deadline-checker extension (Task.dueDate) + nightly `syncCalendar` call + `deadlineReminderDays` preference in Settings.
8. Admin drawer addition: per-project `ProjectCalendarVisibility` toggle (client's ADMIN only, their own org's projects).
9. Super admin cross-tenant deadline-health summary in `/admin` Overview.
10. Mobile (Android) parity - already tracked as a future item in
   `icon_app/FUTURE-UPDATES.md` section 4 ("Calendar (planned on web too)");
   treat this web build as the one that ships first, mobile follows the
   existing app's parity process once the web data model is stable.
