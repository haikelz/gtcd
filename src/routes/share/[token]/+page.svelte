<script lang="ts">
  import AreaChart from "$lib/components/AreaChart.svelte";
  import BarChart from "$lib/components/BarChart.svelte";
  import Brand from "$lib/components/Brand.svelte";
  import DonutChart from "$lib/components/DonutChart.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import PageRow from "$lib/components/PageRow.svelte";
  import StatCard from "$lib/components/StatCard.svelte";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import { Button } from "$lib/components/ui/button";
  import {
    Frame,
    FrameDescription,
    FrameHeader,
    FramePanel,
    FrameTitle,
  } from "$lib/components/ui/frame";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { formatCount, numbersHidden, t } from "$lib/display";
  import { ChartNoAxesCombined, FileText, Link2, MapPin } from "@lucide/svelte";

  let { data } = $props();

  const RANGE_LABELS = $derived({
    month: t("share.rangeMonth"),
    quarter: t("share.rangeQuarter"),
    week: t("share.rangeWeek"),
    year: t("share.rangeYear"),
  });
</script>

<SEO title={t("share.metaTitle")} description={t("share.readOnly")} noindex />

<main
  class="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-6 px-4 py-4 sm:px-6"
  id="main-content"
  tabindex="-1"
>
  <header class="flex items-center justify-between gap-4">
    <Brand />
    <ThemeToggle compact />
  </header>

  <div class="flex flex-wrap items-end justify-between gap-4">
    <div class="min-w-0">
      <h1 class="text-xl font-semibold tracking-tight break-words">
        {data.siteName}
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        {t("share.readOnly")}
      </p>
    </div>
    <nav aria-label={t("share.period")} class="flex flex-wrap gap-1">
      {#each data.ranges as range (range)}
        <Button
          aria-current={range === data.range ? "page" : undefined}
          href="?range={range}"
          size="sm"
          variant={range === data.range ? "secondary" : "ghost"}
        >
          {RANGE_LABELS[range]}
        </Button>
      {/each}
    </nav>
  </div>

  <section
    aria-label={t("share.kpis")}
    class="grid grid-cols-2 gap-4 lg:grid-cols-4"
  >
    {#if data.metrics.includes("total")}
      {#await data.total}
        <StatCard
          icon={ChartNoAxesCombined}
          label={t("share.visits")}
          loading
        />
      {:then total}
        <StatCard
          icon={ChartNoAxesCombined}
          label={t("share.visits")}
          subtext={RANGE_LABELS[data.range]}
          value={total && !numbersHidden() ? formatCount(total.total) : "—"}
        />
      {/await}
    {/if}
    {#if data.metrics.includes("hits")}
      {#await data.hits}
        <StatCard icon={FileText} label={t("share.topPage")} loading />
      {:then hits}
        <StatCard
          compact
          icon={FileText}
          label={t("share.topPage")}
          subtext={hits?.hits[0]?.title || t("share.mostVisitedPath")}
          value={hits?.hits[0]?.path ?? "—"}
        />
      {/await}
    {/if}
    {#if data.metrics.includes("referrers")}
      {#await data.referrers}
        <StatCard icon={Link2} label={t("share.topReferrer")} loading />
      {:then referrers}
        <StatCard
          compact
          icon={Link2}
          label={t("share.topReferrer")}
          subtext={t("share.mostVisits")}
          value={referrers?.stats[0]?.name?.trim() || "—"}
        />
      {/await}
    {/if}
    {#if data.metrics.includes("locations")}
      {#await data.locations}
        <StatCard icon={MapPin} label={t("share.topCountry")} loading />
      {:then locations}
        <StatCard
          compact
          icon={MapPin}
          label={t("share.topCountry")}
          subtext={t("share.mostVisits")}
          value={locations?.stats[0]?.name?.trim() || "—"}
        />
      {/await}
    {/if}
  </section>

  {#if data.metrics.includes("total")}
    <Frame aria-labelledby="share-traffic" role="region">
      <FrameHeader>
        <FrameTitle id="share-traffic">{t("share.traffic")}</FrameTitle>
      </FrameHeader>
      <FramePanel>
        {#await data.total}
          <Skeleton class="h-[280px] w-full" />
        {:then total}
          {#if total === null}
            {@render retry()}
          {:else}
            <AreaChart
              data={total?.stats ?? []}
              group={data.group}
              height={280}
            />
          {/if}
        {/await}
      </FramePanel>
    </Frame>
  {/if}
  <div class="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
    {#if data.metrics.includes("hits")}
      <Frame aria-labelledby="share-pages" role="region">
        <FrameHeader>
          <FrameTitle id="share-pages">{t("share.pages")}</FrameTitle>
          <FrameDescription class="text-xs">
            {t("share.pagesDescription")}
          </FrameDescription>
        </FrameHeader>
        <FramePanel>
          {#await data.hits}
            {@render listSkeleton(6)}
          {:then hits}
            {#if hits === null}
              {@render retry()}
            {:else if hits?.hits.length}
              <ul aria-label={t("share.topPages")} class="m-0 list-none p-0">
                {#each hits.hits as hit, i (hit.path_id)}
                  <PageRow
                    group={data.group}
                    {hit}
                    linkDomain={data.linkDomain}
                    rank={i + 1}
                  />
                {/each}
              </ul>
            {:else}
              <EmptyState icon={FileText} title={t("share.noPageData")} />
              <Button href="?range={data.range}" size="sm" variant="outline"
                >{t("share.retry")}</Button
              >
            {/if}
          {/await}
        </FramePanel>
      </Frame>
    {/if}
    {#if data.metrics.includes("browsers")}
      <Frame aria-labelledby="share-browsers" role="region">
        <FrameHeader>
          <FrameTitle id="share-browsers">{t("share.browsers")}</FrameTitle>
        </FrameHeader>
        <FramePanel>
          {#await data.browsers}
            <Skeleton class="mx-auto size-44 rounded-full" />
          {:then browsers}
            {#if browsers === null}
              {@render retry()}
            {:else}
              <DonutChart data={browsers?.stats ?? []} />
            {/if}
          {/await}
        </FramePanel>
      </Frame>
    {/if}
  </div>

  <div class="grid gap-4 lg:grid-cols-2">
    {#if data.metrics.includes("referrers")}
      <Frame aria-labelledby="share-referrers" role="region">
        <FrameHeader>
          <FrameTitle id="share-referrers">{t("share.referrers")}</FrameTitle>
        </FrameHeader>
        <FramePanel>
          {#await data.referrers}
            {@render listSkeleton(5)}
          {:then referrers}
            {#if referrers === null}
              {@render retry()}
            {:else if referrers?.stats.length}
              <BarChart
                data={referrers.stats}
                label={t("share.referrer")}
                maxItems={10}
                tone="chart-3"
              />
            {:else}
              <EmptyState icon={Link2} title={t("share.noReferrerData")} />
              <Button href="?range={data.range}" size="sm" variant="outline"
                >{t("share.retry")}</Button
              >
            {/if}
          {/await}
        </FramePanel>
      </Frame>
    {/if}
    {#if data.metrics.includes("locations")}
      <Frame aria-labelledby="share-locations" role="region">
        <FrameHeader>
          <FrameTitle id="share-locations">{t("share.locations")}</FrameTitle>
        </FrameHeader>
        <FramePanel>
          {#await data.locations}
            {@render listSkeleton(5)}
          {:then locations}
            {#if locations === null}
              {@render retry()}
            {:else if locations?.stats.length}
              <BarChart
                data={locations.stats}
                label={t("share.country")}
                maxItems={10}
                tone="chart-2"
              />
            {:else}
              <EmptyState icon={MapPin} title={t("share.noLocationData")} />
              <Button href="?range={data.range}" size="sm" variant="outline"
                >{t("share.retry")}</Button
              >
            {/if}
          {/await}
        </FramePanel>
      </Frame>
    {/if}
  </div>

  <footer class="mt-auto border-t py-4 text-xs text-muted-foreground">
    {t("share.footer")}
  </footer>
</main>

{#snippet retry()}
  <div class="grid gap-2" role="alert">
    <p class="text-sm">{t("common.reportLoadFailed")}</p>
    <Button href="?range={data.range}" size="sm" variant="outline"
      >{t("share.retry")}</Button
    >
  </div>
{/snippet}

{#snippet listSkeleton(rows: number)}
  <div class="flex flex-col gap-4 py-1" role="status">
    <span class="sr-only">{t("share.loading")}</span>
    {#each { length: rows }, i (i)}
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-4">
          <Skeleton class="h-4 w-1/3" />
          <Skeleton class="h-4 w-16" />
        </div>
        <Skeleton class="h-1.5 w-full rounded-full" />
      </div>
    {/each}
  </div>
{/snippet}
