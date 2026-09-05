<script lang="ts">
  import type { HitStat } from "$lib/types";

  let {
    data,
    maxItems = 15,
    label = "Source",
    onItemClick,
  }: {
    data: HitStat[];
    maxItems?: number;
    label?: string;
    onItemClick?: (id: string, name: string) => void;
  } = $props();

  const items = $derived(data.slice(0, maxItems));
  const maxCount = $derived(Math.max(...items.map((item) => item.count), 1));
  const total = $derived(data.reduce((sum, item) => sum + item.count, 0));
</script>

<div class="flex justify-between border-b border-border pb-3 mb-2 text-xs text-muted-foreground" aria-hidden="true">
  <span>{label}</span>
  <span>Visitors <span class="inline-block w-16 text-right">Share</span></span>
</div>
<ul class="list-none p-0 m-0" aria-label="Breakdown chart">
  {#each items as item}
    {@const label = item.name?.trim() || "Unknown"}
    {@const pct = Math.max(0, Math.min((item.count / maxCount) * 100, 100))}
    {@const share = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0"}
    {#snippet row()}
      <div class="flex items-center justify-between gap-3 mb-2">
        <span class="text-sm truncate text-foreground" title={label}>{label}</span>
        <span class="flex shrink-0 gap-4 font-mono text-xs tabular-nums">
          <span class="text-foreground">{item.count.toLocaleString()}</span>
          <span class="w-12 text-right text-muted-foreground">{share}%</span>
        </span>
      </div>
      <div
        role="meter"
        aria-valuenow={item.count}
        aria-valuemin="0"
        aria-valuemax={maxCount}
        aria-label="{label}: {item.count.toLocaleString()} visitors ({share}%)"
        class="h-1 overflow-hidden rounded-sm bg-base-200"
      >
        <div class="h-full bg-primary/65 rounded-sm" style:width="{pct}%"></div>
      </div>
    {/snippet}
    <li class="border-b border-border last:border-0">
      {#if onItemClick}
        <button
          type="button"
          class="w-full min-w-0 cursor-pointer text-left px-1 py-3 hover:bg-base-200 transition-colors"
          onclick={() => onItemClick(item.id, label)}
          aria-label="Explore {label}: {item.count.toLocaleString()} visitors ({share}%)"
        >
          {@render row()}
        </button>
      {:else}
        <div class="min-w-0 px-1 py-3">{@render row()}</div>
      {/if}
    </li>
  {/each}
  {#if data.length > maxItems}
    <li class="pt-4 text-xs text-muted-foreground">
      Showing {maxItems} of {data.length} sources
    </li>
  {/if}
</ul>
