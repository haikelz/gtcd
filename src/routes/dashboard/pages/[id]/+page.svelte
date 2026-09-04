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
    data.hits?.hits?.find((h: any) => h.path_id === data.pathId)?.path ||
      `Page ${data.pathId}`
  );
</script>

<SEO
  title="{pageTitle} — gtcd"
  description="Referrer breakdown for {pageTitle}."
/>

<header
  class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8 animate-fade-in"
>
  <div>
    <a
      href="/dashboard/pages"
      class="text-sm font-medium mb-2 inline-block"
      style="color: var(--color-primary);">← Back to Pages</a
    >
    <p class="eyebrow mb-1.5">Page Detail</p>
    <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono">
      {pageTitle}
    </h1>
    <p class="text-sm mt-1.5" style="color: var(--color-muted-foreground);">
      Referrers driving traffic to this page.
    </p>
  </div>
  <DateRangePicker value={datePreset} onchange={handleDateChange} />
</header>

{#if data.error}
  <div
    class="rounded-2xl border p-5 animate-fade-in"
    style="border-color: oklch(58% 0.24 25 / 0.2); background: oklch(58% 0.24 25 / 0.04);"
  >
    <p class="text-sm font-medium" style="color: var(--color-error);">
      {data.error}
    </p>
  </div>
{:else if data.refs?.refs && data.refs.refs.length > 0}
  <div class="card animate-fade-in">
    <h3 class="section-title mb-4">Referrers</h3>
    <BarChart data={data.refs.refs} maxItems={30} />
  </div>
{:else}
  <p
    class="text-sm py-10 text-center"
    style="color: var(--color-muted-foreground);"
  >
    No referrer data available for this page.
  </p>
{/if}
