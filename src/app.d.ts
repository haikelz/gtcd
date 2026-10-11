/// <reference types="vite-plugin-pwa/client" />

import type { DashboardLayout } from "$lib/dashboard-layout";
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
    }
    interface PageData {
      /** Present on dashboard routes; see $lib/preferences. */
      preferences?: DisplayPreferences;
      /** Present on dashboard routes; see $lib/dashboard-layout. */
      dashboardLayout?: DashboardLayout;
    }
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
