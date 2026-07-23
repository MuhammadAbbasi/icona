---
title: Directory & Codebase Map
type: codebase-map
tags:
  - codebase
  - files
  - directories
  - nextjs
created: 2026-07-22
---

# 📂 Directory & Codebase Map

Return to [[00 - Index MOC]]

This document maps every major file and directory within the **ICONA** workspace.

---

## 📁 Root Directory Layout

| File / Folder | Purpose & Responsibility |
|---|---|
| `AGENTS.md` | Primary instruction manual and rules for AI agents working in the repository |
| `CLAUDE.md` | Quick reference pointer to AGENTS.md |
| `README.md` | General overview of the project |
| `todo.md` | Action items, copy updates, placeholders, and tracking tasks |
| `package.json` | Dependency manifest (`next 14.2.35`, `react 18`, `lucide-react`, `tailwindcss 3.4`) |
| `tailwind.config.ts` | Tailwind CSS configuration mapping brand variable tokens |
| `next.config.mjs` | Next.js build and image optimization settings |
| `tsconfig.json` | TypeScript compiler configuration |

---

## 📁 `docs/` Architecture Documentation

| File | Content Summary |
|---|---|
| `project_concept.md` | Comprehensive market capture strategy, pricing model, and product vision |
| `telegram_integration.md` | Technical specs for Telegram Bot reporting, site updates, and commands |
| `integrations_prompt.md` | Prompt engineering templates for ERP/CRM integrations |
| `agent_definition.md` | System prompts and operational workflows for AI site assistants |
| `admin_layout.md` | Layout specs for the Admin Console and LLM dashboard |
| `calendar_layout.md` | UI/UX specification for the project Gantt and calendar view |
| `investor_pitch_deck_prompt.md` | Pitch deck copy, market statistics, and investment narrative |

---

## 📁 `src/` Application Core

```
src/
├── app/
│   ├── (admin)/               # Management routes
│   │   └── admin/llm/         # AI Assistant configuration interface
│   ├── (auth)/                # Authentication routes (login, register, reset)
│   ├── (dashboard)/           # Client ERP portal (projects, BOQ, finance, team)
│   ├── globals.css            # Tailwind directives and CSS color tokens
│   ├── layout.tsx             # Root document wrapper, Inter font, JSON-LD
│   ├── page.tsx               # Primary landing page router
│   ├── robots.ts              # Search engine index permissions
│   └── sitemap.ts             # XML Sitemap generator using SITE_CONFIG
├── components/
│   ├── website/               # Presentational landing page components
│   │   ├── Navbar.jsx         # Header navigation bar with mobile menu
│   │   ├── Hero.jsx           # High impact header gradient and CTAs
│   │   ├── Modules.jsx        # Grid showcasing ERP/CRM capabilities
│   │   ├── MobileApp.jsx      # Android companion app section
│   │   ├── HowItWorks.jsx     # Step by step onboarding flow
│   │   ├── Pricing.jsx        # Tiered subscription pricing tables
│   │   ├── Testimonials.jsx   # Contractor social proof and quotes
│   │   ├── Contact.jsx        # Client side Formspree contact form
│   │   └── Footer.jsx         # Site footer and navigation links
│   ├── admin/                 # Admin console widgets
│   ├── dashboard/             # Customer portal widgets
│   ├── finance/               # Cash flow and expense tables
│   ├── kanban/                # Drag and drop site task board
│   ├── projects/              # BOQ and milestone lists
│   └── ui/                    # Base UI buttons, badges, inputs
└── config.js                  # Central data config (SITE_CONFIG)
```

---

## 🔑 `src/config.js` Data Architecture

`src/config.js` serves as the single source of truth for all copy, pricing plans, module descriptions, testimonials, and navigation links.

> [!IMPORTANT]
> **Component Rule**: Components are strictly presentational readers of `SITE_CONFIG`. Never hardcode copy inside `.jsx` or `.tsx` files; edit `src/config.js` instead.

---

## 🔗 Related Notes

- Map Hub: [[00 - Index MOC]]
- System Architecture: [[02 - System Architecture & Tech Stack]]
- Feature Modules: [[05 - Modules & Features Map]]
- Development Rules: [[07 - Development & Agent Guidelines]]
