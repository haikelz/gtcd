import adapter from "@sveltejs/adapter-node";
import { SvelteKitPWA } from "@vite-pwa/sveltekit";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    SvelteKitPWA({
      registerType: "autoUpdate",
      injectRegister: "script-defer",
      manifest: {
        name: "gtcd — GoatCounter analytics dashboard",
        short_name: "gtcd",
        description: "Self-hosted analytics dashboard for GoatCounter.",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/pwa-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,svg,png,woff2,ico}"],
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) =>
              url.origin === self.location.origin &&
              url.pathname.startsWith("/api/stats/") &&
              request.method === "GET",
            handler: "NetworkFirst",
            options: {
              cacheName: "gtcd-api",
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
    sveltekit({
      compilerOptions: {
        // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
      },
      adapter: adapter(),
      // SvelteKit nonces its own inline scripts and the app.html theme
      // bootstrap, so scripts need no 'unsafe-inline'. hooks.server.ts sets
      // the remaining security headers.
      csp: {
        mode: "nonce",
        directives: {
          "default-src": ["self"],
          // challenges.cloudflare.com serves the Turnstile login widget.
          "script-src": ["self", "https://challenges.cloudflare.com"],
          "frame-src": ["https://challenges.cloudflare.com"],
          // SVG charts use inline style attributes for geometry.
          "style-src": ["self", "unsafe-inline"],
          "img-src": ["self", "data:"],
          "font-src": ["self"],
          "connect-src": ["self"],
          "object-src": ["none"],
          "base-uri": ["self"],
          "form-action": ["self"],
          "frame-ancestors": ["none"],
        },
      },
    }),
  ],
});
