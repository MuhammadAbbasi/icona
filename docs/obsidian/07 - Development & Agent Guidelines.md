---
title: Development & Agent Guidelines
type: guidelines
tags:
  - guidelines
  - rules
  - agents
  - workflow
  - git
created: 2026-07-22
---

# 🛡️ Development & Agent Guidelines

Return to [[00 - Index MOC]]

This document outlines mandatory guidelines for human developers and AI coding agents working in the ICONA repository.

---

## 🚫 Mandatory Project Rules

### 1. No Em Dashes
- Never use em dashes (`—`) anywhere in code, comments, documentation, or UI copy.
- Always use standard hyphens (`-`) or commas.

### 2. Git & Commit Guidelines
- **No Co Author Trailers**: Never add `Co-Authored-By` or co author trailers in commit messages.
- **No Conventional Commit Tags**: Do not use `feat:`, `fix:`, `chore:`, or similar prefix tags in commit messages. Write clear, plain descriptive sentences.
- **No Secrets**: Never commit or push credentials, tokens, or secured information.

### 3. Brand & Styling Enforcement
- Always use semantic color utilities: `bg-primary` (Royal Blue), `text-primary-dark` (Deep Navy), `bg-highlight` (Sky Cyan), `border-border`, `bg-card`, `bg-background`.
- Never hardcode literal Tailwind colors (`orange-500`, `indigo-600`, `rose-400`) for brand identity elements.

### 4. Content Architecture
- Edit `src/config.js` only for copy, module descriptions, pricing plans, contact information, and social links.
- Components must remain presentational readers of `SITE_CONFIG`.

### 5. React Server Components Rule
- Keep `'use client'` only on components with real interactivity (`Navbar.jsx` and `Contact.jsx`).
- Leave all other components as Server Components for maximum performance and SEO.

---

## 💻 Command Reference

| Action | Command | Details |
|---|---|---|
| **Development Server** | `npm run dev` | Launches Next.js dev server at `http://localhost:3000` |
| **Production Build** | `npm run build` | Compiles App Router pages and validates TypeScript |
| **Start Production** | `npm run start` | Serves compiled `.next` build |
| **Linting** | `npm run lint` | Runs Next.js ESLint verification |

---

## 🚀 Deployment Workflow

- **Platform**: Vercel (automatic Next.js detection, header routing, and image optimization).
- **Deployment Rule**: Always import as a **new, separate project** on Vercel. Never overwrite or touch existing separate CRM projects.

---

## 🔗 Related Notes

- Map Hub: [[00 - Index MOC]]
- System Architecture: [[02 - System Architecture & Tech Stack]]
- Brand System: [[03 - Brand & Design System]]
- Directory Map: [[04 - Directory & Codebase Map]]
