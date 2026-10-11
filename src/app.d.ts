/// <reference types="vite-plugin-pwa/client" />

import type { DashboardLayout, Locale } from "$lib/dashboard-layout";
import type { DisplayPreferences } from "$lib/preferences";

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    interface Error {
      message: string;
    }
    interface Locals {
      user: {
        email: string;
      } | null;
      /** Interface language for this request; see hooks.server.ts. */
      locale: Locale;
    }
    interface PageData {
      /** Present on dashboard routes; see $lib/preferences. */
      preferences?: DisplayPreferences;
      /** Present on dashboard routes; see $lib/dashboard-layout. */
      dashboardLayout?: DashboardLayout;
      /** Interface language outside the dashboard (login, errors). */
      locale?: Locale;
    }
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
