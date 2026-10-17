# GTCD

## Platform

web

## Users and purpose

Site owners and analysts monitor traffic, explore pages and audiences, and
manage multiple GoatCounter sites in a self-hosted analytics workspace.

## Capabilities and constraints

Overview, reports and drill-downs, path directory, site settings, and exports
use actual GoatCounter data. Authentication, server-side API mediation,
permissions, sessions, and multi-site context must remain intact.
Administration uses each signed-in user's server-side GoatCounter session to
render custom users, tokens, security, imports, page data and preferences screens.
Keep the stock GoatCounter build unchanged; never elevate these actions through
the dashboard's shared API token. GTCD display settings and scheduled reports
remain separate from native GoatCounter preferences and email reports.
Do not fabricate statistics or add decorative operational claims.

## Design commitments

The user selected the ReUI design system (https://reui.io/) with ReUI Frame
rather than Card as the primary dashboard surface; `DESIGN.md` records the
tokens and primitives. Preserve Svelte 5 and Bits UI; port React registry
recipes without adding React.
Support desktop, mobile, keyboard navigation, and both light and dark themes.
