<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { navigating, page } from "$app/state";
  import Brand from "$lib/components/Brand.svelte";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import {
    FileText,
    FolderCog,
    Globe,
    Languages,
    LayoutGrid,
    Link2,
    LogOut,
    MapPin,
    Megaphone,
    Menu,
    Monitor,
    Smartphone,
    Settings,
    X,
  } from "@lucide/svelte";
  import { onMount, tick } from "svelte";
  import "../app.css";

  let { children, data } = $props();
  let sidebarOpen = $state(false);
  let desktopSidebarOpen = $state(true);
  let wideViewport = $state(false);
  let sidebarElement: HTMLElement | undefined = $state();
  let toggleElement: HTMLButtonElement | undefined = $state();
  const navigationOpen = $derived(
    wideViewport ? desktopSidebarOpen : sidebarOpen
  );
  const isDashboard = $derived(
    page.url.pathname.startsWith("/dashboard") && page.status < 400
  );
  const navItems = [
    {
      label: "Overview",
      href: "/dashboard",
      icon: LayoutGrid,
    },
    {
      label: "Pages",
      href: "/dashboard/pages",
      icon: FileText,
    },
    {
      label: "Browsers",
      href: "/dashboard/browsers",
      icon: Globe,
    },
    {
      label: "Systems",
      href: "/dashboard/systems",
      icon: Monitor,
    },
    {
      label: "Locations",
      href: "/dashboard/locations",
      icon: MapPin,
    },
    {
      label: "Languages",
      href: "/dashboard/languages",
      icon: Languages,
    },
    {
      label: "Devices",
      href: "/dashboard/devices",
      icon: Smartphone,
    },
    {
      label: "Campaigns",
      href: "/dashboard/campaigns",
      icon: Megaphone,
    },
    {
      label: "Referrers",
      href: "/dashboard/referrers",
      icon: Link2,
    },
  ] as const;
  const activeLabel = $derived(
    page.url.pathname === "/dashboard/settings"
      ? "Settings"
      : page.url.pathname === "/dashboard/exports"
        ? "Exports"
        : (navItems.find((item) => isActive(item.href))?.label ?? "Overview")
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
        'a[href], button:not([disabled]):not([tabindex="-1"])'
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
    goto(resolve("/login"));
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
          aria-label="Close navigation"><X class="h-4 w-4" /></button
        >
      </div>
      <nav class="flex-1 min-h-0 overflow-y-auto p-3 pt-6" aria-label="Reports">
        <ul class="list-none p-0 m-0 space-y-1">
          {#each navItems as item, i (item.href)}
            {@const Icon = item.icon}
            <li>
              {#if i === 0 || i === 2 || i === 7}
                <p
                  class="sidebar-section-label px-3 pb-2 {i > 0 ? 'pt-5' : ''}"
                >
                  {i === 0 ? "Workspace" : i === 2 ? "Audience" : "Acquisition"}
                </p>
              {/if}
              <a
                href={resolve(item.href)}
                class="sidebar-link {isActive(item.href) ? 'active' : ''}"
                aria-current={isActive(item.href) ? "page" : undefined}
                onclick={closeSidebar}
              >
                <Icon class="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>{item.label}</span>
              </a>
            </li>
          {/each}
          {#if data.isAdmin}
            <li>
              <p class="sidebar-section-label px-3 pb-2 pt-5">Manage</p>
              <a
                href={resolve("/dashboard/settings")}
                class="sidebar-link {isActive('/dashboard/settings')
                  ? 'active'
                  : ''}"
                aria-current={isActive("/dashboard/settings")
                  ? "page"
                  : undefined}
                onclick={closeSidebar}
              >
                <Settings class="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>Settings</span>
              </a>
              <a
                href={resolve("/dashboard/exports")}
                class="sidebar-link {isActive('/dashboard/exports')
                  ? 'active'
                  : ''}"
                aria-current={isActive("/dashboard/exports")
                  ? "page"
                  : undefined}
                onclick={closeSidebar}
              >
                <FolderCog class="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>Exports</span>
              </a>
            </li>
          {/if}
        </ul>
      </nav>
      <div class="border-t border-border p-3 flex items-center gap-2">
        <div class="flex-1 min-w-0">
          <ThemeToggle block up />
        </div>
        <button
          type="button"
          class="btn btn-ghost btn-square btn-sm text-muted-foreground hover:text-foreground"
          onclick={handleLogout}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut class="h-4 w-4" />
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
            <Menu class="h-5 w-5" strokeWidth={1.5} />
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
