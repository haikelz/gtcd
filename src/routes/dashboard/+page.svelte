<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import AreaChart from "$lib/components/AreaChart.svelte";
  import BarChart from "$lib/components/BarChart.svelte";
  import DashboardToolbar from "$lib/components/DashboardToolbar.svelte";
  import DonutChart from "$lib/components/DonutChart.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import PageRow from "$lib/components/PageRow.svelte";
  import ScaleToggle from "$lib/components/ScaleToggle.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import StatCard from "$lib/components/StatCard.svelte";
  import OverviewComparison from "$lib/components/OverviewComparison.svelte";
  import { showToast } from "$lib/components/toast.js";
  import ErrorAlert from "$lib/components/ErrorAlert.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
  } from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import {
    Frame,
    FrameDescription,
    FrameHeader,
    FramePanel,
    FrameTitle,
  } from "$lib/components/ui/frame";
  import { widgetLimit, widgetStyle } from "$lib/dashboard-layout";
  import {
    displayPreferences,
    formatCount,
    numbersHidden,
    t,
  } from "$lib/display";
  import type { HitList } from "$lib/types";
  import {
    formatRangeLabel,
    groupForRange,
    previousRange,
    rangeFromParams,
    statsScaleMax,
  } from "$lib/period.js";
  import { wallClockNow } from "$lib/preferences";
  import {
    ArrowUpRight,
    ChartNoAxesCombined,
    FileText,
    Globe,
    Languages,
    Link2,
    Megaphone,
    Info,
    MapPin,
    Monitor,
    SlidersHorizontal,
    Smartphone,
  } from "@lucide/svelte";

  let { data } = $props();

  const preferences = $derived(displayPreferences());
  const range = $derived(
    rangeFromParams(page.url.searchParams, wallClockNow(preferences.timezone))
  );
  const groups = $derived(
    groupForRange(range.start, range.end, page.url.searchParams.get("group"))
  );
  const prev = $derived(previousRange(range.start, range.end));

  const linkDomain = $derived(data.site?.linkDomain ?? "");
  const customizeHref = $derived(
    page.url.searchParams.get("site")
      ? `${resolve("/dashboard/customize")}?site=${page.url.searchParams.get("site")}`
      : resolve("/dashboard/customize")
  );
  const receivedData = $derived(data.site?.receivedData !== false);
  const snippetEndpoint = $derived(
    data.vhost ? `https://${data.vhost}` : page.url.origin
  );
  const trafficDescription = $derived(
    {
      hour: t("overview.trafficHour"),
      day: t("overview.trafficDay"),
      week: t("overview.trafficWeek"),
      month: t("overview.trafficMonth"),
    }[groups.group]
  );
  const prevPeriodLabel = $derived(
    formatRangeLabel(
      prev.start,
      prev.end,
      preferences.dateFormat,
      preferences.locale
    )
  );

  const visibleWidgets = $derived(
    (data.dashboardLayout?.widgets ?? [])
      .filter((widget) => !widget.hidden)
      .map((widget) => widget.id)
  );

  type TechnicalReport = (typeof technicalReports)[number];

  function sharedScaleMax(hits: readonly HitList[]): number | undefined {
    return page.url.searchParams.get("scale") === "shared"
      ? statsScaleMax(hits, groups.group)
      : undefined;
  }

  const layout = $derived(data.dashboardLayout);
  const pagesLimit = $derived(layout ? widgetLimit(layout, "pages") : 6);
  const trafficStyle = $derived(
    layout && widgetStyle(layout, "traffic") === "bar" ? "bar" : "line"
  );
  const pagesStyle = $derived(layout ? widgetStyle(layout, "pages") : "line");

  const technicalReports = $derived([
    {
      id: "referrers" as const,
      title: t("overview.reportReferrers"),
      label: t("overview.labelReferrer"),
      href: "/dashboard/referrers" as const,
      stats: data.referrers,
      icon: Link2,
      tone: "chart-3" as const,
    },
    {
      id: "campaigns" as const,
      title: t("overview.reportCampaigns"),
      label: t("overview.labelCampaign"),
      href: "/dashboard/campaigns" as const,
      stats: data.campaigns,
      icon: Megaphone,
      tone: "chart-1" as const,
    },
    {
      id: "systems" as const,
      title: t("overview.reportSystems"),
      label: t("overview.labelSystem"),
      href: "/dashboard/systems" as const,
      stats: data.systems,
      icon: Monitor,
      tone: "chart-5" as const,
    },
    {
      id: "languages" as const,
      title: t("overview.reportLanguages"),
      label: t("overview.labelLanguage"),
      href: "/dashboard/languages" as const,
      stats: data.languages,
      icon: Languages,
      tone: "chart-4" as const,
    },
    {
      id: "sizes" as const,
      title: t("overview.reportSizes"),
      label: t("overview.labelScreenSize"),
      href: "/dashboard/devices" as const,
      stats: data.sizes,
      icon: Smartphone,
      tone: "chart-2" as const,
    },
  ]);
</script>

<SEO
  description={t("overview.seoDescription")}
  noindex
  title={t("overview.seoTitle")}
/>

<PageHeader
  description={t("overview.pageDescription")}
  title={t("overview.pageTitle")}
>
  {#snippet actions()}
    <Button href={customizeHref} variant="outline">
      <SlidersHorizontal />
      {t("overview.customize")}
    </Button>
  {/snippet}
</PageHeader>

<DashboardToolbar showFilter showGroup />

{#if !receivedData}
  <Alert class="mb-4" role="status" variant="info">
    <Info />
    <AlertTitle>{t("overview.noDataTitle")}</AlertTitle>
    <AlertDescription>
      <p>
        {t("overview.noDataIntro")}
      </p>
      <pre
        class="w-full max-w-full overflow-x-auto rounded-md border border-border bg-muted p-2.5 font-mono text-xs text-foreground"><code
          >&lt;script data-goatcounter="{snippetEndpoint}/count"
        async src="//gc.zgo.at/count.js"&gt;&lt;/script&gt;</code
        ></pre>
      <p>
        {t("overview.noDataBlocker")}
      </p>
    </AlertDescription>
    <AlertAction>
      {#if data.isAdmin}
        <form
          action="/dashboard/settings?/sendTestVisit"
          method="POST"
          use:enhance={() =>
            async ({ result }) => {
              if (result.type === "success") {
                showToast(t("overview.testVisitSent"), "success");
              } else if (result.type === "failure") {
                showToast(
                  String(result.data?.message ?? t("overview.testVisitFailed")),
                  "error"
                );
              }
            }}
        >
          <Button size="sm" type="submit" variant="outline">
            {t("overview.sendTestVisit")}
          </Button>
        </form>
      {/if}
      <Button href={resolve("/dashboard/settings")} size="sm" variant="outline">
        {t("overview.siteSettings")}
      </Button>
    </AlertAction>
  </Alert>
{/if}

{#await data.error then error}
  {#if error}
    <ErrorAlert class="mb-4" message={error} title={t("overview.errorTitle")} />
  {/if}
{/await}

{#if !visibleWidgets.includes("kpis")}
  <div class="mb-6">{@render comparisonWidget()}</div>
{/if}

<div class="grid gap-6 xl:grid-flow-dense xl:grid-cols-12">
  {#each visibleWidgets as widgetId (widgetId)}
    {#if widgetId === "kpis"}
      {@render kpiWidget()}
      <div class="xl:col-span-12">{@render comparisonWidget()}</div>
    {:else if widgetId === "traffic"}
      {@render trafficWidget()}
    {:else if widgetId === "browsers"}
      {@render browsersWidget()}
    {:else if widgetId === "pages"}
      {@render pagesWidget()}
    {:else if widgetId === "locations"}
      {@render locationsWidget()}
    {:else}
      {@const report = technicalReports.find((entry) => entry.id === widgetId)}
      {#if report}
        {@render technicalWidget(report)}
      {/if}
    {/if}
  {/each}
</div>

{#snippet comparisonWidget()}
  {#if visibleWidgets.some( (id) => ["kpis", "traffic", "browsers", "locations"].includes(id) )}
    <OverviewComparison
      browsers={data.browsers}
      locations={data.locations}
      period={prevPeriodLabel}
      previous={data.comparison}
      showBrowsers={visibleWidgets.includes("kpis") ||
        visibleWidgets.includes("browsers")}
      showLocations={visibleWidgets.includes("kpis") ||
        visibleWidgets.includes("locations")}
      showTotal={visibleWidgets.includes("kpis") ||
        visibleWidgets.includes("traffic")}
      total={data.total}
    />
  {/if}
{/snippet}

{#snippet kpiWidget()}
  <section
    aria-label={t("overview.kpiLabel")}
    class="grid grid-cols-2 gap-4 xl:col-span-12 xl:grid-cols-4"
  >
    {#await data.total}
      <StatCard
        icon={ChartNoAxesCombined}
        label={t("overview.visits")}
        loading
      />
    {:then total}
      <StatCard
        icon={ChartNoAxesCombined}
        label={t("overview.visits")}
        subtext={numbersHidden()
          ? t("overview.kpiHidden")
          : total?.total_events
            ? t("overview.kpiIncludesEvents", {
                count: formatCount(total.total_events),
              })
            : t("overview.kpiInPeriod")}
        value={total && !numbersHidden() ? formatCount(total.total) : "—"}
      />
    {/await}
    {#await data.hits}
      <StatCard icon={FileText} label={t("overview.kpiTrackedPages")} loading />
    {:then hits}
      <StatCard
        icon={FileText}
        label={t("overview.kpiTrackedPages")}
        subtext={t("overview.kpiPathsInReport")}
        value={hits ? formatCount(hits.hits.length) : "—"}
      />
    {/await}
    {#await data.browsers}
      <StatCard icon={Globe} label={t("overview.kpiTopBrowser")} loading />
    {:then browsers}
      <StatCard
        compact
        icon={Globe}
        label={t("overview.kpiTopBrowser")}
        subtext={!browsers?.stats?.[0]
          ? t("overview.noBrowserData")
          : numbersHidden()
            ? t("overview.kpiMostVisits")
            : t("overview.kpiVisitCount", {
                count: formatCount(browsers.stats[0].count),
              })}
        value={browsers?.stats?.[0]?.name?.trim() || "—"}
      />
    {/await}
    {#await data.locations}
      <StatCard icon={MapPin} label={t("overview.kpiTopCountry")} loading />
    {:then locations}
      <StatCard
        compact
        icon={MapPin}
        label={t("overview.kpiTopCountry")}
        subtext={!locations?.stats?.[0]
          ? t("overview.noLocationData")
          : numbersHidden()
            ? t("overview.kpiMostVisits")
            : t("overview.kpiVisitCount", {
                count: formatCount(locations.stats[0].count),
              })}
        value={locations?.stats?.[0]?.name?.trim() || "—"}
      />
    {/await}
  </section>
{/snippet}

{#snippet trafficWidget()}
  <Frame
    aria-labelledby="heading-traffic"
    class="xl:col-span-8"
    dense
    spacing="default"
    role="region"
  >
    <FrameHeader class="flex-row items-center justify-between gap-3">
      <div class="min-w-0">
        <FrameTitle id="heading-traffic"
          >{t("overview.trafficTitle")}</FrameTitle
        >
        <FrameDescription class="text-xs">{trafficDescription}</FrameDescription
        >
      </div>
      <span
        class="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"
      >
        <span aria-hidden="true" class="size-2 rounded-full bg-chart-1"></span>
        {t("overview.visits")}
      </span>
    </FrameHeader>
    <FramePanel>
      {#await data.total}
        <div class="flex flex-col gap-4" role="status">
          <span class="sr-only">{t("overview.loadingTraffic")}</span>
          <div class="flex gap-6">
            <Skeleton class="h-10 w-20" />
            <Skeleton class="h-10 w-20" />
          </div>
          <Skeleton class="h-[240px] w-full" />
        </div>
      {:then total}
        <AreaChart
          data={total?.stats ?? []}
          group={groups.group}
          height={280}
          style={trafficStyle}
        />
      {/await}
    </FramePanel>
  </Frame>
{/snippet}

{#snippet browsersWidget()}
  <Frame
    aria-labelledby="heading-audience"
    class="xl:col-span-4"
    dense
    spacing="default"
    role="region"
  >
    <FrameHeader class="flex-row items-center justify-between gap-3">
      <div class="min-w-0">
        <FrameTitle id="heading-audience"
          >{t("overview.browserMixTitle")}</FrameTitle
        >
        <FrameDescription class="text-xs">
          {t("overview.browserMixDescription")}
        </FrameDescription>
      </div>
      <Button
        aria-label={t("overview.viewBrowserReport")}
        href={resolve("/dashboard/browsers")}
        size="icon-sm"
        title={t("overview.viewBrowserReport")}
        variant="ghost"
      >
        <ArrowUpRight />
      </Button>
    </FrameHeader>
    <FramePanel>
      {#await data.browsers}
        <div class="flex flex-col items-center gap-5" role="status">
          <span class="sr-only">{t("overview.loadingBrowserMix")}</span>
          <Skeleton class="size-44 rounded-full" />
          {@render listSkeleton(4)}
        </div>
      {:then browsers}
        <DonutChart data={browsers?.stats ?? []} />
      {/await}
    </FramePanel>
  </Frame>
{/snippet}

{#snippet pagesWidget()}
  <Frame
    aria-labelledby="heading-pages"
    class="xl:col-span-8"
    dense
    spacing="default"
    role="region"
  >
    <FrameHeader class="flex-row flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <FrameTitle id="heading-pages">{t("overview.pagesTitle")}</FrameTitle>
        <FrameDescription class="text-xs">
          {t("overview.pagesDescription")}
        </FrameDescription>
      </div>
      <div class="flex items-center gap-1">
        <ScaleToggle />
        <Button href={resolve("/dashboard/pages")} size="sm" variant="ghost">
          {t("overview.allPages")}
          <ArrowUpRight />
        </Button>
      </div>
    </FrameHeader>
    <FramePanel>
      {#await data.hits}
        <div role="status">
          <span class="sr-only">{t("overview.loadingPages")}</span>
          {@render listSkeleton(Math.min(pagesLimit, 10))}
        </div>
      {:then hits}
        {#if hits?.hits?.length}
          {@const topHits = hits.hits.slice(0, pagesLimit)}
          <div
            aria-hidden="true"
            class="flex justify-between border-b border-border px-2 pb-2 text-xs text-muted-foreground"
          >
            <span>{t("overview.pageColumn")}</span><span
              >{t("overview.visits")}</span
            >
          </div>
          {#await data.diffs}
            {@render pageRows(topHits, null)}
          {:then diffs}
            {@render pageRows(topHits, diffs)}
          {/await}
          <p class="mt-3 px-2 text-xs text-muted-foreground">
            {t("overview.changeVsPrevious", { period: prevPeriodLabel })}
          </p>
        {:else}
          <EmptyState
            desc={t("overview.emptyPagesDescription")}
            icon={FileText}
            title={t("overview.noPageData")}
          />
        {/if}
      {/await}
    </FramePanel>
  </Frame>
{/snippet}

{#snippet locationsWidget()}
  <Frame
    aria-labelledby="heading-locations"
    class="xl:col-span-4"
    dense
    spacing="default"
    role="region"
  >
    <FrameHeader class="flex-row items-center justify-between gap-3">
      <div class="min-w-0">
        <FrameTitle id="heading-locations"
          >{t("overview.locationsTitle")}</FrameTitle
        >
        <FrameDescription class="text-xs">
          {t("overview.locationsDescription")}
        </FrameDescription>
      </div>
      <Button
        aria-label={t("overview.viewLocationsReport")}
        href={resolve("/dashboard/locations")}
        size="icon-sm"
        title={t("overview.viewLocationsReport")}
        variant="ghost"
      >
        <ArrowUpRight />
      </Button>
    </FrameHeader>
    <FramePanel>
      {#await data.locations}
        <div role="status">
          <span class="sr-only">{t("overview.loadingLocations")}</span>
          {@render listSkeleton(5)}
        </div>
      {:then locations}
        {#if locations?.stats?.length}
          <BarChart
            data={locations.stats}
            label={t("overview.labelCountry")}
            maxItems={layout ? widgetLimit(layout, "locations") : 5}
            tone="chart-2"
          />
        {:else}
          <EmptyState
            desc={t("overview.emptyAudienceDescription")}
            icon={MapPin}
            title={t("overview.noLocationData")}
          />
        {/if}
      {/await}
    </FramePanel>
  </Frame>
{/snippet}

{#snippet technicalWidget(report: TechnicalReport)}
  <Frame
    aria-labelledby="heading-{report.id}"
    class="xl:col-span-4"
    dense
    spacing="default"
    role="region"
  >
    <FrameHeader class="flex-row items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2">
        <report.icon
          aria-hidden="true"
          class="size-4 shrink-0 text-muted-foreground"
        />
        <FrameTitle id="heading-{report.id}">{report.title}</FrameTitle>
      </div>
      <Button
        aria-label={t("overview.viewReport", {
          name: report.title.toLowerCase(),
        })}
        href={resolve(report.href)}
        size="icon-sm"
        title={t("overview.viewReport", { name: report.title.toLowerCase() })}
        variant="ghost"
      >
        <ArrowUpRight />
      </Button>
    </FrameHeader>
    <FramePanel>
      {#await report.stats}
        <div role="status">
          <span class="sr-only"
            >{t("overview.loadingReport", {
              name: report.title.toLowerCase(),
            })}</span
          >
          {@render listSkeleton(4)}
        </div>
      {:then result}
        {#if result?.stats?.length}
          <BarChart
            data={result.stats}
            label={report.label}
            maxItems={layout ? widgetLimit(layout, report.id) : 4}
            tone={report.tone}
          />
        {:else}
          <EmptyState
            desc={t("overview.emptyAudienceDescription")}
            icon={report.icon}
            title={t("overview.emptyReportTitle", {
              name: report.title.toLowerCase(),
            })}
          />
        {/if}
      {/await}
    </FramePanel>
  </Frame>
{/snippet}

{#snippet pageRows(
  hits: readonly HitList[],
  diffs: Record<number, number | null> | null
)}
  <ul aria-label={t("overview.topPages")} class="m-0 list-none p-0">
    {#each hits as hit, i (hit.path_id)}
      <PageRow
        diff={diffs?.[hit.path_id]}
        group={groups.group}
        {hit}
        href={resolve("/dashboard/pages/[id]", {
          id: String(hit.path_id),
        })}
        {linkDomain}
        chartStyle={pagesStyle}
        rank={i + 1}
        scaleMax={sharedScaleMax(hits)}
      />
    {/each}
  </ul>
{/snippet}

{#snippet listSkeleton(rows: number)}
  <div class="flex w-full flex-col gap-4 py-1">
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
