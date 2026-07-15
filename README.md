# ICONA - ICON Services Website

Standalone Next.js 14 (App Router) marketing site for ICON Services, extracted
from the ICON CRM. Fully presentational: no database, auth, or CRM coupling.

## Stack
- Next.js 14.2 (App Router) + React 18
- Tailwind CSS 3.4 + `tailwindcss-animate`
- `lucide-react` icons
- Contact form -> Formspree (client-side, id in `src/config.js`)
- Fonts: Montserrat / Roboto / Inter (next/font)

## Structure
```
src/app/layout.tsx      root layout: fonts + globals.css + website.css
src/app/page.tsx        the single landing page (all sections)
src/app/globals.css     Tailwind base + CSS variables
src/app/website.css     website-specific styling
src/config.js           SITE_CONFIG: all content/data (company, projects, etc.)
src/components/website/  11 section components
public/assets/          images (hero, map, logos, project photos)
```

## Content
Everything editable lives in `src/config.js` (company info, services,
projects, partners, testimonials, contact, Formspree id, socials).

## Build note (IMPORTANT)
This folder is inside Google Drive (`G:\M`). Do NOT run `npm install` here:
Drive will churn syncing `node_modules`. Install/build on a local disk (e.g.
copy to a C: path, `npm install && npm run build`) and deploy the output.
`node_modules` and `.next` are gitignored.

## 5-phase plan
1. **Scaffold + migrate** (done) - standalone project, moved website + assets.
2. Content accuracy - verify copy, project->image mapping, socials, Formspree.
3. SEO + polish - sitemap, robots, LocalBusiness JSON-LD, a11y, responsive.
4. Performance + hardening - next/image, Lighthouse, analytics.
5. Deploy - build off-Drive, ship to host, iconservices.pk.
