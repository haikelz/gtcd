<script lang="ts">
  import type { HitStat } from "$lib/types";

  let {
    data,
    maxItems = 15,
    onItemClick,
  }: {
    data: HitStat[];
    maxItems?: number;
    onItemClick?: (id: string, name: string) => void;
  } = $props();

  const items = $derived(data.slice(0, maxItems));
  const maxCount = $derived(Math.max(...items.map((d) => d.count), 1));
  const total = $derived(data.reduce((sum, d) => sum + d.count, 0));
</script>

<ul class="list-none p-0 m-0 space-y-1" aria-label="Breakdown chart">
  {#each items as item, i}
    {@const label = item.name?.trim() ? item.name.trim() : "Unknown"}
    {@const pct = Math.max(Math.min((item.count / maxCount) * 100, 100), 0)}
    {@const share =
      total > 0 ? ((item.count / total) * 100).toFixed(1) : "0"}
    <li class="group">
      {#if onItemClick}
        <button
          type="button"
          class="w-full cursor-pointer text-left rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-base-200 focus-visible:outline-2 focus-visible:outline-primary"
          onclick={() => onItemClick(item.id, label)}
          aria-label="{label}: {item.count.toLocaleString()} visitors ({share}%)"
        >
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-sm font-medium truncate pr-3 text-foreground"
              >{label}</span
            >
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-sm font-semibold tabular-nums text-foreground"
                >{item.count.toLocaleString()}</span
              >
              <span class="text-xs tabular-nums w-10 text-right text-muted-foreground"
                >{share}%</span
              >
            </div>
          </div>
          <div
            role="meter"
            aria-valuenow={item.count}
            aria-valuemin="0"
            aria-valuemax={maxCount}
            aria-label="{label} share"
            class="w-full h-1.5 rounded-full overflow-hidden bg-base-200"
          >
            <div
              class="h-full rounded-full animate-slide-in-bar bg-primary"
              style="width: {pct}%; animation-delay: {i * 25}ms;"
            ></div>
          </div>
        </button>
      {:else}
        <div class="w-full text-left rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-base-200/50">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-sm font-medium truncate pr-3 text-foreground"
              >{label}</span
            >
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-sm font-semibold tabular-nums text-foreground"
                >{item.count.toLocaleString()}</span
              >
              <span class="text-xs tabular-nums w-10 text-right text-muted-foreground"
                >{share}%</span
              >
            </div>
          </div>
          <div
            role="meter"
            aria-valuenow={item.count}
            aria-valuemin="0"
            aria-valuemax={maxCount}
            aria-label="{label}: {item.count.toLocaleString()} visitors ({share}%)"
            class="w-full h-1.5 rounded-full overflow-hidden bg-base-200"
          >
            <div
              class="h-full rounded-full animate-slide-in-bar bg-primary"
              style="width: {pct}%; animation-delay: {i * 25}ms;"
            ></div>
          </div>
        </div>
      {/if}
    </li>
  {/each}

  {#if data.length > maxItems}
    <li class="pt-2">
      <p class="text-xs text-center font-medium text-muted-foreground">
        +{data.length - maxItems} more
      </p>
    </li>
  {/if}
</ul>
