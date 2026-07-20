# ICONA - Pending / Needs Input

Placeholders in the new software-house site that need real data before launch.
All are marked `TODO` in `src/config.js`.

## Brand & domain
- [ ] **Domain** - `company.domain` is `https://icona.app` (placeholder). Set the
      real domain; it feeds metadata, canonical, sitemap, and robots.
- [x] ~~Logo - currently a text mark + `public/favicon.svg`. Replace with the real
      ICONA logo if there is one.~~ Done: real ICONA mark (I-beam) in
      `public/logo.svg` + matching `public/favicon.svg`, wired into the navbar,
      login page, and dashboard sidebar.
- [x] ~~**App URL** - `company.appUrl` is `https://app.icona.app` (placeholder).
      The navbar "Client login" links to `${appUrl}/login`. Set the real ERP URL.~~
      Moot: the marketing site and the ERP merged into one Next.js app on one
      domain, so `company.appUrl` is now `''` (same-origin) - no separate URL
      to configure.

## Auth / onboarding
- [x] Client login link added to the navbar (desktop + mobile) -> ERP `/login`.
- [x] ~~**Signup + guided onboarding wizard** (planned, "later"): a custom signup
      that provisions a company and walks the user through org details, projects,
      the Domain -> Task -> Subtask hierarchy, employees, finances, and
      admin/manager/employee data rights, as a guided tour + profile setup. This
      is a PRODUCT feature (provisions a tenant), so it belongs in the ERP behind
      the SaaS tenancy work (Wave 1), not the marketing site. The site will just
      link to it. See docs/saas-transformation-plan.md (billing-onboarding /
      config-platform).~~ Done, and further along than originally scoped: the
      marketing site and ERP are now one repo, so `/signup` -> `/onboarding`
      lives right here. 5-step wizard: localization/currency, WBS terminology,
      plan selection, BOQ import, confirm & launch.
- [x] Email verification: signup sends a verification link (Resend); login is
      blocked until it's clicked, with a rate-limited auto-resend so a lost
      email never permanently locks an account (`EmailVerificationToken`).
- [x] Passwordless final step: clicking the verification link mints a
      short-lived, single-use token so onboarding's last step signs the user in
      without re-asking for the signup password (`OnboardingToken`); falls back
      to a password field only if that token is missing/expired.
- [x] BOQ template download (`/api/boq/template`) + real import wired into the
      wizard's step 4 - the uploaded file creates the first project and imports
      it before landing the user on it.

## Pricing
- [x] Tiers set: Starter $25 / Growth $50 / Enterprise $75 per month, with plan
      limits (5/25/unlimited projects; 3/15/unlimited members) and an annual
      toggle (2 months free = pay 10 months).
- [ ] Confirm the plan limits match what the ERP will actually enforce
      (upgrade-on-limit is a product feature; see the SaaS tenancy work).
      Partial: `src/lib/entitlements.ts` already gates project creation against
      the org's plan tier; member limits and the other resources still need
      the same treatment.
- [x] ~~`company.signupPath` (`/signup`) - confirm once the ERP signup wizard
      ships; the site's "Start now" CTAs point at `${appUrl}/signup`.~~ Shipped
      - see Auth / onboarding above.
- [x] Billing starts as a real 14-day free trial, no card collected
      (`Organization.billingStatus`/`trialEndsAt`, set at onboarding). Card
      payments still need a provider (Paddle/Safepay - Stripe doesn't onboard
      Pakistan) wired to a webhook that flips `billingStatus`.

## Testimonials (placeholder)
- [ ] `testimonials[]` are generic, unattributed examples. Replace with real,
      attributed customer quotes (with permission) before launch.

## Contact
- [ ] `contact.email` `hello@icona.app` - set the real inbox.
- [ ] `contact.phone` - confirm.
- [ ] `contact.formspreeId` `xykojjow` - this was ICON Services' Formspree form.
      Confirm it belongs to ICONA or create a new one.
- [ ] `contact.socials` (linkedin/instagram/facebook) - empty. Add real URLs
      (they are hidden until set).

## Deploy
- [ ] Import repo at vercel.com/new as a NEW project (do not touch the CRM's
      Vercel project). Attach the real domain in Vercel > Settings > Domains.

## Email deliverability

### Quick fix (do now) - add DMARC DNS record
The sending domain `muhammadabbasi.com` has no DMARC record. Gmail silently
drops mail from domains without one. Add this TXT record in the DNS panel:

  Name:  _dmarc
  Type:  TXT
  Value: v=DMARC1; p=none; rua=mailto:crm@icon.muhammadabbasi.com

- [ ] Add `_dmarc` TXT record for `muhammadabbasi.com` (see above).

### Proper fix (Resend migration)
The current setup uses the cPanel SMTP on a shared hosting IP
(208.115.236.10). Shared IPs have poor reputation with Gmail/Outlook and
will cause random delivery failures at scale. Replace with Resend:

1. Sign up at https://resend.com (free: 3,000 emails/month).
2. Add and verify `muhammadabbasi.com` as a sending domain in Resend.
3. Resend will provide DKIM + DMARC DNS records - add them.
4. Get a Resend API key and add it to `.env` as `RESEND_API_KEY`.
5. Install the SDK: `npm install resend`.
6. Replace `src/lib/mail.ts` to use the Resend client instead of nodemailer.
7. Remove `SMTP_HOST / SMTP_PORT / SMTP_SECURE / SMTP_USER / SMTP_PASS / SMTP_FROM`
   from `.env` and `.env.example` once Resend is confirmed working.

- [x] Migrate email sending from cPanel SMTP to Resend.

## Security & Authentication (Future Work)

### Multi-Tenant Data Leak Prevention
- [ ] **Strict Tenant Isolation**: Enforce mandatory `orgId` / `tenant_id` context scoping via Prisma Client Extensions / Middleware across all database queries to guarantee zero cross-tenant data leaks.
      Partial, and this one matters: `tenantPrisma.ts` auto-fences 13 models
      (`Project`, `User`, `Company`, `Team`, `Worker`, `Vendor`, `BankAccount`,
      `Lender`, `Investor`, `CustomTemplate`, `BoardColumn`, `OverheadExpense`,
      `SalaryRun`). 13 more models that hang off a project (`Transaction`,
      `Task`, `Subtask`, `TaskPhoto`, `Loan`, `Investment`, `JournalEntry`,
      `Domain`, `Measurement`, `ProjectDocument`, `WorkerWorkLog`,
      `Subcontractor*`, `SiteVisit`, `BoqRevision`) are NOT auto-fenced and rely
      on each route hand-checking the parent project's `orgId` - 19 route files
      touch them. Audited 2026-07-20 and found 2 confirmed, exploitable
      cross-tenant bugs (any ADMIN of any org could delete any org's ledger
      transaction, or read/archive/delete any org's photos and financial
      ledger by guessing an id) - **fixed** in `transactions/[id]`,
      `photos/[photoId]`, and `projects/[id]/transactions` (GET was returning
      another org's transactions/loans/investors without ever checking the
      project existed). Verified with a live two-tenant attack test: cross-org
      reads/deletes now 404, same-org access unaffected, full smoke+unit
      suites pass. The other ~15 routes on this list are NOT yet individually
      audited - same bug shape is plausible there. The real fix is structural
      (extend the tenantPrisma extension to cover project-relation models, not
      patch routes one at a time) but that's a bigger, riskier change to the
      core data-access layer that deserves its own pass with a proper
      cross-tenant test harness (none exists yet - the check above was manual).
- [ ] **Input Sanitization & Schema Validation**: Enforce Zod schemas on all API request bodies and route parameters to prevent injection attacks and unexpected payload structures.
      Partial: Zod is a dependency and used in 12 of 62 API routes today.
      Priority order if picked up: routes that write money first
      (`transactions`, `ledger`, `loans`, `investors`), then everything else.
- [ ] **Anti-Enumeration Protections**: Return generic error messages on login/signup failure to prevent probing for existing user emails or tenant subdomains.
      Partial: login (`auth.ts`) and forgot-password already return a generic
      message regardless of whether the account exists. Signup does NOT -
      it explicitly replies "A user with this email address already exists"
      / "This organization slug is already taken", which is a deliberate
      signup-UX tradeoff (users need to know why signup failed) but does
      allow enumerating registered emails/slugs one at a time.

### Bot & Brute-Force Defense
- [ ] **Cloudflare Turnstile**: Integrate Turnstile CAPTCHA on login, signup, and public form submissions to block automated credential stuffing and bot registrations.
- [ ] **Distributed Rate-Limiting**: Move auth rate-limiting from in-memory maps to Upstash Redis (`@upstash/ratelimit`) for serverless multi-instance protection on Vercel.

### Credential & Account Security
- [ ] **Breached Password Screening**: Integrate `pwned-passwords` (HaveIBeenPwned API via k-Anonymity) to block users from choosing weak or leaked passwords during signup/reset.
- [ ] **MFA / 2FA Support**: Add optional TOTP 2FA (`otplib`) or WebAuthn / Passkeys (`@simplewebauthn`) for hardware-bound login security.
- [x] ~~**Security Headers & Session Hardening**: Enforce Strict CSP, HSTS,
      `X-Frame-Options: DENY`, and HttpOnly/SameSite cookie attributes.~~
      Confirmed present: CSP, HSTS, `X-Frame-Options: DENY`, Referrer-Policy
      and Permissions-Policy are all set in `next.config.mjs`; NextAuth's JWT
      session cookie is httpOnly/sameSite by default.

## Observability
- [x] Persistent server logging (`src/lib/logger.ts`): patches `console.*`
      once per process so every existing log/error call across the app (auth,
      mail, BOQ import, ledger, ~90 call sites) also writes to a rotating
      daily file under `./logs` (gitignored) via a reused append-mode write
      stream - no per-line blocking I/O, no dependency, no route file touched.
      Verified capturing real signup/error traffic. Next step if this needs to
      ship anywhere real: sweep files older than N days from the existing cron
      route (none yet); consider Pino only once there's a place to ship logs
      to (Loki/ELK) - not worth the dependency today.

## Framework currency
- [ ] **Next.js 14.2 is end-of-life** (EOL 2025-10-26, final patch 14.2.35).
      Next.js 15 is Maintenance LTS with ~3 months of runway left; Next.js 16.2
      is Active LTS and the recommended target. Cost is mostly React 19 compat,
      async `params`/`searchParams` (62 route handlers use them), and NextAuth
      v4 compatibility - budget a full day + a full smoke pass, not an afternoon.
