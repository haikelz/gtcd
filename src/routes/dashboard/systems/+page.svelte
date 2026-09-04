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
    goto(`/dashboard/systems?range=${preset}`, { replaceState: true });
  }
</script>

<SEO
  title="Operating Systems — gtcd"
  description="OS breakdown for your GoatCounter site."
/>

<header
  class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8 animate-fade-in"
>
  <div>
    <p class="eyebrow mb-1.5">Breakdown</p>
    <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
      Operating Systems
    </h1>
    <p class="text-sm mt-1.5 text-muted-foreground">
      Which operating systems your visitors use.
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
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 7.41A2.25 2.25 0 012.25 5.496V5.25" />
      </svg>
    </div>
    <p class="empty-state-title">No operating system data</p>
    <p class="empty-state-desc">No OS statistics recorded for this period.</p>
  </div>
{/if}
