<script lang="ts">
  import { goto } from "$app/navigation";
  import BarChart from "$lib/components/BarChart.svelte";
  import DateRangePicker from "$lib/components/DateRangePicker.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import { Languages, TriangleAlert } from "@lucide/svelte";

  let { data } = $props();
  let datePreset = $state("7d");

  $effect(() => {
    datePreset = data.range || "7d";
  });

  function handleDateChange(preset: string) {
    datePreset = preset;
    goto(`/dashboard/languages?range=${preset}`, { replaceState: true });
  }
</script>

<SEO
  title="Languages — gtcd"
  description="Language breakdown for your GoatCounter site."
  noindex
/>

<header
  class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8 animate-fade-in"
>
  <div>
    <p class="eyebrow mb-1.5">Breakdown</p>
    <h1
      class="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground"
    >
      Languages
    </h1>
    <p class="text-sm mt-1.5 text-muted-foreground">
      Which languages your visitors use.
    </p>
  </div>
  <DateRangePicker value={datePreset} onchange={handleDateChange} />
</header>

{#if data.error}
  <div role="alert" class="alert alert-error animate-fade-in">
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
  <div class="panel animate-fade-in">
    <div class="flex flex-wrap items-baseline justify-between gap-3 mb-6">
      <h2 class="section-title">Language report</h2>
      <span class="text-xs text-muted-foreground"
        >{data.stats.stats.length} entries in this period</span
      >
    </div>
    <BarChart data={data.stats.stats} maxItems={50} label="Language" />
  </div>
{:else}
  <div class="panel empty-state animate-fade-in">
    <div class="empty-state-icon" aria-hidden="true">
      <Languages class="h-6 w-6" strokeWidth={1.5} />
    </div>
    <p class="empty-state-title">No language data</p>
    <p class="empty-state-desc">
      No language preferences recorded for this period.
    </p>
  </div>
{/if}
