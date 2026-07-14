# Veltol Project Cloud — Design System Guide

> Copy this file into any new project that should match the Veltol brand.

---

## Quick start — 2 files to copy

1. `src/app/globals.css` — dark flat canvas, utility classes, CSS variables
2. `src/app/layout.tsx` — 2 Google Font imports and CSS variable assignments

After that, every color, shadow, and font decision flows from those two files.

---

## Colour tokens

Paste into `:root` in `globals.css`. All component colors derive from these — never hardcode hex values in components.

```css
:root {
  /* Background tiers — clean blue ramp, hue 213° */
  --v-bg:      #0d1b2b;   /* page background */
  --v-card:    #122236;   /* card background */
  --v-popover: #182c43;   /* popover / dropdown / modal background */
  --v-surface: #1f3651;   /* secondary / muted surface, input fill, hover fill */
  --v-border:  #2b4769;   /* flat opaque hairline border */

  /* Brand hues */
  --v-primary:    #225ba0;  /* primary color */
  --v-primary-hi: #2e70c2;  /* hover/active state for primary */
  --v-bright:     #42adfa;  /* vivid azure highlight — CTAs, prominent accents */
  --v-accent:     #2bace3;  /* accent · ring · active state ("the signal") */
  --v-accent-hi:  #58c1ea;  /* hover on accent elements */
  --v-green:      #5fba6a;  /* success · residential segment */
  --v-orange:     #f5882a;  /* warning · CTA · "new" tags · industrial segment */
  --v-red:        #e0525f;  /* destructive — derived, brand has no red */

  /* Foreground scale — white ramp with a hint of navy hue */
  --v-fg:      #EDF0F7;   /* primary text */
  --v-fg-dim:  #9AA3C0;   /* secondary text / descriptions */
  --v-fg-mute: #616D93;   /* labels / placeholders / disabled */
}
```

### Tailwind color classes (from `globals.css` `@theme inline`)

| Class | Hex | Use |
|---|---|---|
| `text-veltol-accent` | #2bace3 | Active nav, accent text, icons, focus ring |
| `text-veltol-primary` | #2D458C | Primary interactive, featured surfaces |
| `text-veltol-green` | #5fba6a | Positive delta, success, live dot |
| `text-veltol-orange` | #f5882a | Warning state, CTA, "new" tags |
| `text-veltol-red` | #e0525f | Destructive, overdue |
| `text-veltol-fg` | #EDF0F7 | Primary foreground |
| `text-veltol-fgDim` | #9AA3C0 | Secondary text |
| `text-veltol-fgMute` | #616D93 | Muted labels, placeholders |
| `bg-veltol-bg` | #0e1429 | Page background |
| `bg-veltol-card` | #141b34 | Card background |
| `bg-veltol-surface` | #212c4c | Secondary surface |

---

## No gradients, no blur, no glow

There is no aurora background, no gradient spine, and no glow shadow in this system. Where the brand itself renders a dark surface (roll-ups, social templates), it uses a **flat solid color block** — `#2D458C` or `#0e1429` — never a gradient, blur, or glow. This app follows the same rule:

- Featured surfaces (the primary KPI card, the V-mark, avatar fallbacks) use a **flat `bg-veltol-primary` fill**. No gradient.
- Floating surfaces (sidebar, topbar, dropdowns, modals) are **flat `bg-card` / `bg-popover` with a solid `border-border`**. No `backdrop-blur`.
- Elevation, where genuinely needed, uses a plain, restrained shadow — never a colored glow.

If a decorative device is wanted later, the brand's actual visual signature is a thin **circuit-trace motif** (fine lines connecting small circular nodes) — used sparingly on hero/marketing surfaces, not stamped on every card.

---

## Typography

### Font roles

| Role | Family | Variable | Use |
|---|---|---|---|
| Sans | Exo 2 | `font-sans` | Everything: headings, KPI values, body, nav, buttons, table cells. Weight 600 for titles/values, 400–500 for body. |
| Mono | JetBrains Mono | `font-mono` | Tabular numeric values and literal codes/IDs only — not general labels. |

### Google Fonts import (in `layout.tsx`)

```tsx
import { Exo_2, JetBrains_Mono } from 'next/font/google';

const exo2 = Exo_2({ weight: 'variable', subsets: ['latin'], variable: '--font-exo2' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });
```

### Type scale in practice

```
Page title:      font-sans text-3xl font-semibold tracking-tight (Exo 2, 600)
Section title:   font-sans text-xl font-semibold
Card title:      font-sans text-base font-semibold
Topbar title:    font-sans text-[15px] font-semibold tracking-tight
Body:            text-sm text-muted-foreground (Exo 2, 400)
Eyebrow / label: font-sans text-xs font-medium text-muted-foreground (normal case, minimal tracking)
Badge:           font-sans text-[11px] font-medium (normal case — no mono, no uppercase)
Table number:    font-mono tabular-nums
Literal code/ID: font-mono
```

Mono is for data, not labels. The previous system forced uppercase-tracked monospace onto nearly every label, badge, and header — that is the single most recognizable "generated dashboard template" signature, and it has been deliberately removed. Mono now appears only where digit alignment or a literal code/identifier is involved.

---

## Utility classes (defined in `globals.css`)

### `.mono-label`
Reserved for codes/IDs/tabular labels only — not a general-purpose label style.
```css
font-family: var(--font-mono);
text-transform: uppercase;
letter-spacing: 0.08em;
```

### `.v-live-dot`
Pulsing status indicator — a small point-source "LED" signal, the one legitimate glow exception (it is not a page-wide decorative device).
```css
width: 6px; height: 6px; border-radius: 50%;
background: var(--v-green);
box-shadow: 0 0 6px var(--v-green);
animation: pulse-dot 2s ease-in-out infinite;
```

---

## Page background

Flat, no gradient, no glow field.

```css
.dark body {
  background-color: var(--v-bg);
}
```

---

## Component patterns

### KPI card — featured (flat brand fill)

```tsx
<div className="relative overflow-hidden rounded-xl p-5 bg-veltol-primary text-white">
  <span className="text-xs font-medium text-white/70">LABEL</span>
  <div className="mt-3 flex items-baseline gap-1.5">
    <span className="font-sans text-[30px] font-semibold leading-none tracking-tight">4 200 000</span>
    <span className="text-[11px] text-white/75">EUR</span>
  </div>
  <span className="mt-3 block text-[11px] tracking-wide text-white">Delta text</span>
</div>
```

### KPI card — plain (flat card)

```tsx
<div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
  <span className="text-xs font-medium text-muted-foreground">LABEL</span>
  <div className="mt-3 flex items-baseline gap-1.5">
    <span className="font-sans text-[30px] font-semibold leading-none tracking-tight">22.40</span>
    <span className="text-[11px] text-muted-foreground">MWp</span>
  </div>
  <span className="mt-3 block text-[11px] tracking-wide text-veltol-green">Positive delta</span>
</div>
```

### Page header (standard pattern)

```tsx
<div>
  <div className="text-xs font-medium text-muted-foreground">
    MODULE · SECTION NAME
  </div>
  <h1 className="mt-1 font-sans text-3xl font-semibold tracking-tight">
    Page title here
  </h1>
  <p className="mt-1 text-sm text-muted-foreground">
    Supporting description text
  </p>
</div>
```

### Sidebar nav item — active state

```tsx
<Link className="flex items-center gap-2.5 rounded-md border border-veltol-accent/25 bg-veltol-accent/10 px-3 py-2 text-[13px] font-semibold text-veltol-accent">
  <Icon className="h-4 w-4 text-veltol-accent" />
  Nav item label
</Link>
```

### Sidebar nav item — inactive state

```tsx
<Link className="flex items-center gap-2.5 rounded-md border border-transparent px-3 py-2 text-[13px] text-foreground/80 hover:bg-secondary/50 hover:text-foreground">
  <Icon className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground" />
  Nav item label
</Link>
```

### Card (general content card)

```tsx
<Card className="border-border bg-card" />
```

No `.v-panel`, no backdrop blur — a card is a flat surface with a solid border.

### Status badges

```tsx
<Badge variant="info">Tervezés</Badge>        {/* primary blue — contracted, design, testing, handover */}
<Badge variant="warning">Engedélyezés</Badge>  {/* orange — permitting, procurement */}
<Badge variant="default">Kivitelezés</Badge>   {/* accent blue — construction */}
<Badge variant="success">Garancia</Badge>      {/* green — warranty */}
<Badge variant="secondary">Lezárt</Badge>      {/* muted — closed */}
<Badge variant="destructive">Törölt</Badge>    {/* red — cancelled */}
<Badge variant="outline">Ajánlat</Badge>       {/* subtle — offer */}
```

### Live pill

```tsx
<div className="inline-flex items-center gap-1.5 rounded-full border border-veltol-green/20 bg-veltol-green/8 px-2.5 py-1">
  <div className="v-live-dot" />
  <span className="text-[10px] font-medium text-veltol-green">Live</span>
</div>
```

---

## Surface hierarchy

From darkest (back) to brightest (front):

```
#0e1429  bg       — page background
#141b34  card     — card background (--card in shadcn)
#1a2340  popover  — popover, dropdown background
#212c4c  surface  — secondary, muted, sidebar switcher
```

No `backdrop-filter` anywhere. Surfaces separate from the background using a flat fill plus a solid `border-border` — not blur.

---

## Layout shell

```
h-screen flex overflow-hidden
├── aside  w-64  bg-card border-r border-border
│   ├── brand lockup (h-[62px])
│   ├── project switcher
│   ├── nav (flex-1 overflow-y-auto)
│   └── user footer
└── div flex-1 flex-col overflow-hidden
    ├── header h-[62px] bg-card border-b border-border
    └── main flex-1 overflow-y-auto bg-background p-4 md:p-8
```

---

## Design rules to follow

- **Dark mode only.** There is no light mode branch — `<html class="dark">` is permanent. All design decisions are made for this single flat dark theme.
- **No gradients, period.** There is no aurora background and no gradient spine. The page background, cards, and shell are flat colors. Gradients are not used anywhere, functional or decorative.
- **No backdrop blur.** Sidebar, topbar, dropdowns, and modals are flat `bg-card`/`bg-popover` with a solid border. There is no glow field to sit above, so blur has no visual justification.
- **Accent blue is the active signal.** Border, text, background tint — when something is active/selected/focused, it turns `--veltol-accent` (#2bace3). Green (#5fba6a) is only for success/live/positive; orange (#f5882a) is for warnings and CTA/"new" tags.
- **Mono is for data, not labels.** `font-mono tabular-nums` on numeric table/KPI values and literal codes/IDs only. Eyebrows, section labels, KPI labels, nav groups, and badges use the sans face (Exo 2) at normal case, light or no letter-tracking.
- **Tabular numbers for all data.** Any numeric value in a table or card uses `font-mono tabular-nums` so columns align.
- **Logo assets.** Real brand SVG logo files (full-color + white) live in `public/branding/` once supplied — see `sidebar.tsx` for the current interim flat placeholder mark.
