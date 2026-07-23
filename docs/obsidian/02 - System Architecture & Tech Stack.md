---
title: System Architecture & Tech Stack
type: architecture
tags:
  - architecture
  - stack
  - nextjs
  - react
  - tailwind
created: 2026-07-22
---

# ⚡ System Architecture & Tech Stack

Return to [[00 - Index MOC]]

## 🛠️ Technology Stack Breakdown

ICONA is built using a modern, lightweight, high performance web stack optimized for rapid loading and SEO excellence:

| Layer | Technology | Version / Specification | Purpose |
|---|---|---|---|
| **Framework** | Next.js (App Router) | `14.2.35` | React server components, static generation, file based routing |
| **UI Library** | React | `18.x` | Component UI state and rendering engine |
| **Styling** | Tailwind CSS | `3.4.x` | Utility first styling powered by semantic design tokens |
| **Icons** | Lucide React | `^0.359.0` | Crisp, accessible SVG icon set |
| **Typography** | `next/font` | Inter | Optimized Google Font loading without layout shifts |
| **Forms** | Formspree API | Client side HTTP | Serverless contact form handling |

---

## 📐 Application Architecture & Route Structure

The repository uses Next.js 14 **App Router Directory Groups** to segregate concerns:

```
src/
├── app/
│   ├── (admin)/                 # Admin Management Console
│   │   ├── admin/
│   │   │   ├── llm/             # AI Assistant & Prompt Configuration
│   │   │   └── page.tsx         # Admin Dashboard Overview
│   │   └── layout.tsx
│   ├── (auth)/                  # Authentication Views
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (dashboard)/             # ERP & CRM Client Portal
│   │   ├── dashboard/
│   │   │   ├── projects/        # BOQ & Milestone Management
│   │   │   ├── finance/         # Cash Flow & Ledger
│   │   │   ├── team/            # Subcontractors & Labour
│   │   │   └── settings/        # Account & Workspace Settings
│   │   └── layout.tsx
│   ├── globals.css              # Master CSS Tokens & Tailwind Base
│   ├── layout.tsx               # Root Site Layout & Metadata JSON-LD
│   ├── page.tsx                 # Public Landing Page Component
│   ├── robots.ts                # SEO Robots rules
│   └── sitemap.ts               # Dynamic Sitemap generator
├── components/                  # Modular Component Library
│   ├── admin/                   # Admin UI Widgets
│   ├── website/                 # Public Landing Page Sections
│   ├── kanban/                  # Drag and Drop Kanban Board
│   ├── projects/                # BOQ & Milestone Components
│   ├── finance/                 # Expense & Payout Controls
│   └── ui/                      # Base Atomic UI Components
├── config.js                    # Single Source of Truth for Content/Data
├── lib/                         # Helper functions & utilities
└── types/                       # TypeScript Interface Definitions
```

---

## ⚖️ Client vs. Server Component Rules

- **Default Server Components**: All landing page sections (`Hero`, `Modules`, `Pricing`, `Testimonials`, `MobileApp`, `Footer`) are React Server Components to maximize performance and SEO.
- **Client Components (`'use client'`)**: Kept strictly minimal. Used only where interactive client state or event handlers exist (e.g. `Navbar.jsx` for mobile drawer toggle, `Contact.jsx` for Formspree submit state).

---

## 🔗 Related Notes

- Map Hub: [[00 - Index MOC]]
- Design Tokens & Colors: [[03 - Brand & Design System]]
- Directory Code Map: [[04 - Directory & Codebase Map]]
- Developer Guidelines: [[07 - Development & Agent Guidelines]]
