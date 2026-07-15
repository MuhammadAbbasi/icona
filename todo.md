# ICONA - Pending / Needs Input

Items that need real data or an external action before they can be finished.

## Social links (config.js -> contact.socials)
Current values are placeholders / malformed. Replace with the real URLs:
- [ ] **LinkedIn** - `https://linkedin.com/iconserviceskhi` is invalid. LinkedIn
      needs `/company/<slug>` or `/in/<slug>`. Provide the real company page URL.
- [ ] **Instagram** - confirm `https://instagram.com/iconserviceskhi` is the real handle.
- [ ] **Facebook** - confirm `https://facebook.com/iconserviceskhi` is the real handle.

## Git remote / push
- [ ] Create GitHub repo (suggested `MuhammadAbbasi/ICONA-Website`) and push:
      `git remote add origin <url> && git branch -M main && git push -u origin main`
      (No `gh` CLI available in the agent environment.)

## Deploy (Phase 5)
- [ ] `node_modules` must NOT be installed inside `G:\M` (Google Drive). Install
      and build on a local disk (C:), deploy the build output only.
- [ ] Confirm hosting target + domain (`iconservices.pk`).

## Audit follow-ups (see AUDIT.md)
- [ ] **M1 (recommended):** switch to `output: 'export'` + `images.unoptimized`
      so the site deploys as static files (no Node/Passenger) and the
      `/_next/image` attack surface disappears. Pre-optimize hero/map PNGs first.
- [ ] M2: add `src/app/error.tsx` error boundary.
- [ ] M3: drop `'unsafe-eval'` from CSP after moving to static export.
- [ ] M4: add Formspree `_gotcha` honeypot to the contact form.
- [ ] D1: wire or remove the non-functional newsletter form (Footer.jsx:83).

## Content to confirm
- [ ] Contact email `muhammadabbasi.llm@gmail.com` - is this the public-facing
      address the site should show, or a different business inbox?
- [ ] Formspree id `xykojjow` - confirm it points at the correct inbox.
