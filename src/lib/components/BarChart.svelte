<script lang="ts">
  import type { HitStat } from "$lib/types";
  import { formatCount, numbersHidden, t } from "$lib/display";

  let {
    data,
    maxItems = 15,
    label = t("charts.defaultBreakdownLabel"),
    tone = "chart-1",
    onItemClick,
  }: {
    data: HitStat[];
    maxItems?: number;
    label?: string;
    tone?: "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5";
    onItemClick?: (id: string, name: string) => void;
  } = $props();

  const items = $derived(data.slice(0, maxItems));
  const maxCount = $derived(Math.max(...items.map((item) => item.count), 1));
  const total = $derived(data.reduce((sum, item) => sum + item.count, 0));
  const barColor = $derived(`var(--${tone})`);
</script>

<div
  class="flex justify-between border-b border-border pb-3 mb-2 text-xs text-muted-foreground"
  aria-hidden="true"
>
  <span>{label}</span>
  <span
    >{#if !numbersHidden()}{t("charts.visits")}{/if}
    <span class="inline-block w-16 text-right">{t("charts.share")}</span></span
  >
</div>
<ul class="list-none p-0 m-0" aria-label={t("charts.breakdownChart")}>
  {#each items as item, index (index)}
    {@const label = item.name?.trim() || t("charts.unknown")}
    {@const pct = Math.max(0, Math.min((item.count / maxCount) * 100, 100))}
    {@const share = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0"}
    {#snippet row()}
      <div class="flex items-center justify-between gap-3 mb-2">
        <span class="text-sm truncate text-foreground" title={label}
          >{label}</span
        >
        <span class="flex shrink-0 gap-4 font-mono text-xs tabular-nums">
          {#if !numbersHidden()}
            <span class="text-foreground">{formatCount(item.count)}</span>
          {/if}
          <span class="w-12 text-right text-muted-foreground">{share}%</span>
        </span>
      </div>
      <div
        role="meter"
        aria-valuenow={item.count}
        aria-valuemin="0"
        aria-valuemax={maxCount}
        aria-label={numbersHidden()
          ? `${label}: ${share}%`
          : t("charts.itemVisits", {
              label,
              count: formatCount(item.count),
              share,
            })}
        class="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          class="h-full rounded-full"
          style:background={barColor}
          style:width="{pct}%"
        ></div>
      </div>
    {/snippet}
    <li class="border-b border-border last:border-0">
      {#if onItemClick}
        <button
          type="button"
          class="w-full min-w-0 cursor-pointer text-left px-1.5 py-3 rounded-lg hover:bg-muted transition-colors"
          onclick={() => onItemClick(item.id, label)}
          aria-label={numbersHidden()
            ? t("charts.exploreItemHidden", { label, share })
            : t("charts.exploreItem", {
                label,
                count: formatCount(item.count),
                share,
              })}
        >
          {@render row()}
        </button>
      {:else}
        <div class="min-w-0 px-1.5 py-3">{@render row()}</div>
      {/if}
    </li>
  {/each}
  {#if data.length > maxItems}
    <li class="pt-4 text-xs text-muted-foreground">
      {t("charts.showingSources", { shown: maxItems, total: data.length })}
    </li>
  {/if}
</ul>
