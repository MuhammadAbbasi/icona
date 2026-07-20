# ICONA

Multi-tenant **ERP & CRM SaaS for small and medium construction companies**.
One portal — web + Android — covering the whole project lifecycle: BOQ import,
Kanban workflows, project/task tracking, on-site progress photos, finance
(project ledger + double-entry accounting), labour and subcontractors, loans and
investors, a client portal, and a built-in AI assistant.

This repo is the full application: marketing landing page, authentication and
guided onboarding, the dashboard app, the REST API (web + mobile), and the
Prisma/MySQL data layer.

## Stack
- **Next.js 14.2** (App Router) + **React 18** + **TypeScript**
- **Prisma 5** ORM on **MySQL** (binary engine — see `prisma/schema.prisma`)
- **NextAuth v4** (credentials) for web sessions; **JWT bearer** for the mobile app
- **Tailwind CSS 3.4** + Radix UI primitives + `lucide-react` + `framer-motion`
- **Recharts** dashboards, **ExcelJS/xlsx** for BOQ import/export, **exifr** for photo EXIF
- **Resend** for transactional email, **OpenRouter** (NVIDIA Nemotron) for the AI assistant
- File storage: **local disk by default**, optional **Cloudinary** for serverless deploys
- Zod validation, bcrypt password hashing

## Features
- **Multi-tenancy** — every tenant is an `Organization`; all scoped queries are
  fenced by `orgId` through a Prisma client extension (`src/lib/tenantPrisma.ts`),
  so tenants can never read each other's data. Plan tiers (Starter / Growth /
  Enterprise) enforce project and member limits (`src/lib/entitlements.ts`).
- **Auth & onboarding** — signup → email verification → guided onboarding wizard
  that provisions the company, projects, and the Domain → Task → Subtask
  hierarchy. Password reset, role-based access (Admin / Manager / Employee /
  Freelancer / Client).
- **Projects & workflow** — projects, work domains, tasks, subtasks, a Kanban
  board, assignments, deadlines, and progress rollups.
- **BOQ** — import Bill-of-Quantities workbooks, revise quantities/rates over
  rounds (R0 baseline preserved), take on-site measurements, and export back to
  the original workbook layout.
- **Finance** — per-project cash ledger (income / expense / owner drawings) plus a
  full **double-entry accounting** engine (chart of accounts, journal entries,
  bank transfers, reconciliation, AP aging, WIP, statements) under `src/lib/ledger/`.
  Loans, investors, and investor payouts are tracked per project.
- **Labour** — workers/supervisors, teams, daily work logs, subcontractor
  engagements and logs, salary runs, company overheads.
- **Site photos** — upload progress photos (with GPS/EXIF), gallery per project,
  archival + retention workflow.
- **Client portal** — Client-role users see only their own company's projects and
  their own payment position (internal costs and margins are never exposed).
- **AI assistant** — a floating chat widget over `/api/assistant`: answers
  payment/finance questions, analyzes workflow, and visually reviews site photos.
  Runs on OpenRouter's free NVIDIA Nemotron model, fenced by the caller's own
  access scope. Includes native browser voice input.
- **Mobile API** — token-based REST API (`/api/mobile/*`) for the Android app:
  login/refresh/session management, project hierarchy, photo up/download.

## Project structure
```
prisma/schema.prisma      ~55 models: tenancy, projects/BOQ, finance/ledger, labour, photos, auth
prisma/seed.ts            demo/seed data (npm run db:seed)
src/app/page.tsx          marketing landing page (composes src/components/website/*)
src/app/(auth)/           login, signup, onboarding, forgot/reset-password
src/app/(dashboard)/      the app: projects, board, companies, teams, ledger,
                          finance/statements, overheads, profile, settings, gallery
src/app/api/              REST API (web) — projects, tasks, BOQ, transactions,
                          documents, photos, teams, users, alerts, search, assistant …
src/app/api/mobile/       token-authenticated API for the Android app
src/app/api/cron/         scheduled jobs (deadline checks)
src/lib/prisma.ts         base + tenant-scoped Prisma clients
src/lib/tenantPrisma.ts   orgId isolation (Prisma client extension)
src/lib/auth.ts           NextAuth config;  apiAuth.ts / mobileAuth.ts — request auth
src/lib/entitlements.ts   plan tiers + limit enforcement
src/lib/finance.ts        project cash-ledger math + client-facing finance view
src/lib/ledger/           double-entry accounting engine
src/lib/boq*.ts           BOQ parse / upload / storage / export
src/lib/storage.ts        file storage (local disk, Cloudinary fallback)
src/lib/assistant.ts      AI assistant tools + executors
src/lib/mail.ts           Resend email
src/components/            website/, layout/, projects/, assistant/, ui/ (Radix)
scripts/smoke.mjs         end-to-end smoke test (route crawl + API flows)
```

## Prerequisites
- Node.js 20+
- A **MySQL** database. For local dev this repo uses a Docker container named
  `icona-mysql` (MySQL 8, database `icona`). Any MySQL instance works — just point
  `DATABASE_URL` at it.

## Setup
```bash
# 1. install deps  (use --legacy-peer-deps: next-auth v4 vs nodemailer v9 peer)
npm install --legacy-peer-deps

# 2. start MySQL (example: Docker)
docker run --name icona-mysql -e MYSQL_ROOT_PASSWORD=icona_dev_root \
  -e MYSQL_DATABASE=icona -p 3306:3306 -d mysql:8

# 3. configure environment
cp .env.example .env      # then edit — see Environment below

# 4. create the schema, then (optionally) seed demo data
npm run db:push
npm run db:seed
```

## Run
The app runs on **port 4266**.
```bash
npm run dev       # dev server (http://localhost:4266) — compiles pages on first visit
npm run build     # production build (compiles everything ahead of time)
npm run start     # serve the production build on 4266
npm run stop      # free port 4266
npm run lint
npm run db:studio # browse/edit the database (Prisma Studio, http://localhost:5555)
```
> `next dev` is lazy — it compiles each page the first time you open it and
> hot-reloads on edits. For fast, precompiled loads use `npm run build && npm run start`.
> `predev` frees port 4266 and clears `.next` (works around a G-drive `EPERM`
> lock on Windows) before each `dev`.

## Environment
See `.env.example`. Key variables:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | MySQL connection string |
| `NEXTAUTH_SECRET` | ✅ | NextAuth session signing (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | ✅ | App base URL (e.g. `http://localhost:4266`) |
| `RESEND_API_KEY` / `RESEND_FROM` | for email | Verification / reset / notification email (verified domain required) |
| `OPENROUTER_API_KEY` | for AI | Powers `/api/assistant`; without it the endpoint returns 503, rest of app works |
| `MOBILE_JWT_SECRET` | optional | Android bearer-token secret; auto-generated + persisted if unset |
| `BOQ_STORAGE_DIR` | optional | Where BOQ originals are stored (default `storage/boq-originals`) |
| `CLOUDINARY_*` | optional | Leave **commented** for local-disk storage; set only for serverless deploys. Dummy values break uploads. |

## Storage
Uploads (photos, thumbnails, BOQ originals, documents) go to the gitignored
`storage/` folder by default and are served through authenticated routes — free
and unlimited by disk on any host with a persistent filesystem. On serverless
hosts (e.g. Vercel) the filesystem is ephemeral: set real `CLOUDINARY_*` values
to route uploads to Cloudinary instead. The swap is env-only; all uploads funnel
through `src/lib/storage.ts` and `src/lib/photoStorage.ts`.

## Testing
```bash
npm test                 # unit tests: BOQ math, entitlements, finance fences
node scripts/smoke.mjs   # end-to-end (dev server must be running)
```

## Deploy
- **VPS / cPanel (persistent disk):** run the production build; back up `storage/`.
  The Prisma binary engine + RHEL targets in `schema.prisma` are configured for a
  CloudLinux/cPanel host.
- **Vercel / serverless:** set real `CLOUDINARY_*` credentials (ephemeral
  filesystem), a hosted MySQL `DATABASE_URL`, and the production `NEXTAUTH_URL`.

> Don't run `npm audit fix --force` — it has previously crossed major versions
> (bumping Next to 16, downgrading next-auth to v3) and broken the boot. Use plain
> `npm audit fix`.

## Pending
See `todo.md` (real domain/logo, testimonials, contact inbox, DMARC/email
deliverability, and security hardening: Turnstile, distributed rate-limiting,
breached-password screening, 2FA).
