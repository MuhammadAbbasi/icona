# ICONA

Multi-tenant **ERP & CRM SaaS for small and medium construction companies**.
One portal (web + Android) covering the whole project lifecycle: BOQ import,
Kanban workflows, project/task tracking, on-site progress photos, finance
(project ledger + double-entry accounting), labour and subcontractors, loans and
investors, a client portal, built-in AI assistant, and a full-featured Super Admin Command Portal.

This repo is the complete application: marketing landing page, authentication, guided onboarding, dashboard app, Super Admin management suite, REST API (web + mobile), and Prisma/MySQL data layer.

---

## Stack
- **Next.js 14.2** (App Router) + **React 18** + **TypeScript**
- **Prisma 5** ORM on **MySQL** (binary engine for Linux/RHEL)
- **NextAuth v4** (credentials) for web sessions; **JWT bearer** for the mobile app
- **Tailwind CSS 3.4** + Radix UI primitives + `lucide-react` + `framer-motion`
- **Recharts** dashboards, **ExcelJS/xlsx** for BOQ import/export, **exifr** for photo EXIF
- **Ollama / Cloud Gemini 1.5 Flash / OpenRouter** for AI Copilot telemetry & execution
- **AES-256-GCM Encryption** at rest for third-party API tokens & credentials
- File storage: **local disk by default**, optional **Cloudinary** for serverless deploys

---

## What's New & Core Features

### 1. Signed-Up Client Super Admin Dashboard (`/admin`)
- **Executive Telemetry**: Total Signed-Up Clients, Paid Active Clients, Trial Clients, MRR (USD & PKR), Total Built Projects, and Defined Users.
- **Client Command Table**: Searchable directory of onboarded construction firms with live project/user count indicators against plan tier limits.
- **Client Detail Slide-Over Drawer**: Admins can override project limits, override user seats, upgrade/downgrade plan tiers (Starter, Growth, Enterprise), switch tenant LLM engines, and toggle account status.
- **Subscriptions & Tax Invoicing (`/admin/billing`)**: MRR/ARR analytics, Paddle MoR sync, and PKR FBR tax invoice builder.
- **Security & Audit Logs (`/admin/security`)**: Real-time cross-tenant access monitors, brute-force alerts, and security audit logs.

### 2. Dual LLM AI Copilot Telemetry & Engine Switcher (`/admin/llm`)
- **1-Click Model Switcher**: Seamless toggle between **Self-Hosted Local Ollama (Qwen 2.5 7B Instruct)** and **Cloud Gemini 1.5 Flash**.
- **Tenant Telemetry**: Per-tenant tracking of prompt vs completion tokens, response latency, and estimated cost breakdown.

### 3. Multi-Tool Integration & Messaging Engine
- **WhatsApp Dual-Rail Messaging**:
  - *Mode A*: Shared ICONA Master Number (`+92 42 111 ICONA`) for out-of-the-box system digests.
  - *Mode B*: Dedicated Client WABA Number (`+92 3XX XXXXXXX`) using custom Meta Phone Number ID and Access Token.
- **Telegram Dual-Rail Bot Architecture**:
  - *Mode A*: ICONA Master Bot (`@IconaMasterBot`) for platform alerts and Super Admin notifications.
  - *Mode B*: Client Dedicated Bot (e.g. `@ApexBuildersBot`) for company field supervisors, photo logs, and attendance.
- **Enterprise Integrations**: Odoo ERP accounting sync, Slack milestone & blockage alerts, Notion inspection report archiving, and Zapier webhooks.
- **Auto Chat Resolver & Live Dispatch**: Automatically inspects Telegram `getUpdates` to resolve user Chat IDs and dispatches live verification test messages.

### 4. Enterprise AES-256-GCM Security & Token Masking
- **Encryption at Rest**: Sensitive tokens (Meta Access Tokens, Telegram Bot Tokens, Notion Keys) are encrypted using **AES-256-GCM** (`src/lib/crypto.ts`).
- **Zero Raw Token DOM Exposure**: GET endpoints return masked placeholders (`••••••••DKgE`), preventing token exposure in Chrome DevTools or client HTML DOM.
- **Trusted Access Control Whitelist**: Restricts Telegram/WhatsApp bot commands to authorized staff usernames, numeric IDs, or phone numbers.

### 5. Feature Control Matrix (Super Admin & Company Level)
- **Super Admin Matrix (`/admin/feature-flags`)**: Real-time toggles for AI Copilot, Roman Urdu NLU, WhatsApp alerts, Telegram bots, Odoo sync, Slack alerts, and maintenance mode.
- **Company Feature Matrix (`/settings` -> Feature Control Matrix)**: Company Admins and Managers can toggle ERP capabilities, AI widgets, and communication channels specifically for their firm's team.

---

## Project Structure
```
prisma/schema.prisma      ~55 models: tenancy, projects/BOQ, finance/ledger, labour, photos, auth
prisma/seed.ts            Official ICONA seed data (admin@icona.pk, password123)
src/app/page.tsx          Marketing website landing page
src/app/(admin)/admin/    Super Admin Command Suite (clients, LLM, billing, security, feature flags, settings)
src/app/(auth)/           Login, signup, onboarding, forgot/reset-password
src/app/(dashboard)/      The core ERP app: projects, board, companies, teams, ledger, finance, overheads, settings
src/app/api/admin/        Admin API endpoints: stats, clients, LLM engine toggle, feature-flags, settings
src/app/api/integrations/ Test verification endpoint for WhatsApp, Telegram, Slack, Odoo
src/lib/crypto.ts         AES-256-GCM encryption & token masking helper
src/lib/tenantPrisma.ts   orgId multi-tenant isolation extension
src/lib/adminAuth.ts      SUPER_ADMIN & ADMIN role verification
docs/                     Architecture & integration specifications (admin_layout.md, integrations_prompt.md)
```

---

## Quick Setup & Local Run

### Prerequisites
- Node.js 20+
- MySQL 8.0+

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Configure environment
cp .env.example .env

# 3. Create schema & seed official accounts
npm run db:push
npm run db:seed

# 4. Start development server (Port 4266)
npm run dev
```

### Official Demo Logins (Password: `password123`)
- **Super Admin**: `admin@icona.pk` (Redirects directly to `/admin`)
- **Growth Client Admin (Apex Builders)**: `farhan@apexbuilders.pk`
- **Enterprise Client Admin (Alpha Construct)**: `usman@alphaconstruction.pk`

---

## Testing & Build Verification
```bash
npm run build     # Production build
npm run start     # Run production bundle on port 4266
npm test          # Unit tests for finance & entitlements
node scripts/smoke.mjs  # End-to-end API & page crawl
```
