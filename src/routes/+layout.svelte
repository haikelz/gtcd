<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import { navigating, page } from "$app/state";
  import Brand from "$lib/components/Brand.svelte";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import { onMount, tick } from "svelte";
  import "../app.css";

  let { children, data } = $props();
  let sidebarOpen = $state(false);
  let desktopSidebarOpen = $state(true);
  let wideViewport = $state(false);
  let sidebarElement: HTMLElement | undefined = $state();
  let toggleElement: HTMLButtonElement | undefined = $state();
  const navigationOpen = $derived(
    wideViewport ? desktopSidebarOpen : sidebarOpen,
  );
  const isDashboard = $derived(
    page.url.pathname.startsWith("/dashboard") && page.status < 400,
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
  const activeLabel = $derived(
    navItems.find((item) => isActive(item.href))?.label ?? "Overview",
  );

  function isActive(href: string): boolean {
    return href === "/dashboard"
      ? page.url.pathname === href
      : page.url.pathname.startsWith(href);
  }

  function closeSidebar() {
    sidebarOpen = false;
  }

  async function dismissSidebar() {
    closeSidebar();
    await tick();
    toggleElement?.focus();
  }

  async function toggleSidebar() {
    if (wideViewport) {
      desktopSidebarOpen = !desktopSidebarOpen;
      localStorage.setItem("gtcd_desktop_sidebar", String(desktopSidebarOpen));
      return;
    }
    sidebarOpen = !sidebarOpen;
    if (sidebarOpen) {
      await tick();
      sidebarElement?.querySelector<HTMLButtonElement>("button")?.focus();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && sidebarOpen) {
      dismissSidebar();
    } else if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === "b"
    ) {
      event.preventDefault();
      toggleSidebar();
    } else if (event.key === "Tab" && sidebarOpen && !wideViewport) {
      const controls = sidebarElement?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]):not([tabindex="-1"])',
      );
      const first = controls?.[0];
      const last = controls?.[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }

  onMount(() => {
    desktopSidebarOpen =
      localStorage.getItem("gtcd_desktop_sidebar") !== "false";
    const media = window.matchMedia("(min-width: 1024px)");
    function handleResize() {
      wideViewport = media.matches;
      sidebarOpen = false;
    }
    handleResize();
    media.addEventListener("change", handleResize);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      media.removeEventListener("change", handleResize);
      document.removeEventListener("keydown", handleKeydown);
    };
  });

  $effect(() => {
    if (!sidebarOpen || wideViewport) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  });

  async function handleLogout() {
    await fetch("/logout", { method: "POST" });
    await invalidateAll();
    goto("/login");
  }
</script>

<a href="#main-content" class="skip-link btn btn-primary"
  >Skip to main content</a
>

{#if isDashboard && data.authenticated}
  <div class="flex min-h-dvh bg-background">
    {#if sidebarOpen && !wideViewport}
      <button
        type="button"
        class="fixed inset-0 z-30 bg-neutral/30 lg:hidden"
        onclick={dismissSidebar}
        tabindex="-1"
        aria-label="Close navigation overlay"
      ></button>
    {/if}
    <aside
      id="sidebar-nav"
      bind:this={sidebarElement}
      aria-label="Analytics navigation"
      role={sidebarOpen && !wideViewport ? "dialog" : undefined}
      aria-modal={sidebarOpen && !wideViewport ? true : undefined}
      inert={!navigationOpen}
      class="sidebar fixed lg:sticky top-0 left-0 z-40 h-dvh flex shrink-0 flex-col w-60 transition-transform duration-200 {sidebarOpen
        ? 'translate-x-0'
        : '-translate-x-full'} {desktopSidebarOpen
        ? 'lg:translate-x-0'
        : 'lg:w-0 lg:overflow-hidden lg:invisible'}"
    >
      <div class="flex items-center justify-between gap-3 px-5 h-20 shrink-0">
        <Brand />
        <button
          type="button"
          class="btn btn-ghost btn-square lg:hidden"
          onclick={dismissSidebar}
          aria-label="Close navigation">×</button
        >
      </div>
      <div class="mx-4 px-3 py-3 border border-border rounded-lg">
        <p class="text-sm font-medium">Website analytics</p>
        <p class="text-xs text-muted-foreground mt-1">GoatCounter workspace</p>
      </div>
      <nav class="flex-1 min-h-0 overflow-y-auto p-3 pt-6" aria-label="Reports">
        <ul class="list-none p-0 m-0 space-y-1">
          {#each navItems as item, i}
            <li>
              {#if i === 0 || i === 2 || i === 7}
                <p
                  class="sidebar-section-label px-3 pb-2 {i > 0 ? 'pt-5' : ''}"
                >
                  {i === 0 ? "Workspace" : i === 2 ? "Audience" : "Acquisition"}
                </p>
              {/if}
              <a
                href={item.href}
                class="sidebar-link {isActive(item.href) ? 'active' : ''}"
                aria-current={isActive(item.href) ? "page" : undefined}
                onclick={closeSidebar}
              >
                <span class="shrink-0" aria-hidden="true"
                  >{@html item.icon}</span
                >
                <span>{item.label}</span>
                {#if isActive(item.href)}<span
                    class="ml-auto text-xs"
                    aria-hidden="true">⌁</span
                  >{/if}
              </a>
            </li>
          {/each}
        </ul>
      </nav>
      <div class="border-t border-border p-4">
        <p class="sidebar-section-label mb-3">Appearance</p>
        <ThemeToggle compact />
        <button
          type="button"
          class="sidebar-link w-full mt-3 cursor-pointer"
          onclick={handleLogout}
        >
          <span aria-hidden="true">↗</span> Sign out
        </button>
      </div>
    </aside>
    <div class="min-w-0 flex-1" inert={sidebarOpen && !wideViewport}>
      <header class="workspace-header sticky top-0 z-20">
        <div class="flex items-center gap-4 min-w-0">
          <button
            bind:this={toggleElement}
            type="button"
            class="btn btn-ghost btn-square text-muted-foreground"
            onclick={toggleSidebar}
            aria-expanded={navigationOpen}
            aria-controls="sidebar-nav"
            aria-label={navigationOpen
              ? "Close navigation sidebar"
              : "Open navigation sidebar"}
            title="Toggle sidebar (Ctrl+B / Cmd+B)"
          >
            <svg
              viewBox="0 0 24 24"
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              aria-hidden="true"
              ><rect x="3" y="4" width="18" height="16" rx="2" /><path
                d="M9 4v16"
              /></svg
            >
          </button>
          <nav
            aria-label="Breadcrumb"
            class="flex items-center gap-3 text-sm min-w-0"
          >
            <span class="hidden sm:inline text-muted-foreground">Workspace</span
            >
            <span
              class="hidden sm:inline text-muted-foreground"
              aria-hidden="true">/</span
            >
            <span class="truncate">{activeLabel}</span>
          </nav>
        </div>
        <div class="flex items-center gap-3 text-xs text-muted-foreground">
          {#if navigating.to}
            <span
              class="loading loading-spinner loading-xs text-primary"
              aria-hidden="true"
            ></span>
            <span role="status">Loading report</span>
          {:else}
            <span class="hidden sm:inline font-mono">WEBSITE ANALYTICS</span>
          {/if}
          {#if !desktopSidebarOpen}<ThemeToggle />{/if}
        </div>
      </header>
      <main
        id="main-content"
        class="workspace-content"
        tabindex="-1"
        aria-busy={!!navigating.to}
      >
        {@render children()}
      </main>
    </div>
  </div>
{:else}
  {@render children()}
{/if}
