<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import BarChart from "$lib/components/BarChart.svelte";
  import DateRangePicker from "$lib/components/DateRangePicker.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import { Link2, TriangleAlert } from "@lucide/svelte";

  let { data } = $props();
  let datePreset = $derived(data.range || "7d");

  function handleDateChange(preset: string) {
    datePreset = preset;
    goto(resolve(`/dashboard/referrers?range=${preset}`), {
      replaceState: true,
    });
  }
</script>

<SEO
  title="Referrers — gtcd"
  description="Top referrers for your GoatCounter site."
  noindex
/>

<header
  class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8"
>
  <div>
    <p class="eyebrow mb-1.5">Acquisition</p>
    <h1
      class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground"
    >
      Top referrers
    </h1>
    <p class="text-sm mt-1.5 text-muted-foreground">
      Where visitors find your website.
    </p>
  </div>
  <DateRangePicker value={datePreset} onchange={handleDateChange} />
</header>

{#if data.error}
  <div role="alert" class="alert alert-error">
    <TriangleAlert class="h-5 w-5 shrink-0" /><span class="text-sm font-medium"
      >{data.error}</span
    ><button
      class="btn btn-sm btn-outline"
      type="button"
      onclick={() => location.reload()}>Retry</button
    >
  </div>
{:else if data.refs?.stats && data.refs.stats.length > 0}
  <section class="panel" aria-labelledby="referrer-report-title">
    <div class="flex flex-wrap items-baseline justify-between gap-3 mb-6">
      <h2 id="referrer-report-title" class="section-title">Referrer report</h2>
      <span class="text-xs text-muted-foreground"
        >{data.refs.stats.length} sources in this period</span
      >
    </div>
    <BarChart
      data={data.refs.stats}
      maxItems={100}
      label="Referrer"
      tone="mint"
    />
  </section>
{:else}
  <div class="panel empty-state">
    <div class="empty-state-icon" aria-hidden="true">
      <Link2 class="h-6 w-6" strokeWidth={1.5} />
    </div>
    <p class="empty-state-title">No referrer data</p>
    <p class="empty-state-desc">
      No incoming referrers were recorded for this period.
    </p>
  </div>
{/if}
