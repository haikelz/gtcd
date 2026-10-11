<script lang="ts">
  import { goto } from "$app/navigation";
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
  import { Smartphone } from "@lucide/svelte";
  import { SvelteURLSearchParams } from "svelte/reactivity";

  let { data } = $props();

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
        `/dashboard/reports/sizes/${encodeURIComponent(id)}?${page.url.searchParams}`
      )
    );
  }
</script>

<SEO
  description="Screen size breakdown for your GoatCounter site."
  noindex
  title="Devices — gtcd"
/>

<PageHeader
  description="Which screen sizes your visitors use."
  title="Screen Sizes"
/>

<DashboardToolbar showFilter />

{#if data.error}
  <ErrorAlert message={data.error} />
{:else if data.stats?.stats && data.stats.stats.length > 0}
  <Frame>
    <FrameHeader
      class="flex-row flex-wrap items-baseline justify-between gap-3"
    >
      <FrameTitle>Screen size report</FrameTitle>
      <FrameDescription class="text-xs">
        {data.stats.stats.length} entries in this period
      </FrameDescription>
    </FrameHeader>
    <FramePanel>
      <BarChart
        data={data.stats.stats}
        label="Screen size"
        maxItems={50}
        onItemClick={handleDetail}
        tone="chart-2"
      />
      <ReportPagination
        nextHref={data.stats.more ? reportHref(data.offset + 50) : undefined}
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
        desc="No device measurements recorded for this period."
        icon={Smartphone}
        title="No screen size data"
      />
    </FramePanel>
  </Frame>
{/if}
