# gtcd design system

## Direction

gtcd uses the [ReUI](https://reui.io/) design system: the reui.io theme on top
of shadcn/ui `base-nova`, with ReUI's own primitives (Frame, Alert, Badge) as
the main surfaces. ReUI ships React; gtcd ports its tokens and class recipes to
Svelte 5 with Bits UI, Tailwind v4, `tailwind-variants` and `cn`. No React
runtime is involved.

Sources of truth, in order:

1. ReUI registry items, fetched as `https://reui.io/r/base-nova/<name>.json`
   (the same payload the ReUI MCP server installs).
2. shadcn/ui `base-nova` items, `https://ui.shadcn.com/r/styles/base-nova/<name>.json`,
   for stock primitives ReUI does not replace.
3. The live reui.io stylesheet for theme values.

When porting, keep the upstream class strings and variant names. Deviate only
for Svelte/Bits UI mechanics or a documented reason, and record the reason in
a comment next to the deviation.

## Tokens

`src/app.css` owns every token. Values mirror the reui.io theme:

- Neutral surfaces: white canvas and cards, `#f5f5f5` muted, `#e5e5e5` borders.
  Dark uses `#0a0a0a` canvas, `#171717` cards, `#262626` muted and 10% white
  borders.
- Primary is neutral (`#171717` light, `#e5e5e5` dark). It marks actions,
  focus and selection, never data.
- `--muted-foreground` is ReUI's `#696969`, darker than stock shadcn, for AA
  contrast on small text.
- ReUI extended tokens: `--success`, `--info`, `--warning`, `--invert` and
  `--destructive-foreground`, each with a foreground. Use them for real states
  only.
- `--chart-1`…`--chart-5` are the multi-hue reui.io chart palette (orange,
  teal, slate, yellow, amber in light; blue, emerald, amber, violet, rose in
  dark). Data series read chart tokens and never `--primary`.
- Radius scale is fixed pixels from reui.io: xs 2, sm 4, md 6, lg 8, xl 12,
  2xl 16.
- Focus outline uses `--primary`. ReUI's `--ring` grey falls below 3:1 against
  white, so it styles control rings only.

Never hardcode hex values or raw Tailwind palette classes in components.

## Primitives

`src/lib/components/ui/` holds the ported primitives:

| Primitive                 | Upstream                   | Notes                                                 |
| ------------------------- | -------------------------- | ----------------------------------------------------- |
| Frame + parts             | ReUI `frame`               | `variant`, `spacing` xs–lg, `stacked`, `dense`, `fit` |
| Alert + parts             | ReUI `alert`               | default, destructive, info, success, warning, invert  |
| Badge                     | ReUI `badge`               | solid, `-light`, `-outline` variants; sizes; radius   |
| Button, Input, Textarea … | shadcn `base-nova`         | Bits UI where behavior is needed                      |
| Empty + parts             | shadcn `base-nova` `empty` | composed by `EmptyState`                              |
| NativeSelect              | shadcn `base-nova`         | site switcher                                         |
| ToggleGroup               | shadcn `base-nova`         | segmented period and grouping controls                |

Deviations: `FrameTitle` renders an `h2` (ReUI uses a div) to keep report
sections in the document outline. Badge omits ReUI's `focus` variants because
ReUI documents no `--focus` token.

## Frame composition

Report surfaces, KPI tiles, forms, the toolbar and login use `Frame` +
`FramePanel`. The Frame is the muted, bordered surround; FrameHeader and
FrameFooter sit in that surround as chrome; FramePanel is the content surface.
FramePanel pads itself from the Frame's `spacing` (default 16px), so content
goes straight inside it with no padding wrapper. Use `class="p-0"` or `dense`
only when rows carry their own padding to the edge. Panel radii stay concentric
through `--frame-radius`, `--frame-px` and `--frame-panel-radius`.

## Layout and typography

- Sidebar 256px, shadcn sidebar recipes: 48px header, grouped navigation with
  group labels, 32px menu buttons (40px below 1024px for touch), active state
  from `aria-current="page"`.
- Topbar 48px: sidebar trigger, separator, breadcrumb, site switcher.
- Content max width 96rem; 24px padding on desktop, 16px plus safe-area insets
  on mobile. Frames sit on a `gap-4` grid.
- `PageHeader` owns every page's h1 (text-xl semibold), description, optional
  eyebrow (back link) and actions. Section titles are `FrameTitle` (text-sm
  semibold). Body text-sm, meta text-xs muted.
- Self-hosted Inter for the interface; JetBrains Mono for paths and code.
  Numbers use tabular numerals.

## Components

- `DashboardToolbar`: Frame with controls in the panel (date range, preset
  ToggleGroup, path filter, grouping ToggleGroup) and period navigation in the
  FrameFooter. The URL stays the source of report state.
- `StatCard`: compact Frame KPI tile with a `-light` trend Badge.
- `AreaChart`, `DonutChart`, `BarChart`, `SparkLine`: chart tokens, SVG
  title/desc and sr-only tables. DonutChart caps at five segments to stay
  within the palette.
- `ErrorAlert`: the standard report load failure (destructive Alert with
  Retry). `EmptyState`: Empty primitive with icon, title and description.
- `ScaleToggle`: ToggleGroup switching page sparklines between per-page and
  shared scale via `?scale=shared`.
- `CopyField`: read-only Input with a copy Button, for share links and
  counter embeds.
- `/dashboard/customize`: saved views and overview widget order; the overview
  lays widgets on a 12-column dense grid where wide widgets span 8 and narrow
  ones 4, so any order tiles into full rows.
- Dates, hours and counts go through `$lib/preferences` / `$lib/display`
  (`formatCount`) so they follow the user's GoatCounter settings; never call
  `toLocaleString()` for report numbers.
- `ThemeToggle`: DropdownMenu radio items; persists light, dark or system.
- `ToastStack`: Alert on an opaque popover surface with a semantic icon color.

## Accessibility and motion

Keep skip navigation, visible focus, form labels, chart text equivalents,
`role="meter"` bars and drawer focus trapping. Target WCAG 2.1 AA. Motion is
limited to route entry, popovers and toasts, and `prefers-reduced-motion`
disables it. Verify filled, empty and error states in both themes at desktop
and mobile widths; visual QA uses the local synthetic upstream only.
