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
    goto(`/dashboard/campaigns?range=${preset}`, { replaceState: true });
  }
</script>

<SEO
  title="Campaigns — gtcd"
  description="Campaign breakdown for your GoatCounter site."
/>

<header
  class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8 animate-fade-in"
>
  <div>
    <p class="eyebrow mb-1.5">Breakdown</p>
    <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
      Campaigns
    </h1>
    <p class="text-sm mt-1.5 text-muted-foreground">
      Which campaigns drive traffic.
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
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
      </svg>
    </div>
    <p class="empty-state-title">No campaign data</p>
    <p class="empty-state-desc">No campaigns recorded for this time period.</p>
  </div>
{/if}
