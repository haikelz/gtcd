<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- links are resolved from generated route IDs before preserving selected-site query state. */
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { navigating, page } from "$app/state";
  import Brand from "$lib/components/Brand.svelte";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import ToastStack from "$lib/components/ToastStack.svelte";
  import { showToast } from "$lib/components/toast.js";
  import { Button } from "$lib/components/ui/button";
  import {
    NativeSelect,
    NativeSelectOption,
  } from "$lib/components/ui/native-select";
  import { Separator } from "$lib/components/ui/separator";
  import { t } from "$lib/display";
  import { cn } from "$lib/utils";
  import {
    ChevronRight,
    FileText,
    FolderTree,
    FolderCog,
    Globe,
    Languages,
    LayoutGrid,
    Link2,
    LogOut,
    MapPin,
    Megaphone,
    Monitor,
    PanelLeft,
    Smartphone,
    Settings,
    X,
  } from "@lucide/svelte";
  import { onMount, tick } from "svelte";
  import "../app.css";

  let { children, data } = $props();
  let signingOut = $state(false);
  let sidebarOpen = $state(false);
  let desktopSidebarOpen = $state(true);
  let wideViewport = $state(false);
  let sidebarElement: HTMLElement | undefined = $state();
  let toggleElement: HTMLElement | null = $state(null);
  const navigationOpen = $derived(
    wideViewport ? desktopSidebarOpen : sidebarOpen
  );
  const isDashboard = $derived(
    page.url.pathname.startsWith("/dashboard") && page.status <= 400
  );
  const NAV_GROUPS = $derived([
    {
      key: "workspace",
      label: t("shell.navWorkspace"),
      items: [
        { href: "/dashboard", icon: LayoutGrid, label: t("shell.navOverview") },
        {
          href: "/dashboard/pages",
          icon: FileText,
          label: t("shell.navPages"),
        },
        {
          href: "/dashboard/paths",
          icon: FolderTree,
          label: t("shell.navPathDirectory"),
        },
      ],
    },
    {
      key: "audience",
      label: t("shell.navAudience"),
      items: [
        {
          href: "/dashboard/browsers",
          icon: Globe,
          label: t("shell.navBrowsers"),
        },
        {
          href: "/dashboard/systems",
          icon: Monitor,
          label: t("shell.navSystems"),
        },
        {
          href: "/dashboard/locations",
          icon: MapPin,
          label: t("shell.navLocations"),
        },
        {
          href: "/dashboard/languages",
          icon: Languages,
          label: t("shell.navLanguages"),
        },
        {
          href: "/dashboard/devices",
          icon: Smartphone,
          label: t("shell.navDevices"),
        },
      ],
    },
    {
      key: "acquisition",
      label: t("shell.navAcquisition"),
      items: [
        {
          href: "/dashboard/campaigns",
          icon: Megaphone,
          label: t("shell.navCampaigns"),
        },
        {
          href: "/dashboard/referrers",
          icon: Link2,
          label: t("shell.navReferrers"),
        },
      ],
    },
  ] as const);
  const ADMIN_GROUP = $derived({
    key: "manage",
    label: t("shell.navManage"),
    items: [
      {
        href: "/dashboard/settings",
        icon: Settings,
        label: t("shell.navSettings"),
      },
      {
        href: "/dashboard/exports",
        icon: FolderCog,
        label: t("shell.navExports"),
      },
      {
        href: "/dashboard/diagnostics",
        icon: Monitor,
        label: t("diagnostics.title"),
      },
      {
        href: "/dashboard/admin/users",
        icon: Settings,
        label: "Administration",
      },
    ],
  } as const);
  const ACCOUNT_GROUP = {
    key: "account",
    label: "Account",
    items: [
      {
        href: "/dashboard/admin/security",
        icon: Settings,
        label: "Account security",
      },
    ],
  } as const;
  type NavItem =
    | (typeof NAV_GROUPS)[number]["items"][number]
    | (typeof ADMIN_GROUP)["items"][number]
    | (typeof ACCOUNT_GROUP)["items"][number];
  type NavGroup = {
    readonly items: readonly NavItem[];
    readonly key: string;
    readonly label: string;
  };

  const navGroups: readonly NavGroup[] = $derived(
    data.isAdmin ? [...NAV_GROUPS, ADMIN_GROUP] : [...NAV_GROUPS, ACCOUNT_GROUP]
  );
  const activeLabel = $derived(
    page.url.pathname.startsWith("/dashboard/reports/")
      ? t("shell.reportDetail")
      : page.url.pathname.startsWith("/dashboard/customize")
        ? t("shell.customize")
        : (navGroups
            .flatMap((group) => group.items)
            .find((item) => isActive(item.href))?.label ??
          t("shell.navOverview"))
  );

  function isActive(href: string): boolean {
    if (href.startsWith("/dashboard/admin/")) {
      return page.url.pathname.startsWith("/dashboard/admin/");
    }
    return href === "/dashboard"
      ? page.url.pathname === href
      : page.url.pathname.startsWith(href);
  }

  function dashboardHref(href: string): string {
    if (!isDashboard || !page.data.site) return href;

    const url = new URL(href, page.url.origin);
    url.searchParams.set("site", String(page.data.site.id));
    return `${url.pathname}${url.search}`;
  }

  function switchSite(event: Event & { currentTarget: HTMLSelectElement }) {
    const url = new URL("/dashboard", page.url.origin);
    url.searchParams.set("site", event.currentTarget.value);
    goto(resolve("/dashboard") + url.search);
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
    if ("serviceWorker" in navigator) {
      void import("virtual:pwa-register")
        .then(({ registerSW }) => {
          registerSW({ immediate: true });
        })
        .catch(() => {
          // Offline asset caching is optional; never block the dashboard.
        });
    }
  });

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
    if (signingOut) return;
    signingOut = true;
    try {
      const response = await fetch("/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout request failed");
      await goto(resolve("/login"), {
        invalidateAll: true,
        replaceState: true,
      });
    } catch {
      showToast(t("shell.signOutFailed"), "error");
    } finally {
      signingOut = false;
    }
  }
</script>

<a
  class="fixed top-3 left-3 z-50 inline-flex h-8 -translate-y-[200%] items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground focus:translate-y-0"
  href="#main-content">{t("shell.skipToContent")}</a
>

{#if navigating.to}
  <div
    aria-hidden="true"
    class="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-primary/10"
  >
    <div class="nav-progress h-full w-1/3 bg-primary"></div>
  </div>
{/if}

{#if isDashboard && data.authenticated}
  <div class="flex min-h-dvh bg-background">
    {#if sidebarOpen && !wideViewport}
      <!-- Existing responsive sidebar backdrop, not a modal/dialog overlay. -->
      <button
        aria-label={t("shell.closeNavigationOverlay")}
        class="fixed inset-0 z-30 bg-black/10 supports-backdrop-filter:backdrop-blur-xs lg:hidden"
        onclick={dismissSidebar}
        tabindex="-1"
        type="button"
      ></button>
    {/if}
    <aside
      bind:this={sidebarElement}
      aria-label={t("shell.analyticsNavigation")}
      aria-modal={sidebarOpen && !wideViewport ? true : undefined}
      class={cn(
        "fixed top-0 left-0 z-40 flex h-dvh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:sticky",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        desktopSidebarOpen
          ? "lg:translate-x-0"
          : "lg:invisible lg:w-0 lg:overflow-hidden"
      )}
      id="sidebar-nav"
      inert={!navigationOpen}
      role={sidebarOpen && !wideViewport ? "dialog" : undefined}
    >
      <div class="flex h-12 shrink-0 items-center justify-between gap-2 px-4">
        <Brand />
        <Button
          aria-label={t("shell.closeNavigation")}
          class="lg:hidden"
          onclick={dismissSidebar}
          size="icon-sm"
          title={t("shell.closeNavigation")}
          variant="ghost"><X /></Button
        >
      </div>
      <nav
        aria-label={t("shell.reports")}
        class="flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        {#each navGroups as group (group.key)}
          <section
            aria-labelledby="nav-{group.key}"
            class="relative flex w-full min-w-0 flex-col p-2"
          >
            <h2
              class="flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70"
              id="nav-{group.key}"
            >
              {group.label}
            </h2>
            <ul class="flex w-full min-w-0 flex-col gap-0.5">
              {#each group.items as item (item.href)}
                <li class="relative">
                  <a
                    aria-current={isActive(item.href) ? "page" : undefined}
                    class="flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm ring-sidebar-ring outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-sidebar-accent-foreground max-lg:h-10 [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate"
                    href={dashboardHref(resolve(item.href))}
                    onclick={closeSidebar}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </a>
                </li>
              {/each}
            </ul>
          </section>
        {/each}
      </nav>
      <div class="flex items-center gap-1 border-t border-sidebar-border p-2">
        <div class="min-w-0 flex-1">
          <ThemeToggle block up />
        </div>
        <Button
          aria-label={t("shell.signOut")}
          disabled={signingOut}
          onclick={handleLogout}
          size="icon-sm"
          title={t("shell.signOut")}
          variant="ghost"
        >
          <LogOut />
        </Button>
      </div>
    </aside>
    <div
      class="flex min-w-0 flex-1 flex-col"
      inert={sidebarOpen && !wideViewport}
    >
      <header
        class="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] supports-backdrop-filter:bg-background/80 supports-backdrop-filter:backdrop-blur-sm lg:px-6"
      >
        <Button
          bind:ref={toggleElement}
          aria-controls="sidebar-nav"
          aria-expanded={navigationOpen}
          aria-label={navigationOpen
            ? t("shell.closeSidebar")
            : t("shell.openSidebar")}
          class="-ml-1"
          onclick={toggleSidebar}
          size="icon-sm"
          title={t("shell.toggleSidebar")}
          variant="ghost"
        >
          <PanelLeft />
        </Button>
        <Separator class="mx-1 h-4!" orientation="vertical" />
        <nav aria-label={t("shell.breadcrumb")} class="min-w-0">
          <ol
            class="flex flex-wrap items-center gap-1.5 text-sm wrap-break-word text-muted-foreground"
          >
            <li class="hidden items-center gap-1 sm:inline-flex">
              {t("shell.navWorkspace")}
            </li>
            <li
              aria-hidden="true"
              class="hidden sm:block [&>svg]:size-3.5"
              role="presentation"
            >
              <ChevronRight />
            </li>
            <li class="inline-flex min-w-0 items-center gap-1">
              <span
                aria-current="page"
                class="truncate font-normal text-foreground">{activeLabel}</span
              >
            </li>
          </ol>
        </nav>
        {#if page.data.sites?.length > 1}
          <label class="sr-only" for="dashboard-site"
            >{t("shell.analyticsSite")}</label
          >
          <NativeSelect
            class="ml-auto max-w-44"
            id="dashboard-site"
            onchange={switchSite}
            size="sm"
            value={String(page.data.site.id)}
          >
            {#each page.data.sites as site (site.id)}
              <NativeSelectOption value={String(site.id)}
                >{site.cname || site.code}</NativeSelectOption
              >
            {/each}
          </NativeSelect>
        {/if}
      </header>
      <main
        aria-busy={!!navigating.to}
        class="mx-auto w-full max-w-[96rem] pt-6 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] lg:px-6 lg:pt-6 lg:pb-10"
        id="main-content"
        tabindex="-1"
      >
        {#key page.url.pathname}
          <div class="app-page">{@render children()}</div>
        {/key}
      </main>
    </div>
  </div>
{:else}
  {#key page.url.pathname}
    <div class="app-page">{@render children()}</div>
  {/key}
{/if}

<ToastStack />
