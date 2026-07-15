# AGENTS.md - ICONA

Guidance for AI coding agents working in this repo. Read this before making changes.

## What this is
ICON Services marketing website. A **fully static Next.js 14 (App Router) site**,
extracted from the ICON CRM. It is 100% presentational: **no backend, no
database, no auth, no API routes, no env vars, no Docker**. Do not add any of
these unless explicitly asked.

## Stack
- Next.js 14.2.35 (App Router) + React 18 (stay on the 14.2.x line; a 15/16 jump is breaking and not wanted)
- Tailwind CSS 3.4 + `tailwindcss-animate`, plus `src/app/website.css`
- `lucide-react` icons, `next/font` (self-hosted Montserrat/Roboto/Inter)
- Contact form posts client-side to Formspree (no server)

## Layout
```
src/app/layout.tsx       root layout: fonts, metadata, LocalBusiness JSON-LD
src/app/page.tsx         the single landing page (composes all sections)
src/app/sitemap.ts       MetadataRoute sitemap
src/app/robots.ts        MetadataRoute robots
src/app/globals.css      Tailwind base + CSS variables
src/app/website.css      website-specific styling (large; most visual rules live here)
src/config.js            SITE_CONFIG: ALL content/data
src/components/website/   11 section components (.jsx)
public/assets/           images (hero, map, logos, project photos in extracted/)
next.config.mjs          security headers (CSP, HSTS, etc.)
```

## Where to make changes
- **Content/data (text, projects, partners, contact, socials): edit `src/config.js` only.** Components read from `SITE_CONFIG`; do not hardcode copy in components.
- Derived values (e.g. years of experience) come from one `ESTABLISHED_YEAR` constant in `config.js`. Keep them derived, do not hardcode a year that will drift.
- Styling: prefer Tailwind classes; site-wide rules are in `website.css`.
- Keep `'use client'` only on components with real interactivity (hooks/handlers). `Hero.jsx` is intentionally a server component, do not add `'use client'` to it.

## Build & run
Commands: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`.

**CRITICAL - this folder is inside Google Drive (`G:\M`).** Do NOT run
`npm install` or `npm run build` here; Google Drive thrashes syncing
`node_modules`. To build or test:
1. Copy the repo (or `git clone`) to a local disk (e.g. a `C:` temp dir).
2. Run `npm install && npm run build` there.
3. Deploy the build output; never commit `node_modules` or `.next`.

## Conventions
- **No em dashes** anywhere, in code, comments, or UI copy. Use hyphens or commas.
- **Commits:** do not add `Co-Authored-By` / co-author trailers.
- Keep dependencies minimal, do not add a library for what a few lines can do.
- Smallest change that works; this is a small site, keep it that way.

## Before you finish
- Verify a real `next build` off-Drive (see above) for any non-trivial change.
- The contact form posts to a live Formspree inbox, do not send test submissions.

## Open items / context
- `todo.md` - pending inputs (real social URLs, hosting) and audit follow-ups.
- `AUDIT.md` - security/architecture audit. Top recommendation: switch to
  `output: 'export'` + `images.unoptimized` for pure static hosting (removes the
  Node server and the `/_next/image` attack surface).
- `DEPLOY-TEST.md` - last deployment/E2E test report (build + serve verified).
- `README.md` - project overview and the 5-phase build history.
