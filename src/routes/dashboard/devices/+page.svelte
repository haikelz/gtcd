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
    goto(`/dashboard/devices?range=${preset}`, { replaceState: true });
  }
</script>

<SEO
  title="Devices — gtcd"
  description="Screen size breakdown for your GoatCounter site."
/>

<header
  class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8 animate-fade-in"
>
  <div>
    <p class="eyebrow mb-1.5">Breakdown</p>
    <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
      Screen Sizes
    </h1>
    <p class="text-sm mt-1.5 text-muted-foreground">
      Which screen sizes your visitors use.
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
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    </div>
    <p class="empty-state-title">No screen size data</p>
    <p class="empty-state-desc">No device measurements recorded for this period.</p>
  </div>
{/if}
