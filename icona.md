# ICONA

## What ICONA is
ICONA is a **software house that sells ERP + CRM software to small and medium
construction companies**. The product gives a construction firm one connected
system to run estimating, projects, the site, finances, and clients, on web and
mobile, instead of a pile of spreadsheets.

## What this project (this folder) is
This folder is the **ICONA marketing website**: a standalone Next.js 14 site that
presents the product and turns visitors into demos and sign-ups. It is the front
door, not the product itself. The actual ERP/CRM application lives in a separate
codebase; this site links into it (the navbar "Client login" points at the app).

It is a fully presentational site: no database, auth, or backend of its own.

## What the site shows
- **Hero** - the pitch, signup + demo CTAs, a CSS dashboard mock, product stats.
- **Modules** - the 7 product areas, drawn from the real ERP:
  BOQ & Estimation, Project Control, Finance & Ledger, Subcontractors,
  Labour & Attendance, Investors & Lenders (ERP), and Clients & Leads (CRM).
- **Product** - "screenshots": CSS mocks of BOQ rollups, budget-vs-actual,
  and site attendance (no real screenshots exist yet).
- **Mobile** - the field app for on-site attendance, site visits, and BOQ access.
- **How it works** - sign up, run the site, control the money, decide.
- **Pricing** - Starter $25 / Growth $50 / Enterprise $75 per month, each with
  hard plan limits (projects/members; upgrade prompted when a limit is hit).
  Monthly/annual toggle: annual = pay 10 months, get 12 (2 months free).
  USD prices; PKR billing offered via contact. Target market: Pakistan SMEs.
- **Testimonials**, **Guides** (first-week walkthroughs), **FAQ**,
  **Contact/Book a demo** (Formspree, dark CTA band), **Footer**.

## Tech
Next.js 14 (App Router), React 18, Tailwind CSS, lucide-react.
Fonts: Inter (body) + Space Grotesk (display). All editable content lives in
`src/config.js` (`SITE_CONFIG`; `resolveCta()` maps 'signup'/'login' into the
ERP app URL). Section components are in `src/components/website/`; `Reveal.jsx`
does IntersectionObserver scroll reveals (no-JS safe). Deploys to Vercel.

## Related files
- `README.md` - developer overview (structure, build, deploy).
- `AGENTS.md` - guidance for AI agents working in this repo.
- `todo.md` - placeholders needing real data (domain, app URL, socials, etc.).
