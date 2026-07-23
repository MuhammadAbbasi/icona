---
title: Brand & Design System
type: design-system
tags:
  - brand
  - design
  - css
  - tailwind
  - colors
created: 2026-07-22
---

# 🎨 Brand & Design System

Return to [[00 - Index MOC]]

ICONA's visual identity represents stability, modern tech, and trust within the construction sector. It relies on a monochromatic scale of professional blues paired with clean slate neutrals.

---

## 🎨 Core Brand Color Tokens (The Blues)

| Name | Hex Code | Semantic Token | Role & Usage |
|---|---|---|---|
| **Deep Navy** | `#1A365D` | `primary-dark` | Typography wordmarks, headers, heavy structural elements |
| **Royal Blue** | `#2563EB` | `primary` | Core brand color: primary CTA buttons, active state highlights |
| **Sky Cyan** | `#38BDF8` | `highlight` | Hover states, progress bars, interactive toggles, badge accents |

---

## 🌫️ Neutral Palette (Backgrounds & Text)

| Name | Hex Code | Semantic Token | Role & Usage |
|---|---|---|---|
| **App Background** | `#F8FAFC` | `background` | Very light slate gray to eliminate eye strain |
| **Surface / Cards** | `#FFFFFF` | `card` | Pure white containers popping off background |
| **Primary Text** | `#0F172A` | `foreground` | Headings and primary body copy |
| **Secondary Text** | `#64748B` | `muted-foreground` | Subtitles, metadata, form placeholders |
| **Borders & Lines** | `#E2E8F0` | `border` | Subtle card borders and list separators |

---

## 🚦 Functional Feedback Colors

| State | Hex Code | Semantic Token | Role & Usage |
|---|---|---|---|
| **Success** | `#10B981` | `success` | Completed milestones, green badges, paid invoices |
| **Warning** | `#F59E0B` | `warning` | Overdue tasks, pending approvals, budget alerts |
| **Danger** | `#EF4444` | `destructive` | Critical alerts, deleted items, budget overruns |

---

## 📏 Mandatory Styling Rules

1. **Semantic Class Enforcements**:
   Always use Tailwind semantic token utility classes (`bg-primary`, `text-primary-dark`, `bg-highlight`, `border-border`). Never hardcode literal Tailwind colors (`indigo-600`, `orange-500`, `rose-400`) for brand identity elements.
2. **WCAG Accessibility & Contrast**:
   Ensure white text (`#FFFFFF`) is used over `primary` (Royal Blue) and `primary-dark` (Deep Navy) buttons for full WCAG AA/AAA compliance.
3. **Hero Gradients**:
   Hero backgrounds blend Deep Navy (`#1A365D`) into Royal Blue (`#2563EB`).
4. **Elevation & Shadows**:
   Use soft, cool blue tint shadows (`rgba(37, 99, 235, 0.1)`) instead of harsh black drop shadows.

---

## 🔗 Related Notes

- Map Hub: [[00 - Index MOC]]
- System Architecture: [[02 - System Architecture & Tech Stack]]
- Codebase Directory Map: [[04 - Directory & Codebase Map]]
- Developer Guidelines: [[07 - Development & Agent Guidelines]]
