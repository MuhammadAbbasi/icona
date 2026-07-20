# ICONA - Claude Code notes

This file is auto-loaded for every Claude Code session in this repo.

## Brand & Design System

**Read and follow `AGENTS.md`'s "Brand & Design System" section for ANY CSS,
Tailwind config, or component styling work** (website, portal, or Android
app). It is mandatory, not a suggestion: use the semantic tokens already
wired in `globals.css`/`tailwind.config.ts` (`primary`, `primary-dark`,
`highlight`, `success`, `warning`, `destructive`, `background`, `card`,
`foreground`, `muted-foreground`, `border`) - never hardcode a literal
Tailwind color (`orange-500`, `indigo-600`, etc.) for anything that
represents brand identity. `AGENTS.md` is the canonical, cross-agent copy of
the full spec (exact hex values, roles, gradient/shadow rules); this file
just points there so it isn't duplicated and cannot drift out of sync.

See `AGENTS.md` in full for the rest of this repo's architecture and conventions.
