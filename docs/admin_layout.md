# ICONA Super Admin Dashboard - Architecture & Layout Specification

Canonical spec for `/admin` (the ICONA platform's own super-admin console, not
a construction firm's own admin - see the role split below). Verified against
the actual code on 2026-07-20; this document leads with what's real vs. mocked
so it stays trustworthy as the implementation catches up to it.

## 0. Role split (read this first)

Two roles share the word "admin" and must never be confused:

| Role | Scope | UI |
|---|---|---|
| `SUPER_ADMIN` | ICONA's own staff. Platform-wide: every tenant's data, billing, LLM usage, global feature flags. One seeded account (`admin@icona.pk`). | `/admin/*` |
| `ADMIN` | A single construction firm's own admin - the role every signup gets automatically. Scoped strictly to their own `orgId`. | `/board`, `/projects`, `/settings`, ... |

**Fixed 2026-07-20**: `requireAdminUser()` (`src/lib/adminAuth.ts`) previously
accepted *either* role, and `/admin`'s layout had no server-side role check at
all - so every normal customer's `ADMIN` account (i.e. every signed-up
tenant) could reach the super-admin console and its APIs, and read/edit every
other tenant's billing, status, plan, and switch the platform LLM provider.
Closed at every layer: `adminAuth.ts` now checks `SUPER_ADMIN` only; the
`(admin)/admin/layout.tsx` server component redirects any non-`SUPER_ADMIN`
to `/board`; `LoginForm.tsx` only routes `SUPER_ADMIN` to `/admin` post-login;
`Sidebar.tsx` only shows the "Client Admin Portal" link to `SUPER_ADMIN`.
Verified with a live cross-role attack test (see repo history) - a tenant
`ADMIN` now gets 403/redirect on every `/admin` surface; the real
`SUPER_ADMIN` account is unaffected.

## 1. Overview & Objectives

The **ICONA Super Admin Dashboard** is the central control plane for ICONA
platform administrators: 360-degree operational visibility and control over
every onboarded client (tenant), platform subscriptions, resource
consumption, security, and the AI Copilot.

### Key administrative capabilities
- **Client & tenant management**: signups, org profiles, user/project counts.
- **Entitlement enforcement visibility**: built vs. limit, per the *actual*
  enforced tiers (see 1a - the admin UI and the enforcement engine must read
  the same numbers, they currently don't).
- **LLM Copilot governance**: usage, cost, latency - once real (see 4).
- **Subscription & billing controls**: status, tier, renewals.
- **Security & audit**: cross-tenant access monitoring, admin action log -
  once persisted (see 5).

### 1a. Tier limits - reconcile before trusting any of these screens

The plan limits appear **three times** in this codebase, and they disagree:

| Source | Starter | Growth | Enterprise |
|---|---|---|---|
| `src/lib/entitlements.ts` (**the one that's actually enforced** on project creation) | 5 projects / 3 members | **unlimited** projects / 15 members | unlimited / unlimited |
| `src/config.js` (marketing site copy) | 5 / 3 | **25** projects / 15 members | unlimited / unlimited |
| `src/app/api/admin/clients/route.ts` (admin dashboard display, hardcoded) | **1** project / 3 members | **5** projects / 15 members | unlimited / unlimited |

This is the same "single source of truth" bug the color theme had. Before
building more admin UI on top of these numbers: **pick the real Growth
project limit (25, per marketing? unlimited, per entitlements.ts?) and make
`entitlements.ts` the only place any of the three numbers live** - the admin
API should `import { PLANS } from '@/lib/entitlements'` instead of
re-declaring the ladder, and the marketing config should either read from it
too or a comment should say plainly that marketing copy and enforcement are
allowed to diverge (e.g. "advertised as 25, soft-capped at unlimited for
launch"). Until this is reconciled, don't trust the "X / Max" columns in the
client table below.

---

## 2. Layout Structure & UI Shell

Uses the official ICONA design tokens - see `AGENTS.md`'s Brand & Design
System section (Deep Navy `#1A365D`, Royal Blue `#2563EB`, Sky Cyan
`#38BDF8`, background `#F8FAFC`, surface `#FFFFFF`, text `#0F172A`).

```
+-----------------------------------------------------------------------------------+
|  ICONA ADMIN | [Search Clients/Users/Projects...]  [LLM Status] [Super Admin]      |
+---------------+-------------------------------------------------------------------+
| Navigation    | Main Workspace Header: Section Title + Quick Actions               |
|               +-------------------------------------------------------------------+
| - Overview    | Key Metrics Cards (MRR, Active Clients, Projects, Users, Tokens)   |
| - Clients     +-------------------------------------------------------------------+
| - LLM Usage   |                                                                   |
| - Billing     | Main Content Area (Data Tables, Graphs, Detail Drawers, Modals)    |
| - Security    |                                                                   |
| - Feature Flags|                                                                  |
| - Settings    |                                                                   |
+---------------+-------------------------------------------------------------------+
```

**Built**: `AdminSidebar.tsx`, `AdminHeader.tsx` (7 nav items, all real
routes). **Not yet built**: the header's universal search and "Provision New
Client" / "Export CSV" quick actions mentioned in earlier drafts of this doc
- don't assume they exist; they're in section 8's backlog now, not the UI.

---

## 3. Client & Tenant Management (`/admin/clients`, `ClientTable.tsx`)

**Built and real**: the client directory queries `systemPrisma.organization`
directly (name, slug, status, billingStatus, planId, project/user counts via
`_count`, owner from the first `ADMIN`-role user). Status/billing/plan
`PATCH` writes to the real `Organization` row.

**Not real yet**: `monthlyQueries` in this route's response is
`Math.floor(Math.random() * 400) + 50` - a literally random number
regenerated on every request. Do not ship this to anyone; either wire it to
real usage data (section 4) or remove the column until it exists.

### Client Detail Drawer (`ClientDetailDrawer.tsx`)
Overview/profile, status toggle, admin notes, project & user overrides,
per-client LLM controls, billing actions - the drawer UI exists; verify
before relying on it whether each action actually persists or is still
front-end-only (check the component directly, this doc doesn't re-verify
every button).

**High-risk feature called out for guardrails, not a green light to build
casually**: "Impersonate Client Owner." If/when this is implemented:
- Must mint a separate, short-lived, clearly-scoped session (not silently
  reuse the super admin's own session with a different `orgId`).
- The impersonated session's UI must show a persistent, unmissable banner
  ("Viewing as {tenant} - Super Admin session") - never a silent switch.
- Every impersonation start/end must write to the audit log (section 5) with
  who, which tenant, and for how long.
- Should be read-only by default; a write during impersonation is a much
  bigger trust and audit surface and should be a separate, explicit decision.

---

## 4. LLM AI Copilot Analytics (`/admin/llm`) - currently 100% placeholder data

**This is the section the user most wants to be real, and right now none of
it is.** Every number in `AdminOverviewPage`, `/api/admin/stats`, and
`/api/admin/llm` is a hardcoded constant or literal `Math.random()` call.
There is no `AssistantUsageLog`-style model in `prisma/schema.prisma`, and
`src/app/api/assistant/route.ts` (the actual Copilot endpoint) writes nothing
anywhere when it runs a query. The "3,625 monthly queries", "4.2M input
tokens", "395ms avg latency", and the entire per-tenant `TenantLLMTable`
sample rows (Skyline Infrastructure, Apex Builders, Al-Rehman) are
illustrative fiction, not telemetry.

### What real instrumentation needs
1. **A new model**, e.g.:
   ```prisma
   model AssistantUsageLog {
     id             String   @id @default(cuid())
     orgId          String
     org            Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
     userId         String
     provider       String   // "ollama" | "gemini" | "openrouter"
     model          String
     inputTokens    Int
     outputTokens   Int
     latencyMs      Int
     success        Boolean
     errorMessage   String?  @db.Text
     createdAt      DateTime @default(now())

     @@index([orgId])
     @@index([createdAt])
   }
   ```
2. **One write per call** in `src/app/api/assistant/route.ts`, right after
   the provider responds (success or failure) - capture token counts from the
   provider's own response (OpenAI-compatible APIs return `usage.prompt_tokens`
   / `usage.completion_tokens`), latency via a `Date.now()` delta, and
   `orgId`/`userId` from the already-resolved session/API user.
3. **Real aggregation** in `/api/admin/stats` and `/api/admin/llm`: replace
   the hardcoded object with `groupBy` queries over `AssistantUsageLog`
   (sum tokens, count queries, avg latency, success rate), scoped to the
   current month for the "monthly" figures and per-`orgId` for the tenant
   table.
4. **Cost calculation**: token counts x provider's real per-token price
   (config constant per provider/model, not invented per call) - keep the
   USD->PKR conversion as an explicit, dated constant so it's obviously an
   approximation, not a live FX rate.
5. Only after (1)-(4) exist should `/admin/llm`'s "System Prompt Sandbox" and
   rate-limit controls be built - they're control surfaces over data that
   doesn't exist yet.

### Global provider switcher
`POST /api/admin/llm` does update `currentProvider`/`currentModel` **module-level
variables** - meaning the switch is real for as long as the Node process
stays warm, but resets to the `.env` default on every restart/redeploy and is
not shared across serverless instances. Fine for a single-process VPS/cPanel
deploy (this repo's actual target per the README); would need a DB-backed
setting (`SystemSetting`, which already exists and is used elsewhere for
platform config) before this could survive a multi-instance deploy.

---

## 5. Security & Audit Logs (`/admin/security`) - also currently fabricated

The page's three "telemetry" cards (`Strict Scoping Active`,
`0 Violations Detected`, `RBAC Enforcement On`) are hardcoded JSX, not derived
from any real check - and until 2026-07-20 the middle claim was actively
false (see section 0). `AdminAuditLogTable.tsx`'s rows are a hardcoded sample
array; nothing is written to any database when an admin action happens.

### What real security telemetry needs
1. **A persisted `AdminAuditLog` model** (adminUserId, action, targetOrgId,
   payload diff as JSON, ip, createdAt) - insert a row from every admin
   mutation route (`clients` PATCH, `llm` POST, `feature-flags` POST,
   `settings` POST).
2. **Real IDOR-attempt signal**: `tenantPrisma.ts`'s fail-closed path already
   `throw`s when `orgId` context is missing on a scoped-model query - that
   throw is a genuine security-relevant event happening right now with
   nowhere to go. Catch it at the point it's thrown (or in each route's outer
   try/catch) and write a row to a lightweight `SecurityEvent` log instead of
   just crashing the request. That's a real "cross-tenant IDOR attempt"
   counter, unlike today's hardcoded "0 Violations."
3. Until (1) and (2) exist, this page should say "not yet instrumented," not
   a fabricated all-clear - a security dashboard that lies is worse than one
   that admits a gap.

---

## 6. Subscriptions & Billing (`/admin/billing`)

Structure exists (MRR/ARR/ARPU/churn cards, Paddle sync section, manual PKR
invoice builder) - verify against the live component before trusting any
number here too; the same "is this wired to `systemPrisma` or is it a
constant" question applies. Paddle integration itself does not exist yet in
this codebase (checked: no `paddle` reference anywhere) - the billing
provider decision from `todo.md`'s Pricing section (Paddle recommended,
Stripe doesn't onboard Pakistan) is still open and this page's Paddle-sync
copy is aspirational until that's actually integrated.

---

## 7. Feature Flags (`/admin/feature-flags`)

Real API wiring confirmed (`fetch('/api/admin/feature-flags')` on load, POST
on toggle). Verify the flags actually gate anything in the app they claim to
(`ENABLE_AI_COPILOT`, `ENABLE_WHATSAPP_ALERTS`, etc.) before assuming a
toggle here has a real effect - a flag that's stored but never checked
anywhere is the same class of "looks real, isn't" issue as sections 4-5.

---

## 8. Backlog - genuinely missing, worth adding to maximize control/visibility

Ranked roughly by value per effort:

1. **Reconcile the tier-limit triple-source bug** (1a) - blocks trusting half
   the dashboard.
2. **Real LLM usage instrumentation** (4) - the specific thing asked for.
3. **Real audit log persistence** (5) - especially the fail-closed-path
   counter, which is nearly free since the signal already exists.
4. **Tenant user directory drill-down**: the client drawer currently shows
   counts; a super admin managing support requests will want the actual
   list (name, email, role, status, last login) without dropping into the
   database by hand.
5. **Cron/background-job health**: `src/lib/deadline-checker.ts` and
   `src/lib/photo-retention.ts` run on schedules with no visibility today -
   last-run timestamp, success/failure, next scheduled run, surfaced
   somewhere in `/admin` (Overview or a new "System Health" section). This
   becomes directly relevant once the calendar/deadline feature ships, since
   that's the same cron doing the reminder work.
6. **Storage usage per tenant**: local-disk storage (`storage/`) has no
   per-org size visibility; useful before storage becomes a support issue.
7. **Scoped admin-side search** stays a *separate* code path from the
   tenant-facing `/api/search` (which is intentionally `orgId`-scoped) - do
   not let a "add search everywhere" pass accidentally widen the tenant
   search's fence.
8. **GDPR-style tenant data export/delete**: not urgent pre-launch, worth a
   line item for whenever compliance becomes a real question.

---

## 9. Technical Architecture & File Structure (as built)

```
src/
├── app/
│   └── (admin)/
│       └── admin/
│           ├── layout.tsx          # RBAC guard (SUPER_ADMIN only, redirects otherwise) + AdminSidebar shell
│           ├── page.tsx            # Overview: KPI cards, client table, LLM telemetry banner
│           ├── clients/page.tsx    # Client directory (dedicated page; page.tsx also embeds the table)
│           ├── llm/page.tsx        # LLM Copilot usage & engine switcher
│           ├── billing/page.tsx    # MRR/ARR, Paddle sync UI, PKR invoice builder
│           ├── security/page.tsx   # Audit log table + (currently fake) security telemetry cards
│           ├── feature-flags/page.tsx
│           └── settings/page.tsx   # Master integration credentials (WhatsApp/Telegram), AES-256-GCM masked
├── components/admin/
│   ├── AdminSidebar.tsx, AdminHeader.tsx
│   ├── ClientTable.tsx, ClientDetailDrawer.tsx
│   ├── LLMUsageChart.tsx, TenantLLMTable.tsx
│   ├── AdminAuditLogTable.tsx (sample data only - see section 5)
│   └── FeatureFlagToggle.tsx
├── app/api/admin/
│   ├── stats/route.ts, clients/route.ts, llm/route.ts
│   ├── feature-flags/route.ts, settings/route.ts
└── lib/
    ├── adminAuth.ts   # requireAdminUser() - SUPER_ADMIN only (fixed 2026-07-20)
    └── crypto.ts      # AES-256-GCM encrypt/mask for stored integration secrets
```

---

## 10. Verification checklist

- [x] Favicon serves the current brand mark (`#1A365D` -> `#2563EB` I-beam);
      confirmed via direct fetch, no stale `favicon.ico` conflicting. If a
      browser tab still shows an old icon, that's a client-side favicon
      cache (notoriously sticky) - hard refresh / new profile / incognito to
      confirm, not a code issue.
- [x] Admin route authorization: `SUPER_ADMIN` required at the API layer
      (`adminAuth.ts`), the page layout (`admin/layout.tsx` redirect), login
      routing (`LoginForm.tsx`), and sidebar visibility (`Sidebar.tsx`).
      Verified with a live attack test: a tenant `ADMIN` gets 403/redirect
      everywhere; the seeded `SUPER_ADMIN` is unaffected.
- [ ] Tier limits reconciled to one source (`entitlements.ts`) across
      marketing copy and the admin client table.
- [ ] Real LLM usage tracking (`AssistantUsageLog` model + instrumentation).
- [ ] Real audit log persistence (`AdminAuditLog` + fail-closed-path signal).
- [ ] Cron/background-job health visibility.
