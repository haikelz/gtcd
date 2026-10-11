<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- the row href is
     resolved by the caller before it is passed in, and the "Go to path" href
     is an external live-site URL, which resolve() must not touch. */
  import { page } from "$app/state";
  import { highlightSegments } from "$lib/filter.js";
  import { formatCount } from "$lib/display";
  import type { HighlightSegment } from "$lib/filter.js";
  import type { Group } from "$lib/period.js";
  import { Badge } from "$lib/components/ui/badge";
  import SparkLine from "$lib/components/SparkLine.svelte";
  import type { HitList } from "$lib/types";

  type PageRowProps = {
    readonly chart?: boolean;
    /** undefined: no diff column; null: no previous-period data → "(new)". */
    readonly diff?: number | null;
    readonly group?: Group;
    readonly hit: HitList;
    readonly href: string;
    readonly linkDomain?: string;
    readonly rank?: number;
    readonly scaleMax?: number;
  };

  let {
    chart = true,
    diff,
    group = "day",
    hit,
    href,
    linkDomain,
    rank,
    scaleMax,
  }: PageRowProps = $props();

  const filterQuery = $derived(page.url.searchParams.get("filter") ?? "");
  const pathSegs = $derived(
    highlightSegments(filterQuery, hit.path, "path") as HighlightSegment[]
  );
  const titleSegs = $derived(
    hit.title && hit.title !== hit.path
      ? (highlightSegments(
          filterQuery,
          hit.title,
          "title"
        ) as HighlightSegment[])
      : null
  );
  const goHref = $derived.by(() => {
    if (!linkDomain || hit.event) return null;
    const base = /^https?:\/\//i.test(linkDomain)
      ? linkDomain
      : `http://${linkDomain}`;
    const path = hit.path.startsWith("/") ? hit.path : `/${hit.path}`;
    return `${base.replace(/\/+$/, "")}${path}`;
  });
  const diffDisplay = $derived.by(() => {
    if (diff === undefined) return null;
    if (diff === null) {
      return { text: "(new)", className: "text-muted-foreground italic" };
    }
    if (diff === 0) {
      return { text: "0%", className: "text-muted-foreground" };
    }
    const magnitude = Math.max(Math.round(Math.abs(diff)), 1);
    return diff > 0
      ? {
          text: `+${magnitude}%`,
          className: "text-success-foreground dark:text-success",
        }
      : {
          text: `–${magnitude}%`,
          className: "text-destructive-foreground dark:text-destructive",
        };
  });
</script>

<li class="border-b border-border last:border-0">
  <a
    class="group flex min-h-11 items-center justify-between gap-3 rounded-md px-2 py-2.5 no-underline transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    {href}
  >
    <span class="flex min-w-0 flex-1 items-center gap-2.5">
      {#if rank !== undefined}
        <span
          aria-hidden="true"
          class="w-6 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums"
          >{String(rank).padStart(2, "0")}</span
        >
      {/if}
      <span class="min-w-0">
        <span class="flex min-w-0 items-center gap-1.5">
          <span class="min-w-0 truncate font-mono text-sm font-medium">
            {#each pathSegs as seg, i (i)}{#if seg.match}<b
                  class="rounded-xs bg-chart-1/15 font-semibold">{seg.text}</b
                >{:else}{seg.text}{/if}{/each}
          </span>
          {#if hit.event}
            <Badge size="sm" variant="outline">event</Badge>
          {/if}
        </span>
        {#if titleSegs}
          <span class="block truncate text-xs text-muted-foreground">
            {#each titleSegs as seg, i (i)}{#if seg.match}<b
                  class="font-semibold text-foreground">{seg.text}</b
                >{:else}{seg.text}{/if}{/each}
          </span>
        {/if}
      </span>
    </span>
    {#if chart}
      <SparkLine
        class="hidden md:block"
        data={hit.stats}
        {group}
        max={scaleMax}
      />
    {/if}
    <span class="shrink-0 text-right">
      <span class="block text-sm font-medium text-foreground tabular-nums"
        >{formatCount(hit.count)}</span
      >
      {#if diffDisplay}
        <span
          class="block text-xs font-medium tabular-nums {diffDisplay.className}"
          title="Change compared to previous period">{diffDisplay.text}</span
        >
      {/if}
    </span>
  </a>
  {#if goHref}
    <div class="px-2 pt-0.5 pb-2">
      <a
        class="inline-block max-w-full truncate text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        href={goHref}
        rel="noopener noreferrer"
        target="_blank"
      >
        Go to {goHref.replace(/^https?:\/\//i, "")}
      </a>
    </div>
  {/if}
</li>
