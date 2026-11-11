<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import BarChart from "$lib/components/BarChart.svelte";
  import CsvDownload, { statCsvRows } from "$lib/components/CsvDownload.svelte";
  import DashboardToolbar from "$lib/components/DashboardToolbar.svelte";
  import DonutChart from "$lib/components/DonutChart.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import ReportEmptyActions from "$lib/components/ReportEmptyActions.svelte";
  import ReportPagination from "$lib/components/ReportPagination.svelte";
  import ReportSkeleton from "$lib/components/ReportSkeleton.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import ErrorAlert from "$lib/components/ErrorAlert.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import {
    Frame,
    FrameDescription,
    FrameHeader,
    FramePanel,
    FrameTitle,
  } from "$lib/components/ui/frame";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { Globe } from "@lucide/svelte";
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
        `/dashboard/reports/browsers/${encodeURIComponent(id)}?${page.url.searchParams}`
      )
    );
  }
</script>

<SEO
  description={t("reports.browsersSeoDescription")}
  noindex
  title={t("reports.browsersSeoTitle")}
/>

<PageHeader
  description={t("reports.browsersDescription")}
  title={t("reports.browsersTitle")}
/>

<DashboardToolbar showFilter />

{#await data.report}
  <div class="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
    <Frame>
      <FrameHeader>
        <FrameTitle>{t("reports.browsersReport")}</FrameTitle>
      </FrameHeader>
      <FramePanel><ReportSkeleton /></FramePanel>
    </Frame>
    <Frame>
      <FrameHeader>
        <FrameTitle>{t("reports.audienceShare")}</FrameTitle>
      </FrameHeader>
      <FramePanel>
        <Skeleton class="mx-auto size-44 rounded-full" />
      </FramePanel>
    </Frame>
  </div>
{:then report}
  {#if report.stats.length > 0}
    <div class="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Frame>
        <FrameHeader
          class="flex-row flex-wrap items-center justify-between gap-3"
        >
          <FrameTitle>{t("reports.browsersReport")}</FrameTitle>
          <div class="flex items-center gap-3">
            <FrameDescription class="text-xs">
              {t("reports.entries", { count: report.stats.length })}
            </FrameDescription>
            <CsvDownload
              report="browsers"
              rows={statCsvRows(report.stats, t("reports.browserLabel"))}
            />
          </div>
        </FrameHeader>
        <FramePanel>
          <BarChart
            data={report.stats}
            label={t("reports.browserLabel")}
            maxItems={50}
            onItemClick={handleDetail}
          />
          <ReportPagination
            nextHref={report.more ? reportHref(data.offset + 50) : undefined}
            previousHref={data.offset > 0
              ? reportHref(Math.max(0, data.offset - 50))
              : undefined}
          />
        </FramePanel>
      </Frame>
      <Frame>
        <FrameHeader>
          <FrameTitle id="browser-share-heading"
            >{t("reports.audienceShare")}</FrameTitle
          >
        </FrameHeader>
        <FramePanel aria-labelledby="browser-share-heading" role="region">
          <DonutChart data={report.stats} />
        </FramePanel>
      </Frame>
    </div>
  {:else}
    <Frame>
      <FramePanel>
        <EmptyState
          desc={t("reports.browsersEmptyDescription")}
          icon={Globe}
          title={t("reports.browsersEmptyTitle")}
        >
          {#snippet actions()}<ReportEmptyActions />{/snippet}
        </EmptyState>
      </FramePanel>
    </Frame>
  {/if}
{:catch failure}
  <ErrorAlert message={failure.message} />
{/await}
