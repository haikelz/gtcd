<script lang="ts">
  import type { ChartNoAxesCombined } from "@lucide/svelte";

  let {
    label,
    value,
    subtext,
    trend,
    icon: Icon,
    tone = "cobalt",
    featured = false,
    class: className = "",
  }: {
    label: string;
    value: string | number;
    subtext?: string;
    icon?: typeof ChartNoAxesCombined;
    tone?: "cobalt" | "mint" | "amber";
    featured?: boolean;
    trend?: { value: string; direction: "up" | "down" };
    class?: string;
  } = $props();
</script>

<article
  class="stat-card {featured ? 'featured' : ''} {className}"
  data-tone={tone}
  aria-label="{label}: {value}{subtext ? `, ${subtext}` : ''}"
>
  <div class="flex items-center justify-between gap-2 mb-5">
    <p class="metric-label">{label}</p>
    {#if Icon}<span class="metric-icon shrink-0"
        ><Icon class="h-4 w-4" strokeWidth={1.75} /></span
      >{/if}
  </div>

  <div class="flex items-baseline gap-3">
    <p class="metric-value">{value}</p>
    {#if trend}
      <span
        class="stat-change {trend.direction === 'up'
          ? 'positive'
          : 'negative'} mb-1"
      >
        <span class="sr-only">Trend: {trend.direction} </span>
        <span aria-hidden="true">{trend.direction === "up" ? "↑" : "↓"}</span>
        {trend.value}
      </span>
    {/if}
  </div>

  {#if subtext}
    <p class="metric-subtext text-xs mt-2">{subtext}</p>
  {/if}
</article>
