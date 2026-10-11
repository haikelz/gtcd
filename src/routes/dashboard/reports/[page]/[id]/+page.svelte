<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import BarChart from "$lib/components/BarChart.svelte";
  import DashboardToolbar from "$lib/components/DashboardToolbar.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import ErrorAlert from "$lib/components/ErrorAlert.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import ReportPagination from "$lib/components/ReportPagination.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import {
    Frame,
    FrameDescription,
    FrameHeader,
    FramePanel,
    FrameTitle,
  } from "$lib/components/ui/frame";
  import { ArrowLeft, ChartNoAxesColumnIncreasing } from "@lucide/svelte";
  import { SvelteURLSearchParams } from "svelte/reactivity";

  let { data } = $props();

  function reportHref(offset: number): string {
    const params = new SvelteURLSearchParams(page.url.searchParams);
    if (offset === 0) params.delete("offset");
    else params.set("offset", String(offset));
    const query = params.toString();
    return query ? `${page.url.pathname}?${query}` : page.url.pathname;
  }
</script>

<SEO
  description={`Detailed ${data.report.label.toLowerCase()} for your GoatCounter site.`}
  noindex
  title={`${data.report.label} — gtcd`}
/>

<PageHeader
  description={`${data.report.label} in the selected period.`}
  title={data.detailId}
>
  {#snippet eyebrow()}
    <a
      class="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      href={resolve(data.report.parentHref)}
    >
      <ArrowLeft aria-hidden="true" class="size-4" /> Back to {data.report
        .parent}
    </a>
  {/snippet}
</PageHeader>

<DashboardToolbar showFilter />

{#if data.error}
  <ErrorAlert message={data.error} />
{:else if data.detail?.stats && data.detail.stats.length > 0}
  <Frame>
    <FrameHeader
      class="flex-row flex-wrap items-baseline justify-between gap-3"
    >
      <FrameTitle id="detail-report-heading">{data.report.label}</FrameTitle>
      <FrameDescription class="text-xs">
        {data.detail.stats.length} entries in this period
      </FrameDescription>
    </FrameHeader>
    <FramePanel aria-labelledby="detail-report-heading" role="region">
      <BarChart
        data={data.detail.stats}
        label={data.report.label}
        maxItems={50}
      />
      <ReportPagination
        nextHref={data.detail.more ? reportHref(data.offset + 50) : undefined}
        previousHref={data.offset > 0
          ? reportHref(Math.max(0, data.offset - 50))
          : undefined}
      />
    </FramePanel>
  </Frame>
{:else}
  <Frame>
    <FramePanel>
      <EmptyState
        desc="No detailed entries were recorded for this item in this time period."
        icon={ChartNoAxesColumnIncreasing}
        title="No detailed data"
      />
    </FramePanel>
  </Frame>
{/if}
