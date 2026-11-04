<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import BarChart from "$lib/components/BarChart.svelte";
  import DashboardToolbar from "$lib/components/DashboardToolbar.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import ErrorAlert from "$lib/components/ErrorAlert.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import ReportEmptyActions from "$lib/components/ReportEmptyActions.svelte";
  import ReportPagination from "$lib/components/ReportPagination.svelte";
  import ReportSkeleton from "$lib/components/ReportSkeleton.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import {
    Frame,
    FrameDescription,
    FrameHeader,
    FramePanel,
    FrameTitle,
  } from "$lib/components/ui/frame";
  import { MapPin } from "@lucide/svelte";
  import { t } from "$lib/display";
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
        `/dashboard/reports/locations/${encodeURIComponent(id)}?${page.url.searchParams}`
      )
    );
  }
</script>

<SEO
  description={t("reports.locationsSeoDescription")}
  noindex
  title={t("reports.locationsSeoTitle")}
/>

<PageHeader
  description={t("reports.locationsDescription")}
  title={t("reports.locationsTitle")}
/>

<DashboardToolbar showFilter />

{#await data.report}
  <Frame>
    <FrameHeader>
      <FrameTitle>{t("reports.locationsReport")}</FrameTitle>
    </FrameHeader>
    <FramePanel><ReportSkeleton /></FramePanel>
  </Frame>
{:then report}
  {#if report.stats.length > 0}
    <Frame>
      <FrameHeader
        class="flex-row flex-wrap items-baseline justify-between gap-3"
      >
        <FrameTitle>{t("reports.locationsReport")}</FrameTitle>
        <FrameDescription class="text-xs">
          {t("reports.entries", { count: report.stats.length })}
        </FrameDescription>
      </FrameHeader>
      <FramePanel>
        <BarChart
          data={report.stats}
          label={t("reports.locationLabel")}
          maxItems={50}
          onItemClick={handleDetail}
          tone="chart-2"
        />
        <ReportPagination
          nextHref={report.more ? reportHref(data.offset + 50) : undefined}
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
          desc={t("reports.locationsEmptyDescription")}
          icon={MapPin}
          title={t("reports.locationsEmptyTitle")}
        >
          {#snippet actions()}<ReportEmptyActions />{/snippet}
        </EmptyState>
      </FramePanel>
    </Frame>
  {/if}
{:catch failure}
  <ErrorAlert message={failure.message} />
{/await}
