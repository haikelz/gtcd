<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- view and customize links are resolved route paths plus serialized report query parameters. */
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { SvelteURLSearchParams } from "svelte/reactivity";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "$lib/components/ui/dropdown-menu";
  import { Frame, FrameFooter, FramePanel } from "$lib/components/ui/frame";
  import { Input } from "$lib/components/ui/input";
  import { sanitizeViewQuery } from "$lib/dashboard-layout";
  import { displayPreferences, t } from "$lib/display";
  import type { MessageKey } from "$lib/i18n";
  import { wallClockNow } from "$lib/preferences";
  import {
    ToggleGroup,
    ToggleGroupItem,
  } from "$lib/components/ui/toggle-group";
  import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "$lib/components/ui/tooltip";
  import {
    formatRangeLabel,
    groupForRange,
    moveRange,
    presetRange,
    rangeFromParams,
    toDayString,
  } from "$lib/period.js";
  import type { Group, MoveUnit } from "$lib/period.js";
  import {
    Bookmark,
    BookmarkPlus,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    CircleHelp,
    Search,
    SlidersHorizontal,
    Star,
    X,
  } from "@lucide/svelte";

  type DashboardToolbarProps = {
    readonly showFilter?: boolean;
    readonly showGroup?: boolean;
  };

  let { showFilter = false, showGroup = false }: DashboardToolbarProps =
    $props();

  const PRESETS = $derived([
    { value: "day", label: t("shell.unitDay") },
    { value: "week", label: t("shell.unitWeek") },
    { value: "month", label: t("shell.unitMonth") },
    { value: "quarter", label: t("shell.unitQuarter") },
    { value: "half-year", label: t("shell.unitHalfYear") },
    { value: "year", label: t("shell.unitYear") },
  ]);
  const UNIT_KEYS: Record<Group | MoveUnit, MessageKey> = {
    hour: "shell.unitHour",
    day: "shell.unitDay",
    week: "shell.unitWeek",
    month: "shell.unitMonth",
    year: "shell.unitYear",
  };

  const MOVE_UNITS: MoveUnit[] = ["day", "week", "month", "year"];

  const preferences = $derived(displayPreferences());
  // "Today" is the calendar day in the user's GoatCounter timezone.
  const now = $derived(wallClockNow(preferences.timezone));
  const current = $derived(rangeFromParams(page.url.searchParams, now));
  const rangeLabel = $derived(
    formatRangeLabel(
      current.start,
      current.end,
      preferences.dateFormat,
      preferences.locale
    )
  );
  const groups = $derived(
    groupForRange(
      current.start,
      current.end,
      page.url.searchParams.get("group")
    )
  );
  const filterValue = $derived(page.url.searchParams.get("filter") ?? "");

  const savedViews = $derived(page.data.dashboardLayout?.views ?? []);
  const siteParam = $derived(page.url.searchParams.get("site"));
  const customizeHref = $derived(
    siteParam
      ? `${resolve("/dashboard/customize")}?site=${siteParam}`
      : resolve("/dashboard/customize")
  );
  const saveViewHref = $derived.by(() => {
    const saved = new SvelteURLSearchParams(page.url.search);
    if (page.data.site) saved.set("site", String(page.data.site.id));
    const params = new SvelteURLSearchParams({
      from: page.url.pathname,
      save: sanitizeViewQuery(saved.toString()),
    });
    if (siteParam) params.set("site", siteParam);
    return `${resolve("/dashboard/customize")}?${params}`;
  });

  function viewHref(query: string): string {
    const params = new SvelteURLSearchParams(query);
    if (siteParam && !params.has("site")) params.set("site", siteParam);
    return `${page.url.pathname}?${params}`;
  }

  // Legacy presets that are identical to a GC preset still highlight it.
  const activePreset = $derived.by(() => {
    if (current.custom) return null;
    const alias =
      current.range === "today"
        ? "day"
        : current.range === "7d"
          ? "week"
          : current.range;
    return PRESETS.some((p) => p.value === alias) ? alias : null;
  });

  const forwardDisabled = $derived.by(() => {
    const disabled: Record<string, boolean> = {};
    for (const unit of MOVE_UNITS) {
      disabled[unit] =
        moveRange(current.start, current.end, unit, 1, now) === null;
    }
    return disabled;
  });

  let startDraft = $derived(toDayString(current.start));
  let endDraft = $derived(toDayString(current.end));
  let filterDraft = $derived(filterValue);

  const datesInvalid = $derived(
    !startDraft || !endDraft || startDraft > endDraft
  );

  function updateParams(
    mutate: (params: URLSearchParams) => void,
    resetPaging = true
  ): void {
    const params = new SvelteURLSearchParams(page.url.searchParams);
    mutate(params);
    if (resetPaging) {
      params.delete("offset");
      params.delete("exclude");
    }
    const query = params.toString();
    const target = query ? `${page.url.pathname}?${query}` : page.url.pathname;
    goto(target, {
      replaceState: true,
      keepFocus: true,
      noScroll: true,
    });
  }

  function selectPreset(value: string): void {
    // Single toggle groups emit "" when the active item is pressed again.
    if (!value) return;

    updateParams((params) => {
      params.delete("start");
      params.delete("end");
      params.set("range", value);
      if (showGroup || params.has("group")) {
        // Keep the current grouping when the new range still allows it,
        // otherwise fall back to the default for that range.
        const next = presetRange(value);
        const choice = groupForRange(next.start, next.end, params.get("group"));
        params.set("group", choice.group);
      }
    });
  }

  function applyDates(event: SubmitEvent): void {
    event.preventDefault();
    if (datesInvalid) return;
    updateParams((params) => {
      params.set("start", startDraft);
      params.set("end", endDraft);
      params.delete("range");
    });
  }

  function move(unit: MoveUnit, dir: 1 | -1): void {
    const next = moveRange(current.start, current.end, unit, dir, now);
    if (!next) return;
    updateParams((params) => {
      params.set("start", toDayString(next.start));
      params.set("end", toDayString(next.end));
      params.delete("range");
    });
  }

  function selectGroup(group: string): void {
    if (!groups.allow.includes(group as Group)) return;

    updateParams((params) => params.set("group", group), false);
  }

  function applyFilter(event: SubmitEvent): void {
    event.preventDefault();
    updateParams((params) => {
      const value = filterDraft.trim();
      if (value) params.set("filter", value);
      else params.delete("filter");
    });
  }

  function clearFilter(): void {
    filterDraft = "";
    updateParams((params) => params.delete("filter"));
  }
</script>

<section aria-label={t("shell.reportPeriodControls")} class="mb-4">
  <p class="mb-3 hidden text-sm text-muted-foreground print:block">
    {t("shell.reportFor", { range: rangeLabel })}
  </p>
  <Frame dense spacing="sm">
    <FramePanel
      class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3"
    >
      <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
        <form
          aria-label={t("shell.customDateRange")}
          class="flex flex-wrap items-center gap-1.5"
          onsubmit={applyDates}
        >
          <label class="sr-only" for="range-start">{t("shell.startDate")}</label
          >
          <Input
            bind:value={startDraft}
            class="w-36"
            id="range-start"
            name="start"
            type="date"
          />
          <span aria-hidden="true" class="text-xs text-muted-foreground"
            >{t("shell.to")}</span
          >
          <label class="sr-only" for="range-end">{t("shell.endDate")}</label>
          <Input
            bind:value={endDraft}
            class="w-36"
            id="range-end"
            name="end"
            type="date"
          />
          <Button disabled={datesInvalid} type="submit" variant="outline">
            {t("shell.apply")}
          </Button>
        </form>
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <span aria-hidden="true" class="text-xs text-muted-foreground">
            {t("shell.last")}
          </span>
          <ToggleGroup
            aria-label={t("shell.lastPeriod")}
            class="flex-wrap"
            onValueChange={selectPreset}
            size="sm"
            spacing={0}
            type="single"
            value={activePreset ?? ""}
            variant="outline"
          >
            {#each PRESETS as preset (preset.value)}
              <ToggleGroupItem
                aria-label={t("shell.lastUnit", { period: preset.label })}
                value={preset.value}
              >
                {preset.label}
              </ToggleGroupItem>
            {/each}
          </ToggleGroup>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
        {#if showFilter}
          <form
            aria-label={t("shell.filterPaths")}
            class="flex flex-wrap items-center gap-1.5"
            onsubmit={applyFilter}
          >
            <label class="sr-only" for="filter-paths"
              >{t("shell.filterPaths")}</label
            >
            <div class="relative">
              <Search
                aria-hidden="true"
                class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                autocomplete="off"
                bind:value={filterDraft}
                class="w-44 pl-8 sm:w-56"
                id="filter-paths"
                maxlength={200}
                name="filter"
                placeholder={t("shell.filterPaths")}
              />
            </div>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger
                  aria-label={t("shell.filterSyntaxHelp")}
                  class={buttonVariants({ size: "icon", variant: "ghost" })}
                >
                  <CircleHelp class="text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent class="max-w-72" side="bottom" sideOffset={6}>
                  <div class="space-y-1.5 text-left">
                    <p>{t("shell.filterHelpIntro")}</p>
                    <ul class="list-disc space-y-0.5 pl-4">
                      <li>
                        {@render code("at:start")}, {@render code("at:end")} —
                        {t("shell.filterHelpAt")}
                      </li>
                      <li>
                        {@render code("in:path")}, {@render code("in:title")} —
                        {t("shell.filterHelpIn")}
                      </li>
                      <li>
                        {@render code("is:event")}, {@render code(
                          "is:pageview"
                        )} — {t("shell.filterHelpIs")}
                      </li>
                      <li>
                        {@render code(":not")} — {t("shell.filterHelpNot")}
                      </li>
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {#if filterValue}
              <Button
                aria-label={t("shell.clearFilter")}
                onclick={clearFilter}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X />
              </Button>
            {/if}
            <Button type="submit" variant="outline">{t("shell.filter")}</Button>
          </form>
        {/if}
        {#if showGroup}
          <div class="flex items-center gap-2">
            <span aria-hidden="true" class="text-xs text-muted-foreground">
              {t("shell.viewBy")}
            </span>
            <ToggleGroup
              aria-label={t("shell.viewBy")}
              onValueChange={selectGroup}
              size="sm"
              spacing={0}
              type="single"
              value={groups.group}
              variant="outline"
            >
              {#each groups.allow as group (group)}
                <ToggleGroupItem
                  aria-label={t("shell.viewByUnit", {
                    unit: t(UNIT_KEYS[group]),
                  })}
                  value={group}
                >
                  {t(UNIT_KEYS[group])}
                </ToggleGroupItem>
              {/each}
            </ToggleGroup>
          </div>
        {/if}
        {#if page.data.dashboardLayout}
          <DropdownMenu>
            <DropdownMenuTrigger>
              {#snippet child({ props })}
                <Button {...props} variant="outline">
                  <Bookmark />
                  {t("shell.views")}
                  <ChevronDown class="text-muted-foreground" />
                </Button>
              {/snippet}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-60">
              {#if savedViews.length}
                <DropdownMenuLabel>{t("shell.savedViews")}</DropdownMenuLabel>
                {#each savedViews as view (view.name)}
                  <DropdownMenuItem>
                    {#snippet child({ props })}
                      <a {...props} href={viewHref(view.query)}>
                        <span class="truncate">{view.name}</span>
                        {#if view.name === page.data.dashboardLayout?.defaultView}
                          <Star
                            class="ml-auto fill-current text-muted-foreground"
                          />
                        {/if}
                      </a>
                    {/snippet}
                  </DropdownMenuItem>
                {/each}
                <DropdownMenuSeparator />
              {/if}
              <DropdownMenuItem>
                {#snippet child({ props })}
                  <a {...props} href={saveViewHref}>
                    <BookmarkPlus />
                    {t("shell.saveCurrentView")}
                  </a>
                {/snippet}
              </DropdownMenuItem>
              <DropdownMenuItem>
                {#snippet child({ props })}
                  <a {...props} href={customizeHref}>
                    <SlidersHorizontal />
                    {t("shell.manageViews")}
                  </a>
                {/snippet}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        {/if}
      </div>
    </FramePanel>
    <FrameFooter
      class="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2"
    >
      <nav
        aria-label={t("shell.movePeriodBack")}
        class="flex items-center gap-0.5 max-sm:w-full max-sm:justify-between"
      >
        {#each MOVE_UNITS as unit (unit)}
          <Button
            aria-label={t("shell.backOne", { unit: t(UNIT_KEYS[unit]) })}
            onclick={() => move(unit, -1)}
            size="xs"
            variant="ghost"
          >
            <ChevronLeft aria-hidden="true" />
            {t(UNIT_KEYS[unit])}
          </Button>
        {/each}
      </nav>
      <p
        aria-live="polite"
        class="text-sm font-medium text-foreground tabular-nums max-sm:order-first max-sm:basis-full"
      >
        {rangeLabel}
      </p>
      <nav
        aria-label={t("shell.movePeriodForward")}
        class="flex items-center gap-0.5 max-sm:w-full max-sm:justify-between"
      >
        {#each MOVE_UNITS as unit (unit)}
          <Button
            aria-label={t("shell.forwardOne", { unit: t(UNIT_KEYS[unit]) })}
            disabled={forwardDisabled[unit]}
            onclick={() => move(unit, 1)}
            size="xs"
            variant="ghost"
          >
            {t(UNIT_KEYS[unit])}
            <ChevronRight aria-hidden="true" />
          </Button>
        {/each}
      </nav>
    </FrameFooter>
  </Frame>
</section>

{#snippet code(value: string)}
  <code class="rounded-sm bg-background/15 px-1 font-mono">{value}</code>
{/snippet}
