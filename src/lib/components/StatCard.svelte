<script lang="ts">
  let {
    label,
    value,
    subtext,
    icon,
    trend,
    class: className = "",
  }: {
    label: string;
    value: string | number;
    subtext?: string;
    icon?: string;
    trend?: { value: string; direction: "up" | "down" };
    class?: string;
  } = $props();
</script>

<article
  class="stat-card {className}"
  aria-label="{label}: {value}{subtext ? `, ${subtext}` : ''}"
>
  <div class="flex items-start justify-between mb-3">
    <p class="stat-label">{label}</p>
    {#if icon}
      <div
        class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0"
        aria-hidden="true"
      >
        {@html icon}
      </div>
    {/if}
  </div>

  <div class="flex items-baseline gap-3">
    <p class="stat-value">{value}</p>
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
    <p class="text-muted-foreground text-xs mt-1.5">{subtext}</p>
  {/if}
</article>
