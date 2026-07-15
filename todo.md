# ICONA - Pending / Needs Input

Placeholders in the new software-house site that need real data before launch.
All are marked `TODO` in `src/config.js`.

## Brand & domain
- [ ] **Domain** - `company.domain` is `https://icona.app` (placeholder). Set the
      real domain; it feeds metadata, canonical, sitemap, and robots.
- [ ] Logo - currently a text mark + `public/favicon.svg`. Replace with the real
      ICONA logo if there is one.
- [ ] **App URL** - `company.appUrl` is `https://app.icona.app` (placeholder).
      The navbar "Client login" links to `${appUrl}/login`. Set the real ERP URL.

## Auth / onboarding
- [x] Client login link added to the navbar (desktop + mobile) -> ERP `/login`.
- [ ] **Signup + guided onboarding wizard** (planned, "later"): a custom signup
      that provisions a company and walks the user through org details, projects,
      the Domain -> Task -> Subtask hierarchy, employees, finances, and
      admin/manager/employee data rights, as a guided tour + profile setup. This
      is a PRODUCT feature (provisions a tenant), so it belongs in the ERP behind
      the SaaS tenancy work (Wave 1), not the marketing site. The site will just
      link to it. See docs/saas-transformation-plan.md (billing-onboarding /
      config-platform).

## Pricing (placeholder tiers)
- [ ] `pricing[]` uses "Custom" prices and generic feature lists. Set real tiers
      and prices, or keep "Custom" + demo CTA intentionally.

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
