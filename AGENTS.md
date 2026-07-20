# AGENTS.md - ICONA

Guidance for AI coding agents working in this repo. Read this before making changes.

## What this is
Marketing website for **ICONA**, a software house that sells **ERP + CRM to
small and medium construction companies**. The product it markets is the
construction ERP/CRM (BOQ, project control, finance, labour, subcontractors,
investors, mobile app). This repo is the **website only**: a Next.js 14 App
Router site, 100% presentational. **No backend, database, auth, API routes, env
vars, or Docker.** Do not add any of these unless explicitly asked.

## Brand & Design System (mandatory for ANY styling work)

ICONA's brand represents stability, modern technology, and trust in the
construction sector: a monochromatic scale of professional blues paired with
clean neutrals. This applies to the website, the ERP/CRM portal, and the
Android app - any agent touching CSS, Tailwind config, or component styling
**must** follow it exactly, with no exceptions unless the user explicitly
overrides it for a specific change.

### Core brand colors (the blues)
| Name | Hex | Role |
|---|---|---|
| Deep Navy (Primary Dark) | `#1A365D` | Brand typography (e.g. "ICONA" wordmark), heavy structural elements, app headers, primary active states. Authority and structure. |
| Royal Blue (Primary Brand) | `#2563EB` | Core brand color: primary CTA buttons, active tab underlines, primary icons. Technology and action. |
| Sky Cyan (Accent/Highlight) | `#38BDF8` | Used sparingly: hover states, progress bars, interactive toggles, success indicators, secondary logo shapes. Innovation and energy. |

### Neutral palette (backgrounds & text)
| Name | Hex | Role |
|---|---|---|
| App Background | `#F8FAFC` | Very light slate gray - never pure white for the main app background (it reduces eye strain). |
| Surface/Cards | `#FFFFFF` | Pure white - Kanban cards, pricing tables, content containers pop off the background. |
| Primary Text | `#0F172A` | Almost black - headings and primary body text. |
| Secondary Text | `#64748B` | Muted gray - subtitles, placeholders, metadata. |
| Borders & Dividers | `#E2E8F0` | Light gray - subtle separation of Kanban columns or list items. |

### Functional colors (feedback)
| Name | Hex |
|---|---|
| Success (completed tasks) | `#10B981` (Emerald Green) |
| Warning (overdue/pending) | `#F59E0B` (Amber) |
| Danger (delete/errors) | `#EF4444` (Red) |

### Implementation rules
- All of the above are already wired as CSS variable tokens in
  `src/app/globals.css` + `tailwind.config.ts`: `primary` (Royal Blue),
  `primary-dark` (Deep Navy), `highlight` (Sky Cyan), `success`, `warning`,
  `destructive` (= Danger, exact match), `background`, `card`, `foreground`,
  `muted-foreground`, `border`. **Use these semantic classes
  (`bg-primary`, `text-primary-dark`, `bg-highlight`, `border-border`, ...) -
  never hardcode a literal Tailwind color (`orange-500`, `indigo-600`,
  `rose-400`, etc.) for anything that represents brand identity**: buttons,
  links, active states, focus rings, headline highlights, logo marks. This
  repo's real color bugs (orange in the onboarding wizard and dashboard tour,
  indigo/violet in the login/forgot-password/reset-password pages) all came
  from a component hardcoding a literal color instead of the token - do not
  reintroduce that pattern.
- **Contrast:** white text (`#FFFFFF`) inside `primary-dark` and `primary`
  buttons, for WCAG compliance.
- **Gradients:** hero sections / landing-page backgrounds blend Deep Navy
  (`#1A365D`) -> Royal Blue (`#2563EB`).
- **Shadows:** soft, cool-toned, a slight blue tint (e.g.
  `rgba(37, 99, 235, 0.1)`) instead of harsh black drop shadows.
- **Decorative exception:** color used to distinguish *categories of data*
  (e.g. a multi-step tour's per-topic icon colors, a chart's series colors)
  is not a brand-identity use and is not covered by this rule. Ask: "does
  this represent ICONA, or does it just tell two data rows apart?" Only the
  former must be on-brand.

(`CLAUDE.md` in this repo points here for Claude Code specifically; this
section is the canonical source any agent should follow.)

## Stack
- Next.js 14.2.35 (App Router) + React 18 (stay on 14.2.x; a 15/16 jump is breaking)
- Tailwind CSS 3.4 using the semantic tokens in `globals.css` (Royal Blue `primary`, light/dark)
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
