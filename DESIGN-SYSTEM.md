# Veltol Project Cloud — Design System Guide

> Copy this file into any new project that should match the Veltol brand.
> Visual reference: https://claude.ai/code/artifact/277a2219-9a91-45ea-b543-bfc03333e681

---

## Quick start — 3 files to copy

1. `tailwind.config.ts` — all brand tokens as Tailwind classes
2. `src/app/globals.css` — dark-mode aurora canvas, utility classes, CSS variables
3. `src/app/layout.tsx` — 4 Google Font imports and CSS variable assignments

After that, every color, shadow, and font decision flows from those three files.

---

## Colour tokens

Paste into `:root` in `globals.css`. All component colors derive from these — never hardcode hex values in components.

```css
:root {
  /* Foundations — dark field */
  --void:    #020B12;   /* base background */
  --deep:    #041620;   /* card background */
  --bg:      #061F2C;   /* popover background */
  --surface: #0A2C3C;   /* secondary / muted */
  --navy:    #0B1E3E;   /* gradient start */

  /* Brand spectrum — teal gradient spine */
  --bluedp:  #163D64;   /* gradient 25% stop */
  --blue:    #1A5F88;   /* gradient 45% stop */
  --teal:    #1E8FA2;   /* primary color */
  --aqua:    #2BC4C8;   /* accent · ring · active state */
  --aqua-hi: #4DD9DB;   /* hover on aqua elements */

  /* Semantic / status */
  --magenta: #C042FF;   /* aurora plasma node only */
  --green:   #2FE8A6;   /* success · live dot */
  --amber:   #FFC043;   /* warning */
  --red:     #FF6B7A;   /* destructive */

  /* Foreground scale */
  --fg:      #E8F5F6;   /* primary text */
  --fg-dim:  #8FB5BC;   /* secondary text / descriptions */
  --fg-mute: #4A6872;   /* labels / eyebrows / placeholders */
}
```

### Tailwind color classes (from `tailwind.config.ts`)

| Class | Hex | Use |
|---|---|---|
| `text-veltol-aqua` | #2BC4C8 | Active nav, accent text, icons |
| `text-veltol-teal` | #1E8FA2 | Primary interactive |
| `text-veltol-green` | #2FE8A6 | Positive delta, success, live dot |
| `text-veltol-amber` | #FFC043 | Warning state |
| `text-veltol-red` | #FF6B7A | Destructive, overdue |
| `text-veltol-fg` | #E8F5F6 | Primary foreground |
| `text-veltol-fgDim` | #8FB5BC | Secondary text |
| `text-veltol-fgMute` | #4A6872 | Mono labels, eyebrows |
| `bg-veltol-void` | #020B12 | Page background |
| `bg-veltol-deep` | #041620 | Card background |
| `bg-veltol-surface` | #0A2C3C | Secondary surface |

---

## Gradients

### Named Tailwind gradient classes

```
bg-v-gradient        — 135° navy→aqua 5-stop spine. Featured KPI cards, V-mark, avatar.
bg-v-gradient-soft   — Same spine at 35–40% alpha. Hover overlays, tinted surfaces.
bg-v-gradient-line   — 90° #163D64→#2BC4C8. Hairline dividers, topbar/sidebar bottom line.
bg-v-gradient-aurora — 120° with magenta node at 45%. Login page hero background.
```

### Raw values (for inline styles when Tailwind class isn't available)

```
v-gradient:        linear-gradient(135deg, #0B1E3E 0%, #163D64 25%, #1A5F88 45%, #1E8FA2 70%, #2BC4C8 100%)
v-gradient-soft:   linear-gradient(135deg, rgba(11,30,62,0.4) 0%, rgba(22,61,100,0.35) 30%, rgba(30,143,162,0.35) 70%, rgba(43,196,200,0.35) 100%)
v-gradient-line:   linear-gradient(90deg, #163D64, #1E8FA2, #2BC4C8)
v-gradient-aurora: linear-gradient(120deg, #0B1E3E 0%, #163D64 20%, rgba(192,66,255,0.25) 45%, #1E8FA2 70%, #2BC4C8 100%)
```

---

## Typography

### Font roles

| Role | Family | Variable | Use |
|---|---|---|---|
| Brand | Audiowide | `font-brand` | Logo wordmark only — never for body copy |
| Display | Space Grotesk | `font-display` | Page titles, section heads, KPI values |
| Body | Inter | `font-sans` | Paragraphs, table cells, descriptions |
| Mono | JetBrains Mono | `font-mono` | Labels, eyebrows, codes, numbers, data |

### Google Fonts import (in `layout.tsx`)

```tsx
import { Audiowide, Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';

const audiowide = Audiowide({ weight: '400', subsets: ['latin'], variable: '--font-audiowide' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });
```

### Type scale in practice

```
Page title:      font-display text-3xl font-semibold tracking-tight (Space Grotesk 30px)
Section title:   font-display text-xl font-semibold (Space Grotesk 20px)
Card title:      font-display text-base font-semibold
Topbar title:    font-display text-[15px] font-semibold tracking-tight
Body:            text-sm text-muted-foreground (Inter 14px)
Eyebrow label:   font-mono text-[10px] uppercase tracking-[0.2em] text-veltol-fgMute
KPI label:       font-mono text-[10px] uppercase tracking-[0.16em]
KPI value:       font-display text-[30px] font-medium leading-none tracking-tight
Nav group label: font-mono text-[9px] uppercase tracking-[0.2em] text-veltol-fgMute
Nav item:        text-[13px]
Badge:           font-mono text-[10px] uppercase tracking-[0.08em]
Table number:    font-mono tabular-nums
```

---

## Shadows & glow

```
shadow-v-glow     — 0 8px 28px -6px rgba(30,143,162,0.5), inset 0 0 0 1px rgba(255,255,255,0.08)
                    Use on: featured cards, active elements
shadow-v-glow-lg  — 0 16px 40px -10px rgba(30,143,162,0.45)
                    Use on: featured KPI card (gradient variant)
shadow-v-aqua-sm  — 0 0 8px rgba(43,196,200,0.6)
                    Use on: live dot, active icon point-source glow
```

---

## Utility classes (defined in `globals.css`)

### `.mono-label`
Monospace engineering label — uppercase, tracked out.
```css
font-family: var(--font-mono);
text-transform: uppercase;
letter-spacing: 0.16em;
```
Usage: page eyebrows, section dividers, KPI card labels.

### `.v-panel`
Frosted glass card surface.
```css
background: rgba(10, 44, 60, 0.55);
backdrop-filter: blur(20px);
border: 1px solid rgba(90, 200, 210, 0.08);
```
Usage: main content cards, sidebar, topbar.

### `.v-hairline::before`
Top gradient accent line on cards — pseudo-element, no markup needed.
```css
position: absolute; top: 0; left: 16px; right: 16px; height: 1px;
background: linear-gradient(90deg, #163D64, #1E8FA2, #2BC4C8);
opacity: 0.4;
```

### `.v-text-gradient`
Gradient text treatment — used for `.io` suffix and accent headlines.
```css
background: linear-gradient(90deg, #163D64, #1E8FA2, #2BC4C8);
-webkit-background-clip: text;
background-clip: text;
-webkit-text-fill-color: transparent;
```

### `.v-live-dot`
Pulsing green status indicator.
```css
width: 6px; height: 6px; border-radius: 50%;
background: #2FE8A6;
box-shadow: 0 0 10px #2FE8A6;
animation: pulse-dot 2s ease-in-out infinite;
```

---

## Page background

The dark aurora canvas runs on `body` in dark mode — three radial glows that drift slowly. Copy from `globals.css`:

```css
.dark body {
  background-color: #020B12;
  background-image:
    radial-gradient(circle at 15% 12%, rgba(30, 143, 162, 0.12), transparent 45%),
    radial-gradient(circle at 85% 88%, rgba(43, 196, 200, 0.08), transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(192, 66, 255, 0.03), transparent 70%);
  background-attachment: fixed;
}
```

---

## Component patterns

### KPI card — featured (gradient)

```tsx
<div className="relative overflow-hidden rounded-xl p-5 bg-v-gradient shadow-v-glow-lg text-white">
  {/* Radial highlight */}
  <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 75% 20%, rgba(255,255,255,0.22), transparent 60%)' }} />
  <div className="relative">
    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/85">LABEL</span>
    <div className="mt-3 flex items-baseline gap-1.5">
      <span className="font-display text-[30px] font-medium leading-none tracking-tight">4 200 000</span>
      <span className="font-mono text-[11px] text-white/75">EUR</span>
    </div>
    <span className="mt-3 block font-mono text-[10px] tracking-wider text-white">Delta text</span>
  </div>
</div>
```

### KPI card — plain (glass)

```tsx
<div className="relative overflow-hidden rounded-xl p-5 border border-veltol-aqua/10 bg-card/60 backdrop-blur-xl">
  {/* Top hairline */}
  <div className="absolute left-4 right-4 top-0 h-px bg-gradient-to-r from-transparent via-veltol-aqua/40 to-transparent" />
  <div className="relative">
    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">LABEL</span>
    <div className="mt-3 flex items-baseline gap-1.5">
      <span className="font-display text-[30px] font-medium leading-none tracking-tight">22.40</span>
      <span className="font-mono text-[11px] text-muted-foreground">MWp</span>
    </div>
    <span className="mt-3 block font-mono text-[10px] tracking-wider text-veltol-green">Positive delta</span>
  </div>
</div>
```

### Page header (standard pattern)

```tsx
<div>
  <div className="mono-label text-[10px] text-veltol-fgMute">
    MODULE · SECTION NAME
  </div>
  <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
    Page title here
  </h1>
  <p className="mt-1 text-sm text-muted-foreground">
    Supporting description text
  </p>
</div>
```

### Sidebar nav item — active state

```tsx
<Link className="flex items-center gap-2.5 rounded-md border border-veltol-aqua/25 bg-veltol-aqua/10 px-3 py-2 text-[13px] font-semibold text-veltol-aqua">
  <Icon className="h-4 w-4 text-veltol-aqua" />
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

### Glass card (general content card)

```tsx
<div className="v-panel relative rounded-xl p-5">
  {/* optional: add v-hairline class for top accent line */}
</div>
```

Or with shadcn `Card`:
```tsx
<Card className="border-veltol-aqua/10 bg-card/60 backdrop-blur-xl" />
```

### Status badges

```tsx
// Use the variant prop on shadcn Badge — these map to Tailwind classes in badge.tsx
<Badge variant="info">Tervezés</Badge>        {/* teal — contracted, design, testing, handover */}
<Badge variant="warning">Engedélyezés</Badge>  {/* amber — permitting, procurement */}
<Badge variant="default">Kivitelezés</Badge>   {/* aqua — construction */}
<Badge variant="success">Garancia</Badge>      {/* green — warranty */}
<Badge variant="secondary">Lezárt</Badge>      {/* muted — closed */}
<Badge variant="destructive">Törölt</Badge>    {/* red — cancelled */}
<Badge variant="outline">Ajánlat</Badge>       {/* subtle — offer */}
```

### Hairline gradient divider (standalone)

```tsx
<div className="h-px bg-gradient-to-r from-transparent via-veltol-aqua/35 to-transparent" />
```

### Live pill

```tsx
<div className="inline-flex items-center gap-1.5 rounded-full border border-veltol-green/20 bg-veltol-green/8 px-2.5 py-1">
  <div className="v-live-dot" />
  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-veltol-green">Live</span>
</div>
```

---

## Surface hierarchy

From darkest (back) to brightest (front):

```
#020B12  void      — page background
#041620  deep      — card background (--card in shadcn)
#061F2C  bg        — popover, dropdown background
#0A2C3C  surface   — secondary, muted, sidebar switcher
```

Use `backdrop-filter: blur(20px)` on panels sitting above the aurora background — it creates the frosted glass effect that makes the brand distinctive.

---

## Layout shell

```
h-screen flex overflow-hidden
├── aside  w-64  bg-[rgba(6,15,26,0.75)] backdrop-blur-xl border-r border-border/40
│   ├── brand lockup (h-[62px])
│   ├── project switcher
│   ├── nav (flex-1 overflow-y-auto)
│   └── user footer
└── div flex-1 flex-col overflow-hidden
    ├── header h-[62px] bg-[rgba(6,15,26,0.75)] backdrop-blur-xl border-b border-border/40
    └── main flex-1 overflow-y-auto bg-background p-4 md:p-8
```

---

## Design rules to follow

- **Dark-mode first.** All design decisions are made in dark mode. Light mode is secondary.
- **Mono labels everywhere.** Any eyebrow, section label, KPI label, or nav group uses `font-mono uppercase tracking-[0.16–0.22em] text-veltol-fgMute`.
- **One gradient, used precisely.** `bg-v-gradient` goes on the featured KPI card, the V-mark, and user avatars — not as a general decoration.
- **Aqua is the active signal.** Border, text, background tint — when something is active/selected/focused, it turns aqua (`#2BC4C8`). Green is only for success/live/positive.
- **Top hairline on every glass card.** The `via-veltol-aqua/40` gradient line at the top of cards is a brand signature — include it consistently.
- **Backdrop blur on floating surfaces.** Sidebar, topbar, dropdowns, modals all use `backdrop-blur-xl` — they sit above the aurora, not in front of a solid color.
- **No decorative gradients.** The aurora background and the gradient spine are functional — they orient the viewer in the dark field. Don't add gradients to call-to-actions or decoration.
- **Tabular numbers for all data.** Any numeric value in a table or card uses `font-mono tabular-nums` so columns align.
