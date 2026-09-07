# gtcd design system

## 1. Atmosphere & identity

A modern analytics studio: cloud canvas, ink typography, cobalt actions and a warm categorical data palette. The signature is an asymmetric overview: an emphasized traffic metric, a wide time-series chart beside an audience ring, then a content table beside geographic rankings. Reports differ by purpose instead of repeating equal-weight panels.

The Stripe reference informs chromatic elevation, navy typography and dense data with spacious controls, not brand cloning. Preserve self-hosted fonts, Lucide, Svelte and DaisyUI. Home continues to redirect to login/dashboard; no landing page is introduced.

## 2. Color

All colors are theme tokens in src/app.css.

| Role              | Light OKLCH  | Dark OKLCH   |
| ----------------- | ------------ | ------------ |
| Panels / base-100 | 100% 0 0     | 22% .018 265 |
| Canvas / base-200 | 97% .006 265 | 17% .018 265 |
| Border / base-300 | 91% .012 265 | 32% .022 265 |
| Text              | 25% .035 265 | 96% .006 265 |
| Primary / actions | 49% .20 265  | 76% .13 265  |
| Muted text        | 47% .025 265 | 73% .025 265 |
| Chart cobalt      | 59% .19 265  | 76% .13 265  |
| Chart mint        | 68% .12 175  | 76% .12 175  |
| Chart amber       | 77% .14 75   | 82% .14 75   |
| Chart coral       | 68% .15 30   | 76% .13 30   |
| Chart lavender    | 67% .14 305  | 79% .11 305  |

Categorical colors distinguish distribution parts, not success/failure. All marks have labels and numeric equivalents. Featured metric/login art use fixed ink-blue 28% .075 265 with 97% .005 265 text and 75% .13 265 highlights. Icon wells use 12% category tints. Existing semantic success/warning/error tokens retain their meaning.

## 3. Typography

Self-hosted Inter with stylistic display alternates; JetBrains Mono for paths and precise data. Body 14/16px, secondary 12/13px, panel titles 16px, page headings 32px, featured numbers 36px, login display 48px. Headings 500/600, body 400, controls 500. Display tracking -.04em, metrics -.02em. Tabular figures throughout. Long labels wrap or visibly truncate with full accessible text.

## 4. Spacing & layout

Tailwind 4px scale; controls 44px. Panel padding 20/24px and corners 16px; control corners 8px; icon wells 12px. Sidebar 240px, header 64px, content maximum 1440px. Canvas padding 32px desktop, 16px mobile.

Overview uses 2:1 traffic/audience and 3:2 pages/locations grids above 1280px. Three compact technical reports share the final row at wide sizes; stack below 1280px. KPIs use four columns above 1280px and two below; small-screen long values use 24px. Document owns scrolling; sticky sidebar navigation owns vertical overflow. Below 1024px preserve modal navigation and background focus lock.

## 5. Components

- **Brand**: existing live SVG histogram with cobalt mark.
- **StatCard**: label, value, supporting text; default/cobalt/mint/amber tones, optional typed Lucide icon and featured ink surface. No invented growth comparisons. Missing metrics remain an em dash.
- **AreaChart**: responsive SVG time series, hover readout, title/description/role, screen-reader table, empty state.
- **DonutChart**: actual category counts, top four plus summed remainder, SVG ring with total and visible count/share legend. Accessible title, description and table. No-data state when total is zero. Shared by overview and browsers.
- **BarChart**: ranked rows and accessible meters; optional category tone differentiates geographic/technical reports. Buttons only for real drill-down.
- **Report panels**: consistent headers/actions but composition varies by chart, ring, table or list. No static hover elevation.
- **DateRangePicker**: existing query-driven radio controls and arrow keys.
- **ThemeToggle**: existing light/dark/system dropdown, upward sidebar placement, persistence and focus behavior.
- **Shell**: grouped navigation, selected cobalt surface, workspace context, breadcrumb, actual loading status, persisted collapse and shortcut.
- **Login**: split analytics illustration and native form. Illustration has no fake metrics or production claims; mobile prioritizes form. Preserve password visibility, pending and focused error states.
- **Error/empty**: existing actionable copy/links, shared themed surfaces.

## 6. Motion & interaction

Preserve 200ms drawer transition/focus handling; controls use 150ms color feedback. No decorative card hover or entrance cascades. Reduced-motion preference suppresses transitions.

## 7. Depth & surface

White/slate panels above cloud/navy canvas. Near edge plus soft blue-tinted ambient shadows: 0 1px 2px at 3%, 0 8px 24px at 3%. Featured metric/login illustration use contrasting ink surfaces. Chart color, proportion and whitespace provide variety without gradient wallpaper or fake floating notifications.

## 8. Accessibility constraints & accepted debt

WCAG 2.1 AA target, 4.5:1 text contrast, visible primary focus, keyboard navigation, 44px touch controls, reduced motion and skip link. Personas: site owner checking traffic; analyst exploring content/audience; mobile/keyboard user navigating filters/details. Backend mediation, auth, sessions and data contracts stay unchanged.

No new accepted accessibility debt. Verify every route at 375, 768 and 1280px in both themes with synthetic data isolated in the local QA upstream.
