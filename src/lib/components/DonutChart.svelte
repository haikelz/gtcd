<script lang="ts">
  import type { HitStat } from "$lib/types";

  let { data, label = "Browser" }: { data: HitStat[]; label?: string } =
    $props();

  const total = $derived(
    data.reduce((sum, category) => sum + category.count, 0)
  );
  const segments = $derived.by(() => {
    const ranked = [...data]
      .filter((category) => category.count > 0)
      .sort((a, b) => b.count - a.count);
    const visible = ranked.slice(0, 4);
    const remaining = ranked
      .slice(4)
      .reduce((sum, category) => sum + category.count, 0);
    if (remaining > 0)
      visible.push({ id: "remainder", name: "Other", count: remaining });

    let offset = 0;
    return visible.map((category, index) => {
      const share = total > 0 ? (category.count / total) * 100 : 0;
      const segment = {
        ...category,
        share,
        offset,
        color: `var(--color-chart-${index + 1})`,
      };
      offset += share;
      return segment;
    });
  });
</script>

{#if total > 0}
  <div class="distribution">
    <div class="distribution-plot">
      <svg viewBox="0 0 200 200" role="img" aria-label="{label} distribution">
        <title>{label} distribution</title>
        <desc
          >{total.toLocaleString()} recorded visits, grouped by {label.toLowerCase()}.
          Values are listed below.</desc
        >
        <circle
          cx="100"
          cy="100"
          r="78"
          fill="none"
          stroke="var(--color-base-200)"
          stroke-width="22"
        />
        <g transform="rotate(-90 100 100)">
          {#each segments as segment, index (index)}
            <circle
              cx="100"
              cy="100"
              r="78"
              fill="none"
              stroke={segment.color}
              stroke-width="22"
              pathLength="100"
              stroke-dasharray="{segment.share} {100 - segment.share}"
              stroke-dashoffset={-segment.offset}
            />
          {/each}
        </g>
      </svg>
      <div class="distribution-total" aria-hidden="true">
        <span class="text-2xl font-semibold tabular-nums tracking-tight"
          >{total.toLocaleString()}</span
        >
        <span class="text-xs text-muted-foreground mt-1">Recorded visits</span>
      </div>
    </div>
    <ul class="list-none m-0 p-0 space-y-3" aria-label="{label} shares">
      {#each segments as segment, index (index)}
        <li class="flex items-center gap-2 text-xs">
          <span
            class="w-2 h-2 rounded-full shrink-0"
            style:background={segment.color}
            aria-hidden="true"
          ></span>
          <span class="truncate flex-1 text-foreground" title={segment.name}
            >{segment.name}</span
          >
          <span class="tabular-nums text-muted-foreground"
            >{segment.count.toLocaleString()}</span
          >
          <span class="w-12 text-right tabular-nums font-medium"
            >{segment.share.toFixed(1)}%</span
          >
        </li>
      {/each}
    </ul>
    <table class="sr-only">
      <caption>{label} distribution data</caption>
      <thead
        ><tr
          ><th scope="col">{label}</th><th scope="col">Visits</th><th
            scope="col">Share</th
          ></tr
        ></thead
      >
      <tbody
        >{#each segments as segment, index (index)}<tr
            ><th scope="row">{segment.name}</th><td>{segment.count}</td><td
              >{segment.share.toFixed(1)}%</td
            ></tr
          >{/each}</tbody
      >
    </table>
  </div>
{:else}
  <div class="empty-state">
    <p class="empty-state-title">No {label.toLowerCase()} data</p>
    <p class="empty-state-desc">
      Try another date range to explore your audience.
    </p>
  </div>
{/if}

<style>
  .distribution-plot {
    width: min(100%, 12.5rem);
    position: relative;
    margin: 0 auto 1.25rem;
  }
  .distribution-total {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
</style>
