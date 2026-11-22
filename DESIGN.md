# gtcd design system

## Direction

gtcd uses the [ReUI](https://reui.io/) design system: the reui.io theme on top
of shadcn/ui `base-nova`, with ReUI's own primitives (Frame, Alert, Badge) as
the main surfaces. ReUI ships React; gtcd ports its tokens and class recipes to
Svelte 5 with Bits UI, Tailwind v4, `tailwind-variants` and `cn`. No React
runtime is involved.

For existing screens, the installed [primitives](src/lib/components/ui/),
[theme](src/app.css) and this document define the current implementation.
For new ports, consult these upstream references:

1. ReUI registry items, fetched as `https://reui.io/r/base-nova/<name>.json`
   (the same payload the ReUI MCP server installs).
2. shadcn/ui `base-nova` items, `https://ui.shadcn.com/r/styles/base-nova/<name>.json`,
   for stock primitives ReUI does not replace.
3. The live reui.io stylesheet for theme values.

When porting, keep the upstream class strings and variant names. Deviate only
for Svelte/Bits UI mechanics or a documented reason, and record the reason in
a comment next to the deviation.

gtcd shares one visual identity with its landing page (`~/landing-page-gtcd`,
its own `DESIGN.md`): the same light tokens, a dark set both use, Inter Tight
display type, pill controls and deep-orange primary actions. ReUI supplies the
structure and recipes; the landing page decides colour, type and shape. A
change to a shared token belongs in both repositories.

## Tokens

`src/app.css` owns every token, under ReUI's names so the recipes keep
working. Light values are the landing page's; dark values are shared with it.

| Token (landing role)                                 | Light                                                            | Dark                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| `--background` (canvas)                              | `#ffffff`                                                        | `#0a0a0a`                                              |
| `--foreground` (ink text)                            | `#111111`                                                        | `#fafafa`                                              |
| `--card` (white panel, mock)                         | `#ffffff`                                                        | `#171717`                                              |
| `--field` (grey surround of a Frame)                 | `#f5f5f6`                                                        | `#111111`                                              |
| `--popover`                                          | `#ffffff`                                                        | `#1c1c1c`                                              |
| `--muted`, `--accent`, `--secondary` (hover surface) | `#f5f5f5`                                                        | `#222222`–`#262626`                                    |
| `--muted-foreground` (violet-grey)                   | `#5c5c66` (6.6:1)                                                | `#a1a1aa` (7.7:1)                                      |
| `--border` / `--border-strong` / `--input`           | `#e8e8e8` / `#a1a1a1` / `#e8e8e8`                                | 10% / 24% / 15% white                                  |
| `--primary` (deep orange)                            | `#c94200`, hover `#b03800`, active `#9a3100`                     | same                                                   |
| `--ring` (focus)                                     | `#c94200` (4.9:1)                                                | `#f05100` (5.6:1)                                      |
| `--ink` (brand mark, selected states)                | `#171717` on `#fafafa`                                           | `#fafafa` on `#0a0a0a`                                 |
| `--chart-1`…`--chart-5`                              | orange `#f05100`, teal `#009588`, slate `#104e64`, yellow, amber | orange, teal `#2bb3a3`, slate `#5e8fa3`, yellow, amber |
| `--selection`                                        | `#ffd9c7`                                                        | `#7a2d00`                                              |

- Primary is a deep-orange fill with white text, for the main action on a
  screen and checked controls; never data, never small text (3.9:1 on the dark
  canvas). Orange text is the badge `primary-light` variant only, in
  `--primary-active` light and `--chart-1` dark; the dark tint stays at 10%
  so that text clears 4.5:1 on cards.
- Ink is a fill for the brand mark and selected states (active sidebar item,
  pressed toggle). It inverts in dark. Never decoration.
- ReUI extended tokens: `--success`, `--info`, `--warning`, `--invert` and
  `--destructive-foreground`, each with a foreground. Use them for real states
  only.
- Data series read chart tokens and never `--primary`. Dark chart-3 is
  lightened so every series clears 3:1 on dark panels.
- Radius scale is the landing page's: xs 4, sm 6, md 10, lg 14, xl 20, 2xl 28.
  Frames are 20px; menus and textareas 14px; every control is a pill.
- Focus is a 2px `--ring` outline, offset 2px, from the global
  `:focus-visible` rule in `src/app.css`. The offset gap shows the surface,
  so the ring clears 3:1 against both the surface and the control's own fill
  (the orange primary, the ink pressed toggle). Recipes never replace it with
  a translucent ring. Joined toggle groups (`spacing={0}`) paint a 2px
  background gap under it so a neighbour's ink fill never touches the ring;
  rows that run to a clipping panel edge (`PageRow`) draw it inset.
- Shadows: only the primary button lifts (`--shadow-primary`, light only).
  Frames, panels, chips and toggles are flat with hairline borders.

Never hardcode hex values or raw Tailwind palette classes in components.

## Primitives

`src/lib/components/ui/` holds the ported primitives:

| Primitive                 | Upstream                   | Notes                                                                           |
| ------------------------- | -------------------------- | ------------------------------------------------------------------------------- |
| Frame + parts             | ReUI `frame`               | `variant` default/inverse/ghost; `spacing` xs/sm/default/lg; `stacked`, `dense` |
| Alert + parts             | ReUI `alert`               | default, destructive, info, success, warning, invert                            |
| Badge                     | ReUI `badge`               | solid, `-light`, `-outline` variants; sizes; radius                             |
| Button, Input, Textarea … | shadcn `base-nova`         | Bits UI where behavior is needed                                                |
| Empty + parts             | shadcn `base-nova` `empty` | composed by `EmptyState`                                                        |
| NativeSelect              | shadcn `base-nova`         | site switcher                                                                   |
| ToggleGroup               | shadcn `base-nova`         | segmented period and grouping controls                                          |

Deviations: `FrameTitle` renders an `h2` by default, with `level` 2/3/4 for nested
sections (ReUI uses a div), to keep reports in the document outline.
Badge omits ReUI's `focus` variants because
ReUI documents no `--focus` token. For the landing page's shapes, Button,
Input, NativeSelect, ToggleGroup and Badge are pills (`rounded-full`, wider
horizontal padding); Badge leaves its `radius` prop unset so the `full`
default applies. Button's default variant uses the primary hover/active
steps and lift; ToggleGroup's pressed state is an ink fill; Frame's surround is
`--field` and FramePanel casts no shadow. Button, Input, Textarea,
NativeSelect, Checkbox, RadioGroup, Switch, ToggleGroup and Badge drop
base-nova's `focus-visible:ring-ring/50` for the global focus outline. Each
recipe carries a comment.

## Frame composition

Report surfaces, KPI tiles, forms, the toolbar and login use `Frame` +
`FramePanel`. Overview panels, KPI tiles and report controls use the installed
`dense` option to avoid double-border insets. Settings retain the default
surround for grouping form sections. Do not flatten panels with custom CSS or
change the upstream primitive recipes. The Frame is the muted, bordered surround; FrameHeader and
FrameFooter sit in that surround as chrome; FramePanel is the content surface.
FramePanel pads itself from the Frame's `spacing` (default 16px), so content
goes straight inside it with no padding wrapper. Use `class="p-0"` only when
rows carry their own padding to the edge; `dense` removes the outer inset,
not the content padding. Panel radii stay concentric
through `--frame-radius`, `--frame-px` and `--frame-panel-radius`.

## Layout and typography

- Sidebar 256px, shadcn sidebar recipes: 48px header, grouped navigation with
  group labels, 32px menu buttons (40px below 1024px for touch), active state
  from `aria-current="page"`.
- Topbar 48px: sidebar trigger, separator, breadcrumb, site switcher.
- Content max width 96rem; 24px padding on desktop, 16px plus safe-area insets
  on mobile. Frames sit on a `gap-4` grid.
- `PageHeader` owns every page's h1 (text-3xl), description, optional
  eyebrow (back link) and actions. Section titles are `FrameTitle` (text-sm
  semibold). Body text-sm, meta text-xs muted.
- Self-hosted Inter for the interface; Inter Tight for display type (every h1,
  KPI values, chart totals); JetBrains Mono for paths and code. Display type is
  weight 400 with negative tracking (-0.04em titles, -0.03em figures); nothing
  is set at 700. Numbers use tabular numerals.
- Overview sections use 24px gaps; tighter 16px gaps group related KPI tiles.
  Headline metrics precede their period comparison. Comparison values emphasize
  the change, not a second copy of the headline count.

## Interface voice

Use short, factual analytics terms in English and Indonesian: “Top pages”,
“Browsers”, “Visits by country”. Avoid conversational filler (“Your most-read
pages”), slogans, and descriptions that only restate a heading. Labels describe
the data or action; help text explains a constraint. Preserve event/pageview
distinctions, baseline limitations and delivery consequences when shortening.

## Components

- `DashboardToolbar`: Frame with controls in the panel (date range, preset
  ToggleGroup, path filter, grouping ToggleGroup) and period navigation in the
  FrameFooter. The URL stays the source of report state.
- `StatCard`: compact Frame KPI tile with a `-light` trend Badge.
- `AreaChart`, `DonutChart`, `BarChart`, `SparkLine`: chart tokens, SVG
  title/desc and sr-only tables. DonutChart caps at five segments to stay
  within the palette. AreaChart marks dated notes with neutral markers and
  names them in its data table, which lists shares of the peak in
  fewer-numbers mode. BarChart rows with a detail page are links (they open
  in a new tab) that carry the row's display name as `?name=` for the
  detail heading. Rows named "Unknown" by the service layer display
  `charts.unknown` (`statName`).
- `HourHeatmap`: weekday × hour grid on a stepped `--chart-1` scale with a
  legend; rows start on the user's GoatCounter week start. Dark mode starts
  the scale at 40% because chart orange at 25% sits at 1.2:1 against dark `muted`. The image
  takes focus so arrow keys step through cells; its sr-only table repeats
  every value, as shares of the peak in fewer-numbers mode.
- `ErrorAlert`: the standard report load failure (destructive Alert with
  Retry). `EmptyState`: Empty primitive with icon, title, description and an optional `actions` snippet; pass the next step (clear filter, widen the period, set up tracking) whenever one exists.
- Streaming: the overview loader returns each GoatCounter request as an
  unawaited promise; widgets `{#await}` it and show a shape-matched
  `Skeleton` until data arrives. Pages also streams optional comparisons;
  unavailable comparison data must not replace usable current-period data with
  an error page. A top progress bar marks client navigation.
- `ScaleToggle`: ToggleGroup switching page sparklines between per-page and
  shared scale via `?scale=shared`.
- `CopyField`: read-only Input with a copy Button, for share links and
  counter embeds.
- `/dashboard/customize`: saved views and overview widget order; the overview
  lays widgets on a 12-column dense grid where wide widgets span 8 and narrow
  ones 4, so any order tiles into full rows.
- Dates, hours, counts and percentages go through `$lib/preferences` /
  `$lib/display` (`formatCount`, after rounding shares to one decimal) so they
  follow the user's GoatCounter separators, date format and timezone; never
  call `toLocaleString()`, `toFixed()` or `Intl.NumberFormat` for displayed
  numbers.
- A control that removes itself on success (delete, revoke, clear filter)
  hands focus to its list's heading (`tabindex="-1"`), the add form's first
  field or the related input.
- `ThemeToggle`: DropdownMenu radio items; persists light, dark or system.
- `ToastStack`: Alert on an opaque popover surface with a semantic icon color.
- `CsvDownload`: outline Button in a report's FrameHeader; saves the rows on
  screen, with shares only in "fewer numbers" mode.
- `CommandPalette`: base-nova CommandDialog on Bits UI, opened by Cmd+K on a
  Mac and Ctrl+K elsewhere, text fields included, or by the header button;
  Ctrl+K keeps its text-editing meaning on a Mac. Destinations come from the
  sidebar groups. Selected items use `accent`, because the dark popover and
  `muted` share one grey. The sidebar toggle follows the same platform rule
  with Cmd+B / Ctrl+B, inside the signed-in dashboard shell only.
- `CampaignLinkBuilder`: Frame disclosed from the Campaigns header; ends in a
  `CopyField`.

## Operational and privacy states

- Saved preferences and sharing mutations show storage failures explicitly;
  success feedback must follow a durable write, not a memory-only fallback.
- Sharing distinguishes GTCD audience links from GoatCounter site visibility.
  Explain expiry, allowed metrics, fixed ranges and revocation without promising
  that a non-expiring link survives lost Redis state. Replacing, rotating or
  revoking a live link asks for confirmation first and toasts the result;
  a failure shows in the card that sent it, with Retry only when storage is
  unavailable (503).
- Diagnostics is admin-only. Dependency observations carry timestamps and
  process-local counters are not cluster-wide totals.
- Native administration renders allowlisted form models, not upstream HTML.
  Preserve confirmations, expired-session states and upstream permission errors.
- Reports, login and public-share pages remain noindex. Use generic share
  previews without report names, tokens or canonical URLs.

## Accessibility and motion

Native browser controls follow the selected theme through `color-scheme`.
Keep skip navigation, visible focus, form labels, chart text equivalents,
`role="meter"` bars and drawer focus trapping. Target WCAG 2.1 AA. Motion is
limited to control feedback, popovers and toasts; report pages do not animate
on entry. `prefers-reduced-motion`
disables it. Verify filled, empty and error states in both themes at desktop
and mobile widths; visual QA uses the local synthetic upstream only.
