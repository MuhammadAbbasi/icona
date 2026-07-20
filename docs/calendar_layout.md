# ICONA Calendar - Feature Plan

Planning doc only - nothing in this file is built yet. Written 2026-07-20
against decisions confirmed with the user, grounded in the actual schema
(`prisma/schema.prisma`) and existing conventions (`Sidebar.tsx`,
`deadline-checker.ts`, `SiteVisit`).

## Confirmed decisions

| Question | Decision |
|---|---|
| What's on the calendar | **Both**: auto-populated from existing dates (task/subtask due dates, project end dates, logged site visits) **and** manually created standalone events. |
| Visibility control granularity | **Per-project, per-role toggle** (not per individual external user). |
| Can external roles write to the calendar | **View-only.** Freelancers/subcontractors/clients never create or edit entries. |
| UI richness | **Full calendar grid** - month/week/day views with drag-to-reschedule. |

## Open question - answer before building the external-visibility slice

**Freelancers and subcontractors have no login today.** Checked the schema:
`Subcontractor` is a pure back-office registry (name, contact, crew,
engagements, logs - no `email`/`password`/user relation at all); "Freelancer"
only exists as a `Company.type` value and a `User.paymentType` flag on
regular staff. The only one of the three groups you named that can actually
log into ICONA today is `CLIENT`.

So "give the client's admin the right to change calendar visibility for
freelancers, subcontractors, and clients" needs one more decision:

- **Path A - give them real accounts.** Add `FREELANCER` and
  `SUBCONTRACTOR` as genuine login-capable roles (new `User.role` values,
  scoped like `CLIENT` is today: read-only, fenced to their own
  project(s)). Bigger: new signup/invite flow for them, new role-gating
  throughout the app, not just the calendar.
- **Path B - no new accounts, a shareable read-only link instead.** Each
  project gets a per-role (or per-recipient) tokenized calendar URL
  (`/calendar/shared/[token]`) that a freelancer/subcontractor opens without
  logging in - same pattern as a "shareable calendar link" in Google
  Calendar. Much smaller: no new auth, no new role, just a signed,
  revocable, read-only token per project + viewer category. The admin's
  "visibility toggle" becomes "generate/revoke this project's freelancer
  link" instead of a role-based gate.

**Recommendation: Path B for now.** It ships the actual thing asked for
(freelancers/subcontractors can see relevant dates) without opening the much
larger "give external parties real ICONA accounts" project, which has its
own auth, security, and UX surface that deserves its own dedicated
decision - not a rider on a calendar feature. Path A is the more "complete"
long-term answer if ICONA wants Subcontractor/Freelancer as first-class
portal users (matching the CRM's existing CLIENT-portal pattern), and the
data model below (`viewerRole` as a plain string, not a foreign key to a
specific mechanism) is written so it doesn't need to be redesigned if you
pick Path A later instead - only the visibility *enforcement* code differs.

Building the CLIENT-facing side of this (Path-independent - CLIENT already
has real login) can start immediately; the freelancer/subcontractor slice
waits on this answer.

---

## 1. Data model (additive, no changes to existing models except one relation)

```prisma
// A calendar entry. Auto-derived rows (from Task/Subtask due dates, Project
// end dates, SiteVisit) are represented as CalendarEvent rows too - written
// by the same code path that creates/updates the source record, so there is
// one query to render a calendar, not four merged in application code.
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

  type         String   // "TASK_DEADLINE" | "PROJECT_DEADLINE" | "SITE_VISIT" | "MANUAL"
  sourceTaskId String?            // set when type = TASK_DEADLINE, for click-through
  sourceSiteVisitId String?       // set when type = SITE_VISIT

  createdById  String
  createdBy    User     @relation("CalendarEventCreator", fields: [createdById], references: [id])
  // Attendees: who this event is "individual" to, beyond the shared project view.
  // Empty = visible to everyone with project access (a true "shared" event).
  attendees    CalendarEventAttendee[]

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([orgId])
  @@index([projectId])
  @@index([startAt])
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
dozen people across staff + client + (eventually) external roles, and the
calendar is read far more often than tasks/visits are written - one indexed
table beats four joined queries on every page load. The cost is keeping them
in sync:

- **Task**: on create/update, if `dueDate` is set/changed, upsert a
  `CalendarEvent` (`type: TASK_DEADLINE`, `sourceTaskId`). On `dueDate`
  cleared or task deleted, delete the row.
- **Project**: same pattern keyed off `endDate` (`type: PROJECT_DEADLINE`).
- **SiteVisit**: same pattern on create (`type: SITE_VISIT`), keyed off `date`.
- All three are one extra `prisma` call inside routes that already exist
  (`tasks/[id]`, `projects/[id]`, the site-visit creation route) - not a new
  background job, so there's no sync-lag window.

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
{ href: '/calendar', label: 'Calendar', icon: CalendarDays, roles: ['SUPER_ADMIN','ADMIN','MANAGER','EMPLOYEE','CLIENT'] },
```

`CLIENT` is included because they already have real login and this is
exactly the "view-only, project-scoped" case `ProjectCalendarVisibility`
exists for. (Freelancer/Subcontractor entries wait on the Path A/B answer -
Path A would add them to this same `roles` array; Path B wouldn't touch this
file at all, since they'd never sign into the main app.)

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

| Role | Shared (project) calendar | Individual calendar | Create/edit events |
|---|---|---|---|
| ADMIN / MANAGER | Full, all their org's projects | Yes | Yes, any project in their org |
| EMPLOYEE | Projects they're assigned to | Yes | Yes, their own + assigned projects |
| CLIENT | Only if `ProjectCalendarVisibility` allows, their own company's projects only | No (clients don't get a personal calendar - project-scoped only) | No - view-only, confirmed |
| Freelancer / Subcontractor | Pending Path A/B | N/A under Path B | No - view-only, confirmed |
| SUPER_ADMIN | Not the tenant calendar - see section 4's cross-tenant health summary instead | N/A | N/A |

## 6. UI: FullCalendar (new dependency, justified)

No calendar library exists in `package.json` today. A hand-rolled
month/week/day grid with drag-to-reschedule is a large, well-solved problem
not worth re-inventing (month-grid math, week/day view switching, drag
constraints, event-overlap layout). Recommend `@fullcalendar/react` +
`@fullcalendar/daygrid` + `@fullcalendar/timegrid` +
`@fullcalendar/interaction` (all MIT-licensed core packages - avoid the paid
`@fullcalendar/resource-*` scheduler add-ons, not needed here). Alternative
considered: `react-big-calendar` (also free/MIT) - FullCalendar's built-in
`interaction` plugin gives drag-to-reschedule with less glue code, which is
why it's the pick given "drag-to-reschedule" was the explicit requirement.

Drag-to-reschedule writes back through the *existing* update routes (moving
a `TASK_DEADLINE` event calls the same `PATCH /api/tasks/[id]` that already
handles `dueDate`, not a new endpoint) - the calendar is a view and editor
over data that already has an owner, not a second source of truth for it.

## 7. Suggested build order

1. Schema: `CalendarEvent`, `CalendarEventAttendee`, `ProjectCalendarVisibility`, `User.deadlineReminderDays`. `db push`.
2. Sync hooks: Task/Project/SiteVisit routes upsert `CalendarEvent` rows on write.
3. `/api/calendar` (list, scoped by project access + `ProjectCalendarVisibility` for external roles) + `/api/calendar/events` (manual CRUD).
4. `/calendar` page: FullCalendar grid, "My Calendar" / project toggle, sidebar nav entry.
5. Deadline-checker extension (Task.dueDate) + `deadlineReminderDays` preference in Settings.
6. Admin drawer addition: per-project `ProjectCalendarVisibility` toggle (client's ADMIN only, their own org's projects).
7. Super admin cross-tenant deadline-health summary in `/admin` Overview.
8. **Decide Path A vs B**, then build the freelancer/subcontractor slice.
9. Mobile (Android) parity - already tracked as a future item in
   `icon_app/FUTURE-UPDATES.md` section 4 ("Calendar (planned on web too)");
   treat this web build as the one that ships first, mobile follows the
   existing app's parity process once the web data model is stable.
