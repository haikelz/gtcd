<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import BarChart from "$lib/components/BarChart.svelte";
  import DateRangePicker from "$lib/components/DateRangePicker.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import { Megaphone, TriangleAlert } from "@lucide/svelte";

  let { data } = $props();
  let datePreset = $derived(data.range || "7d");

  function handleDateChange(preset: string) {
    datePreset = preset;
    goto(resolve(`/dashboard/campaigns?range=${preset}`), {
      replaceState: true,
    });
  }
</script>

<SEO
  title="Campaigns — gtcd"
  description="Campaign breakdown for your GoatCounter site."
  noindex
/>

<header
  class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8"
>
  <div>
    <p class="eyebrow mb-1.5">Breakdown</p>
    <h1
      class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground"
    >
      Campaigns
    </h1>
    <p class="text-sm mt-1.5 text-muted-foreground">
      Which campaigns drive traffic.
    </p>
  </div>
  <DateRangePicker value={datePreset} onchange={handleDateChange} />
</header>

{#if data.error}
  <div role="alert" class="alert alert-error">
    <TriangleAlert class="h-5 w-5 shrink-0" />
    <span class="text-sm font-medium">{data.error}</span>
    <button
      type="button"
      class="btn btn-sm btn-outline"
      onclick={() => location.reload()}
    >
      Retry
    </button>
  </div>
{:else if data.stats?.stats && data.stats.stats.length > 0}
  <div class="panel">
    <div class="flex flex-wrap items-baseline justify-between gap-3 mb-6">
      <h2 class="section-title">Campaign report</h2>
      <span class="text-xs text-muted-foreground"
        >{data.stats.stats.length} entries in this period</span
      >
    </div>
    <BarChart
      tone="amber"
      data={data.stats.stats}
      maxItems={50}
      label="Campaign"
    />
  </div>
{:else}
  <div class="panel empty-state">
    <div class="empty-state-icon" aria-hidden="true">
      <Megaphone class="h-6 w-6" strokeWidth={1.5} />
    </div>
    <p class="empty-state-title">No campaign data</p>
    <p class="empty-state-desc">No campaigns recorded for this time period.</p>
  </div>
{/if}
