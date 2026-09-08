<script lang="ts">
  import { page } from "$app/state";
  import { resolve } from "$app/paths";
  import { SvelteURLSearchParams } from "svelte/reactivity";
  import BarChart from "$lib/components/BarChart.svelte";
  import DateRangePicker from "$lib/components/DateRangePicker.svelte";
  import ReportPagination from "$lib/components/ReportPagination.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import { goto } from "$app/navigation";
  import {
    ArrowLeft,
    ChartNoAxesColumnIncreasing,
    TriangleAlert,
  } from "@lucide/svelte";

  let { data } = $props();
  let datePreset = $derived(data.range || "7d");

  function handleDateChange(preset: string) {
    datePreset = preset;
    goto(
      resolve(
        `/dashboard/reports/${data.report.route}/${encodeURIComponent(data.detailId)}?range=${preset}`
      ),
      {
        replaceState: true,
      }
    );
  }

  function reportHref(offset: number): string {
    const params = new SvelteURLSearchParams(page.url.searchParams);
    if (offset === 0) {
      params.delete("offset");
    } else {
      params.set("offset", String(offset));
    }

    const query = params.toString();
    return query ? `${page.url.pathname}?${query}` : page.url.pathname;
  }
</script>

<SEO
  title={`${data.report.label} — gtcd`}
  description={`Detailed ${data.report.label.toLowerCase()} for your GoatCounter site.`}
  noindex
/>

<header
  class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8"
>
  <div>
    <a
      href={resolve(data.report.parentHref)}
      class="text-sm font-medium mb-2 inline-flex items-center gap-1 text-primary hover:underline"
    >
      <ArrowLeft class="h-4 w-4" /> Back to {data.report.parent}
    </a>
    <p class="eyebrow mb-1.5">Drill-down</p>
    <h1
      class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground break-words"
    >
      {data.detailId}
    </h1>
    <p class="text-sm mt-1.5 text-muted-foreground">
      {data.report.label} in the selected period.
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
      onclick={() => location.reload()}>Retry</button
    >
  </div>
{:else if data.detail?.stats && data.detail.stats.length > 0}
  <section class="panel" aria-labelledby="detail-report-heading">
    <div class="flex flex-wrap items-baseline justify-between gap-3 mb-6">
      <h2 id="detail-report-heading" class="section-title">
        {data.report.label}
      </h2>
      <span class="text-xs text-muted-foreground"
        >{data.detail.stats.length} entries in this period</span
      >
    </div>
    <BarChart
      data={data.detail.stats}
      maxItems={50}
      label={data.report.label}
    />
    <ReportPagination
      previousHref={data.offset > 0
        ? reportHref(Math.max(0, data.offset - 50))
        : undefined}
      nextHref={data.detail.more ? reportHref(data.offset + 50) : undefined}
    />
  </section>
{:else}
  <div class="panel empty-state">
    <div class="empty-state-icon" aria-hidden="true">
      <ChartNoAxesColumnIncreasing class="h-6 w-6" strokeWidth={1.5} />
    </div>
    <p class="empty-state-title">No detailed data</p>
    <p class="empty-state-desc">
      No detailed entries were recorded for this item in this time period.
    </p>
  </div>
{/if}
