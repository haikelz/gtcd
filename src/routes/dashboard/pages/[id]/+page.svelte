<script lang="ts">
  import { goto } from "$app/navigation";
  import BarChart from "$lib/components/BarChart.svelte";
  import DateRangePicker from "$lib/components/DateRangePicker.svelte";
    import { Link2, TriangleAlert } from "@lucide/svelte";
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
{:else if data.refs?.refs && data.refs.refs.length > 0}
  <div class="panel animate-fade-in">
    <h2 class="section-title mb-4">Referrers</h2>
    <BarChart data={data.refs.refs} maxItems={30} label="Referrer" />
  </div>
{:else}
  <div class="panel empty-state animate-fade-in">
    <div class="empty-state-icon" aria-hidden="true">
      <Link2 class="h-6 w-6" strokeWidth={1.5} />
    </div>
    <p class="empty-state-title">No referrers</p>
    <p class="empty-state-desc">No incoming referrers recorded for this page in this time window.</p>
  </div>
{/if}
