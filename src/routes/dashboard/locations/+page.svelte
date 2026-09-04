<script lang="ts">
  import { goto } from "$app/navigation";
  import BarChart from "$lib/components/BarChart.svelte";
  import DateRangePicker from "$lib/components/DateRangePicker.svelte";
  import SEO from "$lib/components/SEO.svelte";

  let { data } = $props();
  let datePreset = $state("7d");

  $effect(() => {
    datePreset = data.range || "7d";
  });

  function handleDateChange(preset: string) {
    datePreset = preset;
    goto(`/dashboard/locations?range=${preset}`, { replaceState: true });
  }
</script>

<SEO
  title="Locations — gtcd"
  description="Geographic breakdown for your GoatCounter site."
/>

<header
  class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8 animate-fade-in"
>
  <div>
    <p class="eyebrow mb-1.5">Breakdown</p>
    <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
      Locations
    </h1>
    <p class="text-sm mt-1.5 text-muted-foreground">
      Where your visitors are located.
    </p>
  </div>
  <DateRangePicker value={datePreset} onchange={handleDateChange} />
</header>

{#if data.error}
  <div
    role="alert"
    class="rounded-2xl border border-error/30 bg-error/10 p-5 animate-fade-in flex items-center justify-between gap-4"
  >
    <p class="text-sm font-medium text-error">
      {data.error}
    </p>
    <button
      type="button"
      class="btn btn-sm btn-outline btn-error"
      onclick={() => location.reload()}
    >
      Retry
    </button>
  </div>
{:else if data.stats?.stats && data.stats.stats.length > 0}
  <div class="card animate-fade-in">
    <BarChart data={data.stats.stats} maxItems={50} />
  </div>
{:else}
  <div class="card empty-state animate-fade-in">
    <div class="empty-state-icon" aria-hidden="true">
      <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    </div>
    <p class="empty-state-title">No location data</p>
    <p class="empty-state-desc">No visitor countries recorded for this period.</p>
  </div>
{/if}
