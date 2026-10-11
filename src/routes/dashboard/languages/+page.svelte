<script lang="ts">
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
  import { Languages } from "@lucide/svelte";
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
</script>

<SEO
  description={t("reports.languagesSeoDescription")}
  noindex
  title={t("reports.languagesSeoTitle")}
/>

<PageHeader
  description={t("reports.languagesDescription")}
  title={t("reports.languagesTitle")}
/>

<DashboardToolbar showFilter />

{#if data.error}
  <ErrorAlert message={data.error} />
{:else if data.stats?.stats && data.stats.stats.length > 0}
  <Frame>
    <FrameHeader
      class="flex-row flex-wrap items-baseline justify-between gap-3"
    >
      <FrameTitle>{t("reports.languagesReport")}</FrameTitle>
      <FrameDescription class="text-xs">
        {t("reports.entries", { count: data.stats.stats.length })}
      </FrameDescription>
    </FrameHeader>
    <FramePanel>
      <BarChart
        data={data.stats.stats}
        label={t("reports.languageLabel")}
        maxItems={50}
        tone="chart-4"
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
        desc={t("reports.languagesEmptyDescription")}
        icon={Languages}
        title={t("reports.languagesEmptyTitle")}
      />
    </FramePanel>
  </Frame>
{/if}
