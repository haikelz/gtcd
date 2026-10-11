<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import BarChart from "$lib/components/BarChart.svelte";
  import DashboardToolbar from "$lib/components/DashboardToolbar.svelte";
  import DonutChart from "$lib/components/DonutChart.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import ReportPagination from "$lib/components/ReportPagination.svelte";
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

{#if data.error}
  <ErrorAlert message={data.error} />
{:else if data.stats?.stats && data.stats.stats.length > 0}
  <div class="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
    <Frame>
      <FrameHeader
        class="flex-row flex-wrap items-baseline justify-between gap-3"
      >
        <FrameTitle>{t("reports.browsersReport")}</FrameTitle>
        <FrameDescription class="text-xs">
          {t("reports.entries", { count: data.stats.stats.length })}
        </FrameDescription>
      </FrameHeader>
      <FramePanel>
        <BarChart
          data={data.stats.stats}
          label={t("reports.browserLabel")}
          maxItems={50}
          onItemClick={handleDetail}
        />
        <ReportPagination
          nextHref={data.stats.more ? reportHref(data.offset + 50) : undefined}
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
        <DonutChart data={data.stats.stats} />
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
      />
    </FramePanel>
  </Frame>
{/if}
