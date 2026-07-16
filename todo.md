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

## Pricing
- [x] Tiers set: Starter $25 / Growth $50 / Enterprise $75 per month, with plan
      limits (5/25/unlimited projects; 3/15/unlimited members) and an annual
      toggle (2 months free = pay 10 months).
- [ ] Confirm the plan limits match what the ERP will actually enforce
      (upgrade-on-limit is a product feature; see the SaaS tenancy work).
- [ ] `company.signupPath` (`/signup`) - confirm once the ERP signup wizard
      ships; the site's "Start now" CTAs point at `${appUrl}/signup`.

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
