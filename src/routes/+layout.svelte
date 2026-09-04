<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import { onMount } from "svelte";
  import "../app.css";

  let { children, data } = $props();
  let sidebarOpen = $state(false);
  let desktopSidebarOpen = $state(true);

  const isDashboard = $derived(page.url.pathname.startsWith("/dashboard"));
  const isPublic = $derived(
    page.url.pathname === "/" || page.url.pathname === "/login"
  );

  const navItems = [
    {
      label: "Overview",
      href: "/dashboard",
      icon: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>`,
    },
    {
      label: "Pages",
      href: "/dashboard/pages",
      icon: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>`,
    },
    {
      label: "Browsers",
      href: "/dashboard/browsers",
      icon: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>`,
    },
    {
      label: "Systems",
      href: "/dashboard/systems",
      icon: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 7.41A2.25 2.25 0 012.25 5.496V5.25" /></svg>`,
    },
    {
      label: "Locations",
      href: "/dashboard/locations",
      icon: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>`,
    },
    {
      label: "Languages",
      href: "/dashboard/languages",
      icon: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" /></svg>`,
    },
    {
      label: "Devices",
      href: "/dashboard/devices",
      icon: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>`,
    },
    {
      label: "Campaigns",
      href: "/dashboard/campaigns",
      icon: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" /></svg>`,
    },
  ];

  function closeSidebar() {
    sidebarOpen = false;
  }

  function toggleSidebar() {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      desktopSidebarOpen = !desktopSidebarOpen;
      localStorage.setItem("gtcd_desktop_sidebar", String(desktopSidebarOpen));
    } else {
      sidebarOpen = !sidebarOpen;
    }
  }

  function toggleDesktopSidebar() {
    desktopSidebarOpen = !desktopSidebarOpen;
    localStorage.setItem("gtcd_desktop_sidebar", String(desktopSidebarOpen));
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && sidebarOpen) {
      closeSidebar();
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      toggleSidebar();
    }
  }

  onMount(() => {
    if (isDashboard && !data.authenticated) {
      goto("/login");
    }

    const savedDesktopSidebar = localStorage.getItem("gtcd_desktop_sidebar");
    if (savedDesktopSidebar !== null) {
      desktopSidebarOpen = savedDesktopSidebar === "true";
    }

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  });

  function isActive(href: string): boolean {
    if (href === "/dashboard") return page.url.pathname === "/dashboard";
    return page.url.pathname.startsWith(href);
  }

  async function handleLogout() {
    await fetch("/logout", { method: "POST" });
    goto("/login");
  }
</script>

<!-- Skip to main content landmark (WCAG 2.4.1) -->
<a href="#main-content" class="skip-link btn btn-primary text-xs shadow-lg">
  Skip to main content
</a>

{#if isPublic}
  {@render children()}
{:else if data.authenticated}
  <div class="flex min-h-screen bg-background">
    <!-- Mobile overlay -->
    {#if sidebarOpen}
      <button
        type="button"
        class="fixed inset-0 z-30 lg:hidden bg-black/40 backdrop-blur-xs cursor-pointer border-none p-0 w-full h-full text-left"
        onclick={closeSidebar}
        aria-label="Close navigation sidebar"
      ></button>
    {/if}

    <!-- Sidebar -->
    <aside
      id="sidebar-nav"
      aria-label="Dashboard Sidebar"
      class="sidebar fixed lg:sticky top-0 left-0 z-40 h-screen flex flex-col transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] {sidebarOpen
        ? 'translate-x-0 w-64'
        : '-translate-x-full w-64'} {desktopSidebarOpen
        ? 'lg:translate-x-0 lg:w-64'
        : 'lg:-translate-x-full lg:w-0 lg:opacity-0 lg:pointer-events-none lg:border-none'}"
    >
      <!-- Logo & Desktop Collapse Button -->
      <div class="px-5 pt-5 pb-4 flex items-center justify-between">
        <a href="/" class="flex items-center gap-2.5 no-underline">
          <div
            class="w-8 h-8 rounded-xl flex items-center justify-center bg-primary shadow-sm"
          >
            <span class="text-primary-content font-bold text-sm">G</span>
          </div>
          <span class="text-foreground font-bold text-sm tracking-tight"
            >gtcd</span
          >
        </a>
        <button
          type="button"
          class="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-base-200 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
          onclick={toggleDesktopSidebar}
          aria-label="Close sidebar"
          title="Close sidebar (Ctrl+B)"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5"
            />
          </svg>
        </button>
      </div>

      <div class="gradient-line mx-5"></div>

      <!-- Navigation -->
      <nav class="flex-1 py-4 px-3 overflow-y-auto" aria-label="Main Navigation">
        <p class="sidebar-section-label px-3 mb-2">Analytics</p>
        <ul class="list-none p-0 m-0 space-y-0.5">
          {#each navItems as item}
            <li>
              <a
                href={item.href}
                class="sidebar-link {isActive(item.href) ? 'active' : ''}"
                aria-current={isActive(item.href) ? "page" : undefined}
                onclick={closeSidebar}
              >
                <span
                  class="shrink-0 {isActive(item.href) ? 'text-primary' : 'text-muted-foreground'}"
                  aria-hidden="true"
                >
                  {@html item.icon}
                </span>
                <span>{item.label}</span>
              </a>
            </li>
          {/each}
        </ul>
      </nav>

      <!-- Footer -->
      <div class="px-5 py-4 border-t border-border">
        <ul class="list-none p-0 m-0 space-y-2">
          <ThemeToggle />
          <li>
            <button
              type="button"
              class="sidebar-link w-full text-left text-muted-foreground hover:text-error hover:bg-error/10 cursor-pointer"
              onclick={handleLogout}
            >
              <span class="shrink-0" aria-hidden="true">
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                  />
                </svg>
              </span>
              <span>Sign out</span>
            </button>
          </li>
        </ul>
      </div>
    </aside>

    <!-- Main content landmark (WCAG 1.3.1 / 2.4.1) -->
    <main id="main-content" class="flex-1 min-w-0 transition-all duration-300" tabindex="-1">
      <!-- Universal header (mobile + desktop toggle) -->
      <header
        class="sticky top-0 z-20 bg-base-100/85 backdrop-blur-md border-b border-border"
      >
        <div class="flex items-center justify-between px-4 sm:px-6 h-14">
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-base-200 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
              onclick={toggleSidebar}
              aria-expanded={desktopSidebarOpen || sidebarOpen}
              aria-controls="sidebar-nav"
              aria-label={desktopSidebarOpen || sidebarOpen ? "Close navigation sidebar" : "Open navigation sidebar"}
              title="Toggle sidebar (Ctrl+B)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>

            <!-- Brand indicator when desktop sidebar is closed -->
            {#if !desktopSidebarOpen}
              <a href="/" class="hidden lg:flex items-center gap-2 no-underline animate-fade-in">
                <div
                  class="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-xs"
                >
                  <span class="text-primary-content font-bold text-xs">G</span>
                </div>
                <span class="font-bold text-sm tracking-tight text-foreground"
                  >gtcd</span
                >
              </a>
            {:else}
              <a href="/" class="lg:hidden flex items-center gap-2 no-underline">
                <div
                  class="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-xs"
                >
                  <span class="text-primary-content font-bold text-xs">G</span>
                </div>
                <span class="font-bold text-sm tracking-tight text-foreground"
                  >gtcd</span
                >
              </a>
            {/if}
          </div>

          <!-- Quick Theme Toggle in header when desktop sidebar is collapsed -->
          {#if !desktopSidebarOpen}
            <div class="hidden lg:block animate-fade-in">
              <ThemeToggle />
            </div>
          {/if}
        </div>
      </header>

      <div class="mx-auto max-w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {@render children()}
      </div>
    </main>
  </div>
{:else}
  <div class="min-h-screen flex items-center justify-center bg-background">
    <div class="flex items-center gap-3" role="status" aria-live="polite">
      <span class="loading loading-spinner loading-md text-primary"></span>
      <span class="text-sm font-medium text-muted-foreground"
        >Redirecting to login…</span
      >
    </div>
  </div>
{/if}
