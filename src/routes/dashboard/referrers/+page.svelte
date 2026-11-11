<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import BarChart from "$lib/components/BarChart.svelte";
  import CsvDownload, { statCsvRows } from "$lib/components/CsvDownload.svelte";
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
  import { Link2 } from "@lucide/svelte";
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
        `/dashboard/reports/toprefs/${encodeURIComponent(id)}?${page.url.searchParams}`
      )
    );
  }
</script>

<SEO
  description={t("reports.referrersSeoDescription")}
  noindex
  title={t("reports.referrersSeoTitle")}
/>

<PageHeader
  description={t("reports.referrersDescription")}
  title={t("reports.referrersTitle")}
/>

<DashboardToolbar showFilter />

{#await data.refs}
  <Frame>
    <FrameHeader>
      <FrameTitle>{t("reports.referrersReport")}</FrameTitle>
    </FrameHeader>
    <FramePanel><ReportSkeleton /></FramePanel>
  </Frame>
{:then refs}
  {#if refs.stats.length > 0}
    <Frame>
      <FrameHeader
        class="flex-row flex-wrap items-center justify-between gap-3"
      >
        <FrameTitle id="referrer-report-title"
          >{t("reports.referrersReport")}</FrameTitle
        >
        <div class="flex items-center gap-3">
          <FrameDescription class="text-xs">
            {t("reports.referrersSources", { count: refs.stats.length })}
          </FrameDescription>
          <CsvDownload
            report="referrers"
            rows={statCsvRows(refs.stats, t("reports.referrerLabel"))}
          />
        </div>
      </FrameHeader>
      <FramePanel aria-labelledby="referrer-report-title" role="region">
        <BarChart
          data={refs.stats}
          label={t("reports.referrerLabel")}
          maxItems={100}
          onItemClick={handleDetail}
          tone="chart-2"
        />
        <ReportPagination
          nextHref={refs.more ? reportHref(data.offset + 100) : undefined}
          previousHref={data.offset > 0
            ? reportHref(Math.max(0, data.offset - 100))
            : undefined}
        />
      </FramePanel>
    </Frame>
  {:else}
    <Frame>
      <FramePanel>
        <EmptyState
          desc={t("reports.referrersEmptyDescription")}
          icon={Link2}
          title={t("reports.referrersEmptyTitle")}
        >
          {#snippet actions()}<ReportEmptyActions />{/snippet}
        </EmptyState>
      </FramePanel>
    </Frame>
  {/if}
{:catch failure}
  <ErrorAlert message={failure.message} />
{/await}
