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
    goto(`/dashboard/pages/${data.pathId}?range=${preset}`, {
      replaceState: true,
    });
  }

  const pageTitle = $derived(
    data.hits?.hits?.find((hit) => hit.path_id === data.pathId)?.path ||
      `Page ${data.pathId}`
  );
</script>

<SEO
  title={pageTitle}
  description="Referrer breakdown for {pageTitle}."
  noindex />

<header
  class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8 animate-fade-in"
>
  <div>
    <a
      href="/dashboard/pages"
      class="text-sm font-medium mb-2 inline-flex items-center gap-1 text-primary hover:underline"
    >
      <span aria-hidden="true">←</span> Back to Pages
    </a>
    <p class="eyebrow mb-1.5">Page Detail</p>
    <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-foreground">
      {pageTitle}
    </h1>
    <p class="text-sm mt-1.5 text-muted-foreground">
      Referrers driving traffic to this page.
    </p>
  </div>
  <DateRangePicker value={datePreset} onchange={handleDateChange} />
</header>

{#if data.error}
  <div role="alert" class="alert alert-error animate-fade-in">
    <svg
      class="w-5 h-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
    <span class="text-sm font-medium">{data.error}</span>
    <button
      type="button"
      class="btn btn-sm btn-outline"
      onclick={() => location.reload()}
    >
      Retry
    </button>
  </div>
{:else if data.refs?.refs && data.refs.refs.length > 0}
  <div class="panel animate-fade-in">
    <h2 class="section-title mb-4">Referrers</h2>
    <BarChart data={data.refs.refs} maxItems={30} label="Referrer" />
  </div>
{:else}
  <div class="panel empty-state animate-fade-in">
    <div class="empty-state-icon" aria-hidden="true">
      <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    </div>
    <p class="empty-state-title">No referrers</p>
    <p class="empty-state-desc">No incoming referrers recorded for this page in this time window.</p>
  </div>
{/if}
