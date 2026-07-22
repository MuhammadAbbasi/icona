# ICONA - Full Testing Guide

How to bring up, exercise, and verify the entire project end to end: setup,
database, email, auth, every core feature, the integrations, and the automated
tests. Written 2026-07-21 against the real repo (MySQL via Docker, Resend email,
local Ollama / OpenRouter LLM, Cloudflare R2 storage).

> **Honesty notes up front** (details in each section):
> - `next build` is currently **red** - a calendar type error blocks the
>   production build. Dev (`npm run dev`) runs fine. See §11.
> - Some Super Admin dashboard numbers (per-tenant queries, token counts,
>   cost) are **computed formulas, not real usage telemetry.** Don't test them
>   as if they were measured. See §11.
> - Integration coverage is uneven: **Telegram** genuinely round-trips;
>   **WhatsApp/Slack/Odoo/Notion** are config-or-stub only. See §9.

---

## 0. Prerequisites

- **Node 20+**, **Docker** (for MySQL), **git**.
- Install deps with the legacy flag - a pre-existing peer conflict
  (`nodemailer` vs `next-auth`) makes a plain `npm install` fail:

```bash
npm install --legacy-peer-deps
```

- **Windows / G-drive quirk** (this machine): the `.next` folder gets an
  EPERM lock while `next dev` is running. Always **stop the dev server before**
  `rm -rf .next` or `npm run build`, or the build dies on a file-lock error.
  `npm run predev` already kills the port-4266 process for you on `npm run dev`.

---

## 1. Database bring-up

The app points at a Docker MySQL named `icona-mysql` (see `.env` →
`DATABASE_URL="mysql://root:icona_dev_root@localhost:3306/icona"`).

```bash
# First time only - create the container:
docker run --name icona-mysql \
  -e MYSQL_ROOT_PASSWORD=icona_dev_root \
  -e MYSQL_DATABASE=icona \
  -p 3306:3306 -d mysql:8

# Later - just restart it:
docker start icona-mysql

# Push the Prisma schema and seed the demo tenant:
npm run db:push
npm run db:seed
```

**Verify:** `npm run db:studio` opens Prisma Studio - you should see the
`org-icona` organization, 3 companies, 4 users, 2 projects, board columns.

### Seeded accounts (password for all: `password123`)

| Email | Role | Lands on | Use it to test |
|---|---|---|---|
| `admin@icona.pk` | SUPER_ADMIN | `/admin` | Platform command suite, LLM switch, client mgmt |
| `farhan@apexbuilders.pk` | ADMIN | `/board` | Full tenant ERP (Apex Builders) |
| `usman@alphaconstruction.pk` | MANAGER | `/board` | Manager scope (Alpha Construction) |
| `sara@icona.pk` | EMPLOYEE | `/board` | Assigned-project-only scope |

There is **no seeded CLIENT / FREELANCER / SUBCONTRACTOR** account. To test
those scopes, create one in Prisma Studio (set `role`, `companyId`/`projectId`,
and `emailVerified` to any date so login isn't blocked), or invite via the app.

---

## 2. Run the app

```bash
npm run dev        # http://localhost:4266
```

Production bundle:

```bash
npm run build      # ⚠ currently fails - see §11
npm run start      # serves the built app on 4266
```

---

## 3. Email setup & testing

Email goes through **Resend** (`src/lib/mail.ts`), not raw SMTP. Two env vars:

```bash
RESEND_API_KEY="re_..."                     # from resend.com
RESEND_FROM="ICONA <info@icona.muhammadabbasi.com>"   # domain must be verified in Resend
```

### 3a. You can test the whole flow with NO real inbox

`sendEmail` has a **dev fallback**: if `RESEND_API_KEY` is unset, it does **not**
send - it prints the full email (recipient, subject, and the verification link)
to the **server console** and returns `{ simulated: true }`
(`src/lib/mail.ts:14-24`). So to test signup/verification without wiring Resend:

1. Comment out `RESEND_API_KEY` in `.env`, restart dev.
2. Sign up (below). Read the verification URL straight from the terminal.

### 3b. End-to-end email verification test

The flow (`src/lib/verifyEmail.ts`, `src/app/api/auth/{signup,verify-email}`):

1. **Sign up** at `/signup` with a fresh email + name.
2. Server creates a hashed token in `emailVerificationToken` (24 h TTL, via
   `systemPrisma`) and emails a link:
   `/api/auth/verify-email?token=<raw>&email=<addr>`.
3. **Get the link:** from your inbox (real key) or the server console (fallback,
   §3a). You can also read the token row in Prisma Studio.
4. **Click it** → `emailVerified` is set → login is now allowed.
5. **Before** verifying, try to log in - it should be blocked, and logging in
   pre-verification triggers a **resend** (`src/lib/auth.ts`).

### 3c. Testing real delivery

Set a real `RESEND_API_KEY`, make sure `RESEND_FROM`'s domain is **verified in
the Resend dashboard**, sign up with an address you control. Watch the server
log for `✉️  Email sent via Resend ... ID: ...`.

**Common failures:** domain not verified in Resend → send throws (surfaced as a
500 on signup); `RESEND_FROM` on an unverified domain → same; key missing →
silently *simulated* (check the log for the `[DEV EMAIL LOG]` banner).

### 3d. Password reset

Same transport. `/forgot-password` → enter email → reset link/code emailed →
`/reset-password`. Test with a seeded account; read the link from console if
using the fallback.

---

## 4. Auth & role scoping

Log in as each seeded role and confirm the **sidebar and data scope** differ:

- `admin@icona.pk` → redirected to `/admin`; sees the Super Admin suite.
- `farhan@…` (ADMIN) → all of the tenant's projects/finance/settings.
- `usman@…` (MANAGER) → manager nav, no Super Admin.
- `sara@…` (EMPLOYEE) → only assigned/engaged projects; no Finance, no Companies.

Scope is enforced in `src/lib/projectAccess.ts` (`getProjectScope`). Quick
regression: `npm test` includes `projectAccess.test.ts` asserting each role's
project filter (§10).

---

## 5. Core feature checklist (manual, as an ADMIN)

| Area | Action | Expected |
|---|---|---|
| **Projects** | Open a seeded project (DHA Residential) | Overview, domains/tasks, budget in PKR |
| **Board** | Drag a card between Kanban columns | Status persists on reload |
| **BOQ** | Import a BOQ workbook (Excel) | Domains → tasks → priced subtasks created; export round-trips |
| **Finance / Ledger** | Add a transaction | Reflected in project ledger + double-entry accounting |
| **Photos** | Upload a site photo to a task | Appears; URL points at R2 (§8) |
| **Calendar** | Open `/calendar`, press **Sync** | Task/project deadlines + site visits appear as events; "Synced N ago" updates |
| **Assistant** | Open the AI widget, ask *"list my projects"* | Answers from real data (§6) |

Repeat the read paths as EMPLOYEE to confirm scoping (should see fewer
projects); as CLIENT (if you created one) confirm view-only, own-company only.

---

## 6. AI Assistant / LLM

Config comes from env + the Super Admin switcher at `/admin/llm`
(`getLLMConfig` in `src/app/api/assistant/route.ts`):

```bash
LLM_BASE_URL="http://192.168.1.40:11434/v1"   # local Ollama
LLM_MODEL="qwen2.5:7b-instruct"
OPENROUTER_API_KEY="sk-or-..."                 # cloud fallback
```

**Tests:**
- Ask *"How much has been spent on Gulberg Commercial Tower?"* → figure pulled
  via tools, formatted `PKR …`. It must **refuse to invent** numbers.
- **Roman Urdu:** *"Canal Plaza ka kharcha kitna hua?"* → answers in Roman Urdu.
- **Provider switch:** if Ollama at `192.168.1.40` is unreachable the call errors;
  switch provider to OpenRouter in `/admin/llm` and retry - same question should
  now answer via the cloud model.
- The assistant is **read-only** (5 tools: list/finances/workflow/photos/view) -
  it cannot change data. Confirm it declines write requests.

---

## 7. Storage (photos, logos, invoices)

Precedence in `src/lib/storage.ts` → **R2 → Cloudinary → local `./storage`**.
This env has R2 configured, so uploads go to Cloudflare R2.

**Test:** upload a photo (§5), inspect the returned `url` - it should be an R2
public URL. To test the **local-disk fallback**, unset the `R2_*` vars and
restart; uploads then land in `./storage/icona/...`.

---

## 8. Calendar sync specifics

- **Sync button** (`POST /api/calendar/sync`, ADMIN/MANAGER only) rebuilds
  derived events from `Task.dueDate`, `Project.endDate`, `SiteVisit.date`.
- **Idempotency test:** press Sync twice - the event count must not change, and
  any manually-created (authored) event must survive both runs.
- **Filters** (project / employee / type) are client-side - toggling them must
  **not** issue new network requests.
- Known gap: navigating far outside the current month may show empty (the page
  fetches a fixed ±window on mount). Noted in the calendar review.

---

## 9. Integrations - honest status

Configured under **Settings → integrations**; tested via
`POST /api/integrations/test` (`src/app/api/integrations/test/route.ts`).

| Channel | What the test actually does | How to test |
|---|---|---|
| **Telegram** | **Real.** Calls `getMe`, sends a live message, auto-resolves chat ID from `getUpdates`. | Create a bot with **@BotFather**, paste the token in Settings, click Test. Send `/start` to your bot first, then enter your numeric Telegram user ID (get it from **@userinfobot**). |
| **WhatsApp** | **Stub.** Only checks that a Phone-Number-ID + token are present; returns success **without calling Meta.** | You can verify the UI/validation, but no message is actually sent. Real WhatsApp = Meta Cloud API onboarding (not built). |
| **Slack** | **Shallow.** Rejects placeholder URLs; does **not** POST to the webhook. | Paste a real incoming-webhook URL to pass validation; delivery is not exercised. |
| **Odoo / Notion / Zapier** | **Config only.** Fall through to a generic "test completed" - no real call. | Treat as placeholders. |

**The proper Telegram/WhatsApp bot** (webhook + identity binding + field
photo/measurement writes + voice) is **planned, not built** -
see `docs/telegram_integration.md`. The README's "dual-rail" descriptions are
aspirational for those; only the connection-test above is live today.

Tokens are stored **AES-256-GCM encrypted** (`src/lib/crypto.ts`) and returned
masked (`••••••••`) - confirm a saved token never appears in plaintext in the
GET response or DOM.

---

## 10. Automated tests

```bash
npm test
```

Runs (`node --import tsx --test`): `utils.test.ts`, `entitlements.test.ts`,
`finance.test.ts`, `projectAccess.test.ts` - money math, plan entitlements, and
the role→project-scope security boundary. All should pass (~28 subtests).

> If you add a test file, add it to the `"test"` script in `package.json` - the
> file list is hardcoded, so a new file otherwise never runs.

### End-to-end smoke crawl

```bash
# with the dev server running:
node scripts/smoke.mjs
```

Logs in (cookie auth), crawls every page route, and drives the core API flows -
companies, project → domain → task → subtask, a transaction, a photo upload,
search - printing `PASS`/`FAIL` per step. Override target with env:

```bash
SMOKE_BASE=http://localhost:4266 SMOKE_EMAIL=farhan@apexbuilders.pk SMOKE_PASS=password123 node scripts/smoke.mjs
```

---

## 11. Known blockers & caveats (test around these)

1. **Production build is red.** `src/app/api/calendar/route.ts` selects a
   `color` field that doesn't exist on `Project`, which fails `next build`
   type-checking. Dev works. Must be fixed before `npm run build` / deploy.
2. **FullCalendar version mismatch** was fixed locally (aligned all packages to
   6.1.21) but that `package.json` change may be **uncommitted** - if the
   calendar page won't compile after a fresh `npm install`, re-apply it.
3. **Fabricated Super Admin metrics.** `monthlyQueries`, token counts, and
   USD/PKR cost on the admin dashboard are derived from formulas
   (`projects*18 + users*12 + 25`), **not** real usage. Don't validate them as
   measured telemetry.
4. **New roles not everywhere.** FREELANCER/SUBCONTRACTOR are added to some
   gates but a few API routes don't know them yet - those fail **closed** (403),
   so expect "forbidden", not data leaks, on untouched routes.

---

## Quick-start (TL;DR)

```bash
docker start icona-mysql || docker run --name icona-mysql -e MYSQL_ROOT_PASSWORD=icona_dev_root -e MYSQL_DATABASE=icona -p 3306:3306 -d mysql:8
npm install --legacy-peer-deps
npm run db:push && npm run db:seed
npm run dev                 # → http://localhost:4266, log in as admin@icona.pk / password123
npm test                    # unit tests
node scripts/smoke.mjs      # E2E crawl (server must be up)
```
