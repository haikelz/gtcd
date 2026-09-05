<script lang="ts">
  import AreaChart from "./AreaChart.svelte";
  import BarChart from "./BarChart.svelte";
  import StatCard from "./StatCard.svelte";

  let period = $state<7 | 30>(30);
  const daily = [842, 1096, 923, 1284, 1086, 1467, 1278, 1734, 1438, 1612, 1396, 1824, 1684, 2186, 1862, 2048, 1764, 2314, 2136, 2584, 2286, 2718, 2486, 3012, 2784, 3196, 2874, 3428, 3186, 3672];
  const traffic = $derived(daily.slice(-period).map((count, i) => ({
    day: `2026-08-${String(31 - period + i).padStart(2, "0")}`,
    daily: count,
    hourly: [],
  })));
  const total = $derived(traffic.reduce((sum, day) => sum + day.daily, 0));
  const browsers = $derived([
    { id: "chrome", name: "Chrome", count: Math.round(total * 0.54) },
    { id: "safari", name: "Safari", count: Math.round(total * 0.28) },
    { id: "firefox", name: "Firefox", count: Math.round(total * 0.12) },
    { id: "edge", name: "Edge", count: Math.round(total * 0.06) },
  ]);
</script>

<section class="product-preview" aria-label="Interactive analytics preview with illustrative data">
  <h2 class="sr-only">Website analytics preview</h2>
  <header class="preview-header">
    <div class="flex items-center gap-3">
      <span class="w-2 h-2 rounded-full bg-primary" aria-hidden="true"></span>
      <span class="font-medium text-sm">Website overview</span>
      <span class="preview-note">Illustrative data</span>
    </div>
    <div class="join" aria-label="Preview date range">
      {#each [7, 30] as days}
        <button type="button" class="btn btn-sm join-item {period === days ? 'bg-base-200' : 'btn-ghost'}"
          aria-pressed={period === days} onclick={() => { period = days === 7 ? 7 : 30; }}>
          {days} days
        </button>
      {/each}
    </div>
  </header>
  <div class="metric-strip">
    <StatCard label="Pageviews" value={total.toLocaleString()} subtext="Across your website" />
    <StatCard label="Daily average" value={Math.round(total / period).toLocaleString()} subtext="Pageviews per day" />
    <StatCard label="Top browser" value="Chrome" subtext="54% of visitors" />
    <StatCard label="Date range" value={period + " days"} subtext="August 2026" />
  </div>
  <div class="preview-reports">
    <div class="preview-traffic">
      <h3 class="section-title mb-5">Traffic over time</h3>
      <AreaChart data={traffic} height={220} />
    </div>
    <div class="preview-breakdown">
      <h3 class="section-title mb-5">Browsers</h3>
      <BarChart data={browsers} />
    </div>
  </div>
  <footer class="preview-footer">
    <span>GoatCounter analytics, thoughtfully arranged.</span>
    <span class="font-mono">01 / OVERVIEW</span>
  </footer>
</section>

<style>
  .product-preview {
    overflow: hidden;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-box);
    background: var(--color-base-100);
    box-shadow: 0 1px 1px color-mix(in oklch, var(--color-foreground) 4%, transparent),
      0 8px 24px color-mix(in oklch, var(--color-foreground) 4%, transparent),
      0 32px 80px color-mix(in oklch, var(--color-foreground) 6%, transparent);
  }
  .preview-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.5rem; }
  .preview-note { padding-left: 0.75rem; border-left: 1px solid var(--color-border); font-size: 0.75rem; color: var(--color-muted-foreground); }
  .product-preview :global(.metric-strip) { border-radius: 0; border-inline: 0; }
  .preview-reports { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 0.45fr); }
  .preview-traffic, .preview-breakdown { padding: 1.5rem; min-width: 0; }
  .preview-breakdown { border-left: 1px solid var(--color-border); }
  .preview-footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; padding: 1rem 1.5rem; border-top: 1px solid var(--color-border); color: var(--color-muted-foreground); font-size: 0.75rem; }
  @media (max-width: 767px) {
    .preview-reports { grid-template-columns: minmax(0, 1fr); }
    .preview-breakdown { border-left: 0; border-top: 1px solid var(--color-border); }
    .preview-note { display: block; padding: 0; border: 0; }
    .preview-header > div:first-child { flex-wrap: wrap; }
  }
</style>
