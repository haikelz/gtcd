<script lang="ts">
  // Port of the shadcn base-nova CommandDialog (command + dialog recipes) on
  // Bits UI. Deviations: items reach 40px below 1024px for touch, like the
  // sidebar, and the selected item uses accent, as DropdownMenu items do,
  // because the reui.io dark popover and muted tokens are the same grey.
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { Button } from "$lib/components/ui/button";
  import { dashboardHref, t } from "$lib/display";
  import type { MessageKey } from "$lib/i18n";
  import { NATIVE_SECTIONS } from "$lib/native-admin";
  import { cn } from "$lib/utils";
  import {
    ArrowLeftRight,
    CalendarRange,
    Search,
    Settings,
  } from "@lucide/svelte";
  import { Command, Dialog } from "bits-ui";
  import { onMount } from "svelte";

  type NavigationGroup = {
    readonly items: readonly {
      /** An app pathname, as the sidebar passes it to resolve(). */
      readonly href: string;
      readonly icon: typeof Search;
      readonly label: string;
    }[];
    readonly key: string;
    readonly label: string;
    /** Report groups carry the period and filter along, as in the sidebar. */
    readonly view: boolean;
  };

  type CommandPaletteProps = {
    readonly class?: string;
    /** The sidebar's groups, so new sidebar pages appear here as well. */
    readonly groups: readonly NavigationGroup[];
  };

  let { class: className, groups }: CommandPaletteProps = $props();

  // The toolbar's period presets.
  const PERIODS = [
    ["day", "shell.unitDay"],
    ["week", "shell.unitWeek"],
    ["month", "shell.unitMonth"],
    ["quarter", "shell.unitQuarter"],
    ["half-year", "shell.unitHalfYear"],
    ["year", "shell.unitYear"],
  ] as const satisfies readonly (readonly [string, MessageKey])[];
  const PAGING_PARAMS = ["start", "end", "offset", "cursor", "exclude"];

  let open = $state(false);
  let shortcut = $state("Ctrl K");

  // ponytail: a page counts as a report when a sidebar report group links to
  // it, so Paths, which has no period, also takes the period it is given.
  // Upgrade: let pages declare their period controls through page data.
  const onReport = $derived(
    page.url.pathname.startsWith("/dashboard/reports/") ||
      groups.some(
        (group) =>
          group.view &&
          group.items.some((item) =>
            item.href === "/dashboard"
              ? page.url.pathname === item.href
              : page.url.pathname.startsWith(item.href)
          )
      )
  );
  const commandGroups = $derived.by(() => {
    const sidebarHrefs = new Set(
      groups.flatMap((group) => group.items.map((item) => item.href))
    );
    const sections = NATIVE_SECTIONS.filter(
      (section) =>
        (page.data.isAdmin || !section.admin) &&
        !sidebarHrefs.has(`/dashboard/admin/${section.id}`)
    );
    const sites: { cname?: string | null; code: string; id: number }[] =
      page.data.sites ?? [];

    return [
      ...groups.map((group) => ({
        items: group.items.map((item) => ({
          ...item,
          // ponytail: skips resolve(), whose types reject a union of this
          // many routes; it would return the pathname unchanged while
          // kit.paths.base stays unset. Resolve here once a base path is set.
          href: dashboardHref(item.href, { view: group.view }),
        })),
        key: group.key,
        label: group.label,
      })),
      {
        items: sections.map((section) => ({
          href: dashboardHref(
            resolve("/dashboard/admin/[section]", { section: section.id })
          ),
          icon: Settings,
          label: t(section.title),
        })),
        key: "native-admin",
        label: t("admin.title"),
      },
      {
        items: PERIODS.map(([range, unit]) => ({
          href: periodHref(range),
          icon: CalendarRange,
          label: t("shell.lastUnit", { period: t(unit) }),
        })),
        key: "period",
        label: t("tools.palettePeriod"),
      },
      {
        items: sites
          .filter((site) => site.id !== page.data.site?.id)
          .map((site) => ({
            href: `${resolve("/dashboard")}?site=${site.id}`,
            icon: ArrowLeftRight,
            label: site.cname || site.code,
          })),
        key: "sites",
        label: t("tools.paletteSites"),
      },
    ].filter((group) => group.items.length > 0);
  });

  function periodHref(range: string): string {
    const url = new URL(
      onReport ? `${page.url.pathname}${page.url.search}` : "/dashboard",
      page.url
    );
    for (const key of PAGING_PARAMS) url.searchParams.delete(key);
    url.searchParams.set("range", range);

    return dashboardHref(`${url.pathname}${url.search}`);
  }

  // Ctrl/Cmd+K stays with a text field the user is typing in.
  function isTyping(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        target.matches(
          "textarea, input:not([type=checkbox], [type=radio], [type=button], [type=submit], [type=reset])"
        ))
    );
  }

  function handleShortcut(event: KeyboardEvent) {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k")
      return;
    if (!open && isTyping(event.target)) return;

    event.preventDefault();
    open = !open;
  }

  onMount(() => {
    if (/Mac|iPhone|iPad/.test(navigator.userAgent)) shortcut = "⌘K";
  });
</script>

<svelte:document onkeydown={handleShortcut} />

<Dialog.Root bind:open>
  <Dialog.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        aria-keyshortcuts="Control+K Meta+K"
        aria-label={t("tools.paletteLabel")}
        class={cn("text-muted-foreground", className)}
        size="sm"
        variant="outline"
      >
        <Search />
        <span class="hidden sm:inline">{t("tools.paletteButton")}</span>
        <kbd
          aria-hidden="true"
          class="hidden h-5 items-center rounded-sm border border-border bg-muted px-1 font-sans text-xs md:inline-flex"
          >{shortcut}</kbd
        >
      </Button>
    {/snippet}
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay
      class="fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
    />
    <Dialog.Content
      class="fixed top-1/3 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 translate-y-0 gap-4 overflow-hidden rounded-xl! bg-popover p-0 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
      data-slot="dialog-content"
    >
      <Dialog.Title class="sr-only">{t("tools.paletteTitle")}</Dialog.Title>
      <Dialog.Description class="sr-only"
        >{t("tools.paletteDescription")}</Dialog.Description
      >
      <Command.Root
        class="flex size-full flex-col overflow-hidden rounded-xl! bg-popover p-1 text-popover-foreground"
        data-slot="command"
        label={t("tools.paletteLabel")}
      >
        <div class="p-1 pb-0" data-slot="command-input-wrapper">
          <div
            class="flex h-8 items-center gap-2 rounded-lg border border-input/30 bg-input/30 pl-2 has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/50"
          >
            <Search aria-hidden="true" class="size-4 shrink-0 opacity-50" />
            <Command.Input
              class="h-full w-full bg-transparent pr-2 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              data-slot="command-input"
              placeholder={t("tools.palettePlaceholder")}
            />
          </div>
        </div>
        <Command.List
          aria-label={t("tools.paletteTitle")}
          class="max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none"
          data-slot="command-list"
        >
          <!-- The viewport gives the input its aria-controls target. -->
          <Command.Viewport>
            <Command.Empty
              class="py-6 text-center text-sm"
              data-slot="command-empty">{t("tools.paletteEmpty")}</Command.Empty
            >
            {#each commandGroups as group (group.key)}
              <Command.Group
                class="overflow-hidden p-1 text-foreground"
                data-slot="command-group"
                value={group.key}
              >
                <Command.GroupHeading
                  class="px-2 py-1.5 text-xs font-medium text-muted-foreground"
                  >{group.label}</Command.GroupHeading
                >
                <Command.GroupItems>
                  {#each group.items as item (item.href)}
                    <Command.LinkItem
                      class="group/command-item relative flex cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-selected:bg-accent data-selected:text-accent-foreground max-lg:min-h-10 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-selected:*:[svg]:text-accent-foreground"
                      data-slot="command-item"
                      href={item.href}
                      keywords={[group.label]}
                      onSelect={() => (open = false)}
                      value="{item.label} / {group.label}"
                    >
                      <item.icon aria-hidden="true" />
                      {item.label}
                    </Command.LinkItem>
                  {/each}
                </Command.GroupItems>
              </Command.Group>
            {/each}
          </Command.Viewport>
        </Command.List>
      </Command.Root>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
