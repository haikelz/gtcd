<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import BarChart from "$lib/components/BarChart.svelte";
  import DateRangePicker from "$lib/components/DateRangePicker.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import ReportPagination from "$lib/components/ReportPagination.svelte";
  import { Monitor, TriangleAlert } from "@lucide/svelte";
  import { SvelteURLSearchParams } from "svelte/reactivity";

  let { data } = $props();
  let datePreset = $derived(data.range || "7d");

  function handleDateChange(preset: string) {
    datePreset = preset;
    goto(resolve(`/dashboard/systems?range=${preset}`), { replaceState: true });
  }

  function reportHref(offset: number): string {
    const params = new SvelteURLSearchParams(page.url.searchParams);
    if (offset === 0) params.delete("offset");
    else params.set("offset", String(offset));
    const query = params.toString();
    return query ? `${page.url.pathname}?${query}` : page.url.pathname;
  }

  function handleDetail(id: string) {
    goto(
      resolve(
        `/dashboard/reports/systems/${encodeURIComponent(id)}?${page.url.searchParams}`
      )
    );
  }
</script>

<SEO
  title="Operating Systems — gtcd"
  description="OS breakdown for your GoatCounter site."
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
      Operating Systems
    </h1>
    <p class="text-sm mt-1.5 text-muted-foreground">
      Which operating systems your visitors use.
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
      <h2 class="section-title">Operating system report</h2>
      <span class="text-xs text-muted-foreground"
        >{data.stats.stats.length} entries in this period</span
      >
    </div>
    <BarChart
      tone="lavender"
      data={data.stats.stats}
      maxItems={50}
      label="Operating system"
      onItemClick={handleDetail}
    />
    <ReportPagination
      previousHref={data.offset > 0
        ? reportHref(Math.max(0, data.offset - 50))
        : undefined}
      nextHref={data.stats.more ? reportHref(data.offset + 50) : undefined}
    />
  </div>
{:else}
  <div class="panel empty-state">
    <div class="empty-state-icon" aria-hidden="true">
      <Monitor class="h-6 w-6" strokeWidth={1.5} />
    </div>
    <p class="empty-state-title">No operating system data</p>
    <p class="empty-state-desc">No OS statistics recorded for this period.</p>
  </div>
{/if}
