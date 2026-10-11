<script lang="ts">
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
  import { displayPreferences, formatCount } from "$lib/display";
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
      hour: "Hourly activity across your website",
      day: "Daily activity across your website",
      week: "Weekly activity across your website",
      month: "Monthly activity across your website",
    }[groups.group]
  );
  const prevPeriodLabel = $derived(
    formatRangeLabel(prev.start, prev.end, preferences.dateFormat)
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

  const technicalReports = $derived([
    {
      id: "systems" as const,
      title: "Operating systems",
      label: "System",
      href: "/dashboard/systems" as const,
      stats: data.systems,
      icon: Monitor,
      tone: "chart-5" as const,
    },
    {
      id: "languages" as const,
      title: "Languages",
      label: "Language",
      href: "/dashboard/languages" as const,
      stats: data.languages,
      icon: Languages,
      tone: "chart-4" as const,
    },
    {
      id: "sizes" as const,
      title: "Screen sizes",
      label: "Screen size",
      href: "/dashboard/devices" as const,
      stats: data.sizes,
      icon: Smartphone,
      tone: "chart-2" as const,
    },
  ]);
</script>

<SEO
  description="Explore your website traffic, most-viewed pages, and audience breakdowns."
  noindex
  title="Dashboard overview"
/>

<PageHeader
  description="Who visits your site, and what they read."
  title="Traffic overview"
>
  {#snippet actions()}
    <Button href={customizeHref} variant="outline">
      <SlidersHorizontal />
      Customize
    </Button>
  {/snippet}
</PageHeader>

<DashboardToolbar showFilter showGroup />

{#if !receivedData}
  <Alert class="mb-4" role="status" variant="info">
    <Info />
    <AlertTitle>No data received yet</AlertTitle>
    <AlertDescription>
      <p>
        gtcd is connected, but GoatCounter hasn't received any hits yet. Add the
        tracking snippet anywhere on your page:
      </p>
      <pre
        class="w-full max-w-full overflow-x-auto rounded-md border border-border bg-muted p-2.5 font-mono text-xs text-foreground"><code
          >&lt;script data-goatcounter="{snippetEndpoint}/count"
        async src="//gc.zgo.at/count.js"&gt;&lt;/script&gt;</code
        ></pre>
      <p>
        If visits don't show up, check whether an ad blocker is blocking
        GoatCounter. This message disappears once data arrives.
      </p>
    </AlertDescription>
    <AlertAction>
      <Button href={resolve("/dashboard/settings")} size="sm" variant="outline">
        Site settings
      </Button>
    </AlertAction>
  </Alert>
{/if}

{#await data.error then error}
  {#if error}
    <ErrorAlert
      class="mb-4"
      message={error}
      title="We couldn't load your analytics"
    />
  {/if}
{/await}

<div class="grid gap-4 xl:grid-flow-dense xl:grid-cols-12">
  {#each visibleWidgets as widgetId (widgetId)}
    {#if widgetId === "kpis"}
      {@render kpiWidget()}
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

{#snippet kpiWidget()}
  <section
    aria-label="Key performance indicators"
    class="grid grid-cols-2 gap-4 xl:col-span-12 xl:grid-cols-4"
  >
    {#await data.total}
      <StatCard icon={ChartNoAxesCombined} label="Visits" loading />
    {:then total}
      <StatCard
        icon={ChartNoAxesCombined}
        label="Visits"
        subtext={total?.total_events
          ? `Includes ${formatCount(total.total_events)} events`
          : "In the selected period"}
        value={total ? formatCount(total.total) : "—"}
      />
    {/await}
    {#await data.hits}
      <StatCard icon={FileText} label="Tracked pages" loading />
    {:then hits}
      <StatCard
        icon={FileText}
        label="Tracked pages"
        subtext="Paths in this report"
        value={hits ? formatCount(hits.hits.length) : "—"}
      />
    {/await}
    {#await data.browsers}
      <StatCard icon={Globe} label="Top browser" loading />
    {:then browsers}
      <StatCard
        compact
        icon={Globe}
        label="Top browser"
        subtext={browsers?.stats?.[0]
          ? `${formatCount(browsers.stats[0].count)} visits`
          : "No browser data"}
        value={browsers?.stats?.[0]?.name?.trim() || "—"}
      />
    {/await}
    {#await data.locations}
      <StatCard icon={MapPin} label="Top country" loading />
    {:then locations}
      <StatCard
        compact
        icon={MapPin}
        label="Top country"
        subtext={locations?.stats?.[0]
          ? `${formatCount(locations.stats[0].count)} visits`
          : "No location data"}
        value={locations?.stats?.[0]?.name?.trim() || "—"}
      />
    {/await}
  </section>
{/snippet}

{#snippet trafficWidget()}
  <Frame aria-labelledby="heading-traffic" class="xl:col-span-8" role="region">
    <FrameHeader class="flex-row items-center justify-between gap-3">
      <div class="min-w-0">
        <FrameTitle id="heading-traffic">Traffic over time</FrameTitle>
        <FrameDescription class="text-xs">{trafficDescription}</FrameDescription
        >
      </div>
      <span
        class="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"
      >
        <span aria-hidden="true" class="size-2 rounded-full bg-chart-1"></span>
        Visits
      </span>
    </FrameHeader>
    <FramePanel>
      {#await data.total}
        <div class="flex flex-col gap-4" role="status">
          <span class="sr-only">Loading traffic chart</span>
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
        />
      {/await}
    </FramePanel>
  </Frame>
{/snippet}

{#snippet browsersWidget()}
  <Frame aria-labelledby="heading-audience" class="xl:col-span-4" role="region">
    <FrameHeader class="flex-row items-center justify-between gap-3">
      <div class="min-w-0">
        <FrameTitle id="heading-audience">Browser mix</FrameTitle>
        <FrameDescription class="text-xs">
          How your audience gets here
        </FrameDescription>
      </div>
      <Button
        aria-label="View browser report"
        href={resolve("/dashboard/browsers")}
        size="icon-sm"
        title="View browser report"
        variant="ghost"
      >
        <ArrowUpRight />
      </Button>
    </FrameHeader>
    <FramePanel>
      {#await data.browsers}
        <div class="flex flex-col items-center gap-5" role="status">
          <span class="sr-only">Loading browser mix</span>
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
  <Frame aria-labelledby="heading-pages" class="xl:col-span-8" role="region">
    <FrameHeader class="flex-row flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <FrameTitle id="heading-pages">Your most-read pages</FrameTitle>
        <FrameDescription class="text-xs">
          The content bringing people in
        </FrameDescription>
      </div>
      <div class="flex items-center gap-1">
        <ScaleToggle />
        <Button href={resolve("/dashboard/pages")} size="sm" variant="ghost">
          All pages
          <ArrowUpRight />
        </Button>
      </div>
    </FrameHeader>
    <FramePanel>
      {#await data.hits}
        <div role="status">
          <span class="sr-only">Loading most-read pages</span>
          {@render listSkeleton(6)}
        </div>
      {:then hits}
        {#if hits?.hits?.length}
          {@const topHits = hits.hits.slice(0, 6)}
          <div
            aria-hidden="true"
            class="flex justify-between border-b border-border px-2 pb-2 text-xs text-muted-foreground"
          >
            <span>Page</span><span>Visits</span>
          </div>
          {#await data.diffs}
            {@render pageRows(topHits, null)}
          {:then diffs}
            {@render pageRows(topHits, diffs)}
          {/await}
          <p class="mt-3 px-2 text-xs text-muted-foreground">
            Change vs. previous period: {prevPeriodLabel}.
          </p>
        {:else}
          <EmptyState
            desc="Try another date range or filter to explore your traffic."
            icon={FileText}
            title="No page data"
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
    role="region"
  >
    <FrameHeader class="flex-row items-center justify-between gap-3">
      <div class="min-w-0">
        <FrameTitle id="heading-locations">Where visitors are</FrameTitle>
        <FrameDescription class="text-xs">
          Your audience, by country
        </FrameDescription>
      </div>
      <Button
        aria-label="View locations report"
        href={resolve("/dashboard/locations")}
        size="icon-sm"
        title="View locations report"
        variant="ghost"
      >
        <ArrowUpRight />
      </Button>
    </FrameHeader>
    <FramePanel>
      {#await data.locations}
        <div role="status">
          <span class="sr-only">Loading locations</span>
          {@render listSkeleton(5)}
        </div>
      {:then locations}
        {#if locations?.stats?.length}
          <BarChart
            data={locations.stats}
            label="Country"
            maxItems={5}
            tone="chart-2"
          />
        {:else}
          <EmptyState
            desc="Try another date range to explore your audience."
            icon={MapPin}
            title="No location data"
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
        aria-label="View {report.title.toLowerCase()} report"
        href={resolve(report.href)}
        size="icon-sm"
        title="View {report.title.toLowerCase()} report"
        variant="ghost"
      >
        <ArrowUpRight />
      </Button>
    </FrameHeader>
    <FramePanel>
      {#await report.stats}
        <div role="status">
          <span class="sr-only">Loading {report.title.toLowerCase()}</span>
          {@render listSkeleton(4)}
        </div>
      {:then result}
        {#if result?.stats?.length}
          <BarChart
            data={result.stats}
            label={report.label}
            maxItems={4}
            tone={report.tone}
          />
        {:else}
          <EmptyState
            desc="Try another date range to explore your audience."
            icon={report.icon}
            title="No {report.title.toLowerCase()} data"
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
  <ul aria-label="Top pages" class="m-0 list-none p-0">
    {#each hits as hit, i (hit.path_id)}
      <PageRow
        diff={diffs?.[hit.path_id]}
        group={groups.group}
        {hit}
        href={resolve("/dashboard/pages/[id]", {
          id: String(hit.path_id),
        })}
        {linkDomain}
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
