# gtcd design system

## 1. Atmosphere & identity

A focused analytics workspace: graphite, paper, and restrained emerald. Large editorial type introduces the product; precise tabular numbers and quiet dividers organize the workspace. The signature is a wide traffic chart above a compact, ruled metrics strip. The existing Svelte components and DaisyUI semantics remain the shared foundation.

This redesign evolves the previous blue palette, floating rounded cards, Inter body, and JetBrains Mono labels. The Supabase reference informs the graphite surface hierarchy, restrained green signals, and fine borders; this is an analytics product, not a brand clone. Existing self-hosted fonts keep the product independent of third-party requests.

## 2. Color

All colors use DaisyUI theme tokens in `src/app.css`.

| Role | Light OKLCH | Dark OKLCH |
| --- | --- | --- |
| base-100 / panels | 100% 0 0 | 19% .006 160 |
| base-200 / canvas | 97% .004 160 | 16% .005 160 |
| base-300 / borders | 89% .006 160 | 29% .008 160 |
| base-content | 23% .012 160 | 95% .004 160 |
| muted-foreground | 46% .014 160 | 72% .012 160 |
| primary / chart / focus | 43% .105 160 | 77% .14 160 |
| primary-content | 100% 0 0 | 18% .025 160 |
| success | Same as primary | Same as primary |
| error | 48% .20 25 | 74% .16 25 |
| warning | 75% .16 80 | 82% .16 80 |

Secondary and accent inherit base-200/content; neutral inherits base-content/base-100; info inherits primary. Chart fills use primary at 4–16%, selected controls at 8–12%. Avoid semantic color dependence: labels and selected-state attributes communicate meaning too.

## 3. Typography

Self-hosted Inter for body and display; JetBrains Mono for compact section markers, path names, dates, and data. Body 14/16px, metadata 12px, section heading 16/20/24px, page heading 30/36px, metric 32px, marketing heading fluid 40–80px. Display weight 500, body 400, controls 500, key figures 600. Display tracking -.06em, headings -.035em. Tabular figures for all analytics numbers. No tiny uppercase text as the primary information label.

## 4. Spacing & layout

Use the existing Tailwind 4px scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96px. Controls are at least 44px high. Panel padding 20/24px. Marketing maximum width 1200px; analytics 1440px. Marketing section spacing 64–96px. Dashboard section spacing 24px. Sidebar 240px, top bar 64px.

The document owns page scroll. Desktop sidebar is sticky, 100dvh, with its navigation owning overflow. Below 1024px the sidebar is a modal drawer. Main content uses min-width:0, tables own horizontal scrolling, and plots resize to their container. Two-column data panels stack below 640px. KPI strip is two columns on small screens, four on wide screens.

## 5. Components

- **Brand**: reusable live SVG histogram mark plus gtcd wordmark. Link to home, decorative SVG hidden from assistive technology.
- **AnalyticsPreview**: the shared StatCard, AreaChart, and BarChart compose an interactive example with visible illustrative-data labeling. Seven/thirty-day buttons update the chart and summary. Never connect sample data to authenticated routes.
- **Login / error**: split editorial login with native validated form, focus-managed error and pending button; single-column error page with working home/back actions. Mobile login prioritizes the form.
- **StatCard**: semantic article, label, tabular value, supporting text. Standalone panel or grouped metric strip with dividers. Long values wrap; no hover movement on a static metric.
- **AreaChart**: reusable SVG area, line, grid, date ticks, cursor readout, aggregate summary. Empty state retained. Title, description, role=img, and screen-reader data table required. Preview uses explicitly labeled sample data, never production metrics.
- **BarChart**: ranked rows, aligned count/share columns, low-height proportional bar. Button variant for drill-down, static variant for summaries. Meters retain labels and ranges; long names truncate within bounded columns.
- **DateRangePicker**: DaisyUI-style segmented radio group, selected surface and border, keyboard arrows, focus ring. Native button hit targets at least 44px. Selection continues to use route query state.
- **ThemeToggle**: light/dark/system segmented radio group, shared tokens, persistent preference and system updates, unique instance IDs.
- **Panels / tables**: shared `.panel` and `.chart-container`, fine border and 8px corners. Section headers align titles with text actions. Table rows use the same rhythm; no nested decorative cards.
- **App shell**: grouped navigation, current-page indicator, breadcrumb header, date context; persistent desktop collapse and keyboard shortcut. Mobile drawer closes on navigation, Escape, or backdrop and contains keyboard focus.
- **DaisyUI controls**: btn, input, alert, loading and table semantics remain. Disabled/submit/loading/error controls preserve existing behavior. Errors include actionable retry/back navigation; empty metrics never imply real traffic.

Existing routes serve as the state harness for shared primitives before the landing and dashboard composition is updated.

## 6. Motion & interaction

150ms color/opacity feedback for buttons and links; 200ms transform for the mobile drawer. Active buttons translate 1px. No decorative entrance cascades or hover lifts on data panels. Reduced-motion preference disables nonessential transitions. Loading indicates actual navigation or requests.

## 7. Depth & surface

Border and tonal hierarchy: paper panels against an off-white canvas; graphite panels against a darker canvas. Panel corners 8px, controls 6px, brand mark 8px. The landing product preview alone uses a layered elevation shadow (1px edge, 8px/24px soft shadow, 32px/80px ambient shadow at 4–8% of foreground) to distinguish the demonstration from marketing copy. No blur blobs, grid wallpaper, gradients behind headings, or floating metrics.

## 8. Accessibility constraints & accepted debt

Target WCAG 2.1 AA: 4.5:1 body contrast, visible 2px primary focus outline, keyboard-accessible navigation/filters, 44px primary touch controls, skip link, reduced motion, proper landmarks. Preserve light/dark/system modes. Primary personas: site owner checking traffic quickly; analyst exploring sources and devices; keyboard/mobile user navigating detailed reports. Each must reach a report, change its range, and return without losing context.

No new accepted accessibility debt. Verify public and authenticated route families at 375, 768, and 1280px with synthetic data isolated to the local QA service.
