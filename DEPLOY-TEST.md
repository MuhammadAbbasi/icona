# ICONA - Deployment & E2E Test Report

Role: Lead DevOps / QA. Date: 2026-07-15.
Environment: Windows 11, Node v20.18.1, npm 10.8.2. Clean clone off-Drive
(`scratchpad/icona-qa`) from `https://github.com/MuhammadAbbasi/icona.git`.

> **Nature of the app:** ICONA is a **fully static Next.js 14 marketing site** -
> no backend, database, auth, API routes, containers, or env vars. Phases that
> assume a full-stack app (Docker provisioning, migrations/seeders, backend REST
> auth probing, unit/integration suites) have **no artifact to exercise** and are
> marked N/A with the reason. Everything that *does* apply was run for real.

---

## 1. Deployment Log

### Phase 1 - Repo & Environment
- `git clone` -> branch `main`, HEAD `2d101a8` (latest). Connection OK.
- Env template scan: **no** `.env` / `.env.example` / `.env.sample`. The site
  reads zero environment variables (`grep process.env` = none), so there was
  **nothing to generate** - no dummy secrets, DB creds, or ports were needed.
- Infra scan: no `docker-compose.yml`, `Dockerfile`, `Makefile`, or CI yaml.

### Phase 2 - Build (bare-metal; Docker N/A)
- `npm install` -> 108 packages in ~19s, exit 0.
- `npm run build` (`next build`) -> exit 0. All 6 routes `○ Static`
  (prerendered). `/` = 101 kB First Load JS.
- Migrations/seeders: **N/A** (no database).

### Phase 3 - Service Deployment
- `npx next start -p 3100` in background. **Ready in 559ms.**
- Port verified serving via `curl` (see probes below).

### Phase 5 - Teardown
- Background task stopped; the `npx`-spawned node child (PID 42764) survived the
  wrapper stop and was force-killed by PID. Port 3100 confirmed released
  (`netstat` no listener, `curl` connection refused).

---

## 2. Test Results

### Automated suites
**None exist.** `package.json` has no `test` script and no test framework
(jest/vitest/playwright) is installed. Nothing to run. (See recommendation R3.)

### Manual HTTP probes (`curl` against `http://localhost:3100`)

| Request | Result |
|---------|--------|
| `GET /` | **200**, 80,929 bytes, 0.120s |
| `GET /robots.txt` | **200** `text/plain` - valid, references sitemap |
| `GET /sitemap.xml` | **200** `application/xml` - valid urlset, 1 entry |
| `GET /nonexistent-page` | **404** `text/html` - correct not-found handling |
| `GET /_next/image?url=/assets/logo.jpeg&w=64&q=75` | **200** `image/jpeg` - optimizer live |

### Content verification (rendered HTML)
- `<title>` = "ICON Services | Turnkey Construction & Architectural Design Pakistan" ✓
- Sections present: Hero, About, Services, Projects (32 refs), Contact ✓
- Project images render with `loading="lazy"` + responsive `srcSet` ✓ (Phase 4 perf work confirmed live)
- **JSON-LD** present: `"@type":"GeneralContractor"` + nested `"PostalAddress"` ✓

### Security headers (present on every response)
`Content-Security-Policy`, `Strict-Transport-Security` (2y, preload),
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`. ✓

### Contact form
Client-side `POST` to `https://formspree.io/f/xykojjow`. **Not live-submitted** -
doing so would send a real email to the owner's inbox. Endpoint wiring verified
by code + CSP (`form-action`/`connect-src` allow formspree.io). Manual live
submit deferred to the owner.

### Backend/API/auth probing
**N/A** - no API endpoints, no auth, no sessions/tokens to probe.

---

## 3. Errors & Bottlenecks

| # | Issue | Severity | Resolution |
|---|-------|----------|------------|
| E1 | Server log warning: `sharp` not installed - Next falls back to a slower built-in image optimizer in production | Low | `npm i sharp`, OR eliminate by going static-export (see R2). Not fixed in-run (a deploy-config decision). |
| E2 | Background server child (PID 42764) outlived the task-stop wrapper | Trivial (test-harness only) | Force-killed by PID; port released. |

**No** build failures, missing dependencies, stack traces, or silent runtime
errors were encountered. Server booted clean in 559ms.

---

## 4. DevOps Recommendations

- **R1 - Add CI.** No pipeline exists. A minimal GitHub Actions workflow
  (`.github/workflows/ci.yml`: `npm ci` -> `npm run lint` -> `npm run build`) on
  push/PR would catch build/type regressions. Highest-value addition.
- **R2 - Prefer static export over a Node server.** All content and images are
  static. `output: 'export'` + `images: { unoptimized: true }` produces plain
  files: no Node runtime, no `sharp`, no `/_next/image` endpoint (removes the
  only server-side attack surface - see `AUDIT.md` M1), and trivial hosting
  (any static host / cPanel `public_html`). Pre-optimize the hero/map PNGs once.
- **R3 - Smoke test (optional, YAGNI-bounded).** If CI is added, a single
  Playwright check (`/` returns 200 and contains "ICON Services" + the section
  headings) is enough for a static marketing site. A full unit suite is not
  warranted.
- **R4 - Dockerfile only if containerizing.** Not needed for static export. If a
  container is required, a two-stage build ending in an `nginx:alpine` serving
  the exported `out/` is smaller and safer than a Node image.
- **R5 - Keep `next` patched.** Currently `14.2.35` (patched). Watch for the next
  14.2.x security releases; a 15.x upgrade is optional and breaking - defer.

---

## Verdict
**Deployment: PASS.** Clean clone builds and serves correctly with no errors;
all routes, SEO artifacts, security headers, and rendered content verified. The
only warning (`sharp`) is best resolved by moving to static export, which also
simplifies deployment and shrinks the attack surface.
