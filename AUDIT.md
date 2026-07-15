# ICONA - Defensive Codebase Audit

Repository: `G:\M\icona` (ICON Services marketing website, extracted from the ICON CRM).
Scope: full-stack architecture + security review. Date: 2026-07-15.
Build state at audit: `next build` passes off-Drive on C:, all routes static-prerendered.

> Note: the target is the **ICONA website**, not the ICON CRM. It is a fully
> presentational static site, so several audit phases (backend controllers,
> database, ORM, server-side auth/sessions) have **no attack surface here** and
> are marked N/A with the reason.

---

## 1. Architectural Summary

| Layer | Implementation |
|-------|----------------|
| Framework | Next.js 14.2.35 (App Router), React 18 |
| Rendering | 100% static prerender (`○ Static` for all 6 routes); no runtime SSR/RSC |
| Structure | Single page `src/app/page.tsx` composing 11 section components in `src/components/website/` |
| Content/data | Centralized in `src/config.js` (`SITE_CONFIG`) - no CMS, no DB |
| Styling | Tailwind 3.4 + `src/app/website.css`; fonts via `next/font` (self-hosted) |
| Images | `next/image`, all assets local under `public/assets/` |
| Contact form | Client-side POST to Formspree (`Contact.jsx:16`) - no backend |
| SEO | `sitemap.ts`, `robots.ts`, canonical + OpenGraph/Twitter meta, LocalBusiness JSON-LD |
| Security headers | Full set in `next.config.mjs` (CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy) |
| Backend / DB / Auth | **None** - no API routes, no database, no server-side auth |

Boundaries: there is no frontend/backend split - this is a static frontend only.
No infrastructure config (Docker/CI) is present in-repo.

---

## 2. Critical Issues

**None outstanding.** The one critical was found and remediated during this pass:

- **[FIXED] CVE-2025-29927 - Next.js Middleware Authorization Bypass** (`GHSA-f82v-jwr5-mffw`).
  Present in the original `next@14.2.22`. Bumped to `next@14.2.35` (`package.json`),
  build re-verified. (Note: this site ships no middleware, so real-world exposure
  was already low, but the dependency is now patched regardless.)

No hardcoded secrets, API keys, or credentials in source (`grep` for
key/secret/token/password/AWS patterns: clean). No `.env` files tracked. No
`process.env` usage in client code, so no env-var leakage into the bundle.
No SQL/ORM (no SQLi surface). Formspree ID is a public form identifier by design.

---

## 3. Architecture & Performance (Medium)

### M1. next/image optimizer is the only live server-side attack surface
File: `next.config.mjs`, deploy architecture.
The residual `npm audit` advisories that remain on `next@14.2.35` (DoS via
Server Components, request smuggling in rewrites, i18n/middleware bypass, WS
SSRF) are **N/A**: no middleware, no rewrites, no Pages Router, no i18n, no
WebSockets, and pages render statically. The **only** class with any relevance
is the Image Optimization API (`/_next/image`) DoS / unbounded cache growth,
which is live only if self-hosted on a Node server with the optimizer active.

**Recommendation (also simplifies hosting):** since every image is a local
static asset, make the site a pure static export and drop the Node runtime
entirely:
```js
// next.config.mjs
const nextConfig = {
  output: 'export',
  images: { unoptimized: true }, // required for export; assets are already sized
  // ...keep headers() only if the host applies them; static hosts set headers separately
};
```
This removes the entire `/_next/image` attack surface, eliminates the need for
Passenger/Node on cPanel, and lets the site deploy as plain files.
Trade-off: no on-the-fly image optimization - pre-optimize the ~5 large PNGs
(hero 695 KB, map 567 KB) to WebP/AVIF once at build time.

### M2. No React error boundary
Files: `src/app/` (no `error.tsx` / `global-error.tsx`).
A render error in any section blanks the whole page. Add a minimal
`src/app/error.tsx` (client component) with a fallback + reset. Low effort,
prevents a total white-screen.

### M3. CSP allows `'unsafe-eval'`
File: `next.config.mjs:10`.
`script-src` includes `'unsafe-eval'`. Next 14 inline bootstrap needs
`'unsafe-inline'`, but a static export generally does **not** need
`'unsafe-eval'`. After moving to `output: 'export'` (M1), drop `'unsafe-eval'`
from the CSP to tighten the script policy.

### M4. Contact form has no spam mitigation
File: `src/components/website/Contact.jsx`.
The Formspree POST has no honeypot or captcha. Add Formspree's `_gotcha` hidden
honeypot field (zero-dependency) to cut bot submissions.

---

## 4. Tech Debt & Dependencies (Low)

### Dependencies
- `next@14.2.35` - patched, current 14.2.x line. Staying on 14 is fine; a move
  to 15/16 would clear the residual (mostly-N/A) advisories but is breaking and
  not warranted for a static site. Defer.
- `postcss` (bundled under next, v8.4.31) - moderate advisory `GHSA-qx2v-qp2m-jg93`
  (XSS in CSS stringify). **Build-time only**, first-party CSS - no runtime
  exposure. Non-issue; clears whenever next bundles postcss >= 8.5.10.
- `react@18`, `lucide-react@0.400.0`, `tailwindcss@3.4` - minimal, no bloat, no
  duplicate libraries doing the same job. `lucide-react` is a few minor versions
  behind but not vulnerable; bump opportunistically.

### Code
- **D1. Dead newsletter form** - `src/components/website/Footer.jsx:83`:
  `onSubmit={(e) => e.preventDefault()}` - the form collects an email and does
  nothing. Either wire it (Formspree/mailing list) or remove the UI.
- **D2. JSON-LD injection hardening** - `src/app/layout.tsx:72`:
  `dangerouslySetInnerHTML` with `JSON.stringify(jsonLd)`. Data is trusted/static
  so this is safe today, but if any `SITE_CONFIG` string ever contains `</script>`
  it breaks out of the tag. Defensive fix:
  ```js
  __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c')
  ```
- **D3. Malformed social URL** - `src/config.js` `contact.socials.linkedin`
  (`https://linkedin.com/iconserviceskhi`) is not a valid LinkedIn path. Tracked
  in `todo.md`; renders as a broken link in Footer + Contact.

---

## Verdict
Small, clean, low-surface static site. No live critical issues after the
`next` bump. The single highest-value action is **M1** (static export), which
removes the only remaining server-side attack surface and simplifies deployment
at the same time.
