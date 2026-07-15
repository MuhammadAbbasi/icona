# ICONA - Website

Marketing website for **ICONA**, a software house providing **ERP and CRM to
small and medium construction companies**. The product it markets is the
construction ERP/CRM (BOQ, project control, finance, labour, subcontractors,
investors, mobile app). Fully presentational site: no database, auth, or backend.

## Stack
- Next.js 14.2 (App Router) + React 18
- Tailwind CSS 3.4 (semantic tokens in `globals.css`; orange primary accent)
- `lucide-react` icons
- Contact form -> Formspree (client-side, id in `src/config.js`)
- Font: Inter (next/font)

## Structure
```
src/app/layout.tsx       root layout: font + globals.css + SoftwareApplication JSON-LD
src/app/page.tsx         the single landing page (composes all sections)
src/app/globals.css      Tailwind base + CSS variables (light/dark tokens)
src/app/sitemap.ts       sitemap (domain from config)
src/app/robots.ts        robots (domain from config)
src/config.js            SITE_CONFIG: ALL content/data
src/components/website/   section components (Navbar, Hero, Modules, MobileApp,
                          HowItWorks, Pricing, Testimonials, Contact, Footer)
public/favicon.svg       logo mark
```

## Content
Everything editable lives in `src/config.js` (company, modules, mobile, how-it-
works, pricing, testimonials, contact, Formspree id). Components are pure
presentational readers of `SITE_CONFIG`.

## Build & run
`npm run dev`, `npm run build`, `npm run start`, `npm run lint`.
`node_modules` and `.next` are gitignored. If the local drive throws `EPERM`
on `.next` during build, delete `.next` and retry, or build on a C: path.

## Deploy
Target: Vercel (auto-detects Next.js; keeps headers + image optimization).
Import the repo at vercel.com/new as a **new, separate** project.

## Pending
See `todo.md` (real domain, pricing, testimonials, contact inbox, socials).
