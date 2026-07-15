# AGENTS.md - ICONA

Guidance for AI coding agents working in this repo. Read this before making changes.

## What this is
Marketing website for **ICONA**, a software house that sells **ERP + CRM to
small and medium construction companies**. The product it markets is the
construction ERP/CRM (BOQ, project control, finance, labour, subcontractors,
investors, mobile app). This repo is the **website only**: a Next.js 14 App
Router site, 100% presentational. **No backend, database, auth, API routes, env
vars, or Docker.** Do not add any of these unless explicitly asked.

## Stack
- Next.js 14.2.35 (App Router) + React 18 (stay on 14.2.x; a 15/16 jump is breaking)
- Tailwind CSS 3.4 using the semantic tokens in `globals.css` (orange `primary`, light/dark)
- `lucide-react` icons, `next/font` (Inter)
- Contact form posts client-side to Formspree (no server)

## Layout
```
src/app/layout.tsx       root layout: font, metadata, SoftwareApplication JSON-LD
src/app/page.tsx         single landing page (composes all sections)
src/app/sitemap.ts       sitemap (domain from SITE_CONFIG)
src/app/robots.ts        robots (domain from SITE_CONFIG)
src/app/globals.css      Tailwind base + CSS variable tokens
src/config.js            SITE_CONFIG: ALL content/data
src/components/website/   Navbar, Hero, Modules, MobileApp, HowItWorks,
                          Pricing, Testimonials, Contact, Footer (.jsx)
public/favicon.svg       logo mark
```

## Where to make changes
- **Content/data (copy, modules, pricing, testimonials, contact): edit `src/config.js` only.** Components are presentational readers of `SITE_CONFIG`; do not hardcode copy in components.
- Styling: Tailwind utilities with the `globals.css` semantic tokens (`bg-primary`, `text-muted-foreground`, `bg-card`, `border-border`, etc.). There is no separate site CSS file.
- Keep `'use client'` only on components with real interactivity. Currently only `Navbar.jsx` (mobile menu) and `Contact.jsx` (form) are client components; the rest are server components. Do not add the directive elsewhere.

## Build & run
`npm run dev`, `npm run build`, `npm run start`, `npm run lint`.
`node_modules` and `.next` are gitignored. If a build throws `EPERM` on
`.next` (local drive lock), delete `.next` and retry, or build on a C: path.

## Deploy
Vercel (auto-detects Next.js, keeps headers + image optimization). Import as a
**new, separate** project at vercel.com/new. Do NOT touch the separate ICON CRM
Vercel project.

## Conventions
- **No em dashes** anywhere (code, comments, UI copy). Use hyphens or commas.
- **Commits:** no `Co-Authored-By` / co-author trailers.
- Keep dependencies minimal; smallest change that works.

## Open items
- `todo.md` - placeholders needing real data (domain, pricing, testimonials, contact inbox, socials).
- `README.md` - project overview.
