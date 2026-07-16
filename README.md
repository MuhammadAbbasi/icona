# ICONA - Website

Marketing website for **ICONA**, a software house providing **ERP and CRM to
small and medium construction companies**. The product it markets is the
construction ERP/CRM (BOQ, project control, finance, labour, subcontractors,
investors, mobile app). Fully presentational site: no database, auth, or backend.

## Stack
- Next.js 14.2 (App Router) + React 18
- Tailwind CSS 3.4 (semantic tokens in `globals.css`; orange primary, dark
  navy `ink` tokens for hero mock / contact band / footer)
- `lucide-react` icons
- Contact form -> Formspree (client-side, id in `src/config.js`)
- Fonts: Inter (body) + Space Grotesk (display), both via next/font

## Structure
```
src/app/layout.tsx       root layout: fonts + globals.css + SoftwareApplication JSON-LD
src/app/page.tsx         the single landing page (composes all sections)
src/app/globals.css      Tailwind base + CSS variables + reveal/hover utilities
src/app/sitemap.ts       sitemap (domain from config)
src/app/robots.ts        robots (domain from config)
src/config.js            SITE_CONFIG: ALL content/data + resolveCta/annualPrice helpers
src/components/website/   section components (Navbar, Hero, Modules, ProductPreview,
                          MobileApp, HowItWorks, Pricing, Testimonials, Guides,
                          Faq, Contact, Footer) + shared Reveal, SectionHeader
public/favicon.svg       logo mark
```

## Content
Everything editable lives in `src/config.js` (company, modules, product mocks'
captions, mobile, how-it-works, billing + pricing tiers with limits, guides,
FAQ, testimonials, contact, Formspree id). Components are pure presentational
readers of `SITE_CONFIG`. Pricing: monthly USD prices per tier; annual billing
= `12 - billing.annualMonthsFree` months (2 months free). CTA hrefs `'signup'`
and `'login'` resolve into the ERP app via `resolveCta()`.

## Build & run
`npm run dev`, `npm run build`, `npm run start`, `npm run lint`.
`node_modules` and `.next` are gitignored. If the local drive throws `EPERM`
on `.next` during build, delete `.next` and retry, or build on a C: path.

## Deploy
Target: Vercel (auto-detects Next.js; keeps headers + image optimization).
Import the repo at vercel.com/new as a **new, separate** project.

## Pending
See `todo.md` (real domain, pricing, testimonials, contact inbox, socials).
