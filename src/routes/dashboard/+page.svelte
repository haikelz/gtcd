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
  import {
    Frame,
    FrameDescription,
    FrameHeader,
    FramePanel,
    FrameTitle,
  } from "$lib/components/ui/frame";
  import { displayPreferences, formatCount } from "$lib/display";
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
  const sharedScaleMax = $derived(
    page.url.searchParams.get("scale") === "shared" && data.hits?.hits
      ? statsScaleMax(data.hits.hits.slice(0, 6), groups.group)
      : undefined
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

  const technicalReports = $derived([
    {
      id: "systems" as const,
      title: "Operating systems",
      label: "System",
      href: "/dashboard/systems" as const,
      stats: data.systems?.stats,
      icon: Monitor,
      tone: "chart-5" as const,
    },
    {
      id: "languages" as const,
      title: "Languages",
      label: "Language",
      href: "/dashboard/languages" as const,
      stats: data.languages?.stats,
      icon: Languages,
      tone: "chart-4" as const,
    },
    {
      id: "sizes" as const,
      title: "Screen sizes",
      label: "Screen size",
      href: "/dashboard/devices" as const,
      stats: data.sizes?.stats,
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
  description="A closer look at the people behind your pageviews."
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
        Check if your adblocker is blocking GoatCounter if you don't see any
        pageviews. This message disappears once data arrives.
      </p>
    </AlertDescription>
    <AlertAction>
      <Button href={resolve("/dashboard/settings")} size="sm" variant="outline">
        Site settings
      </Button>
    </AlertAction>
  </Alert>
{/if}

{#if data.error}
  <ErrorAlert
    class="mb-4"
    message={data.error}
    title="We couldn't load your analytics"
  />
{/if}

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
    <StatCard
      icon={ChartNoAxesCombined}
      label="Pageviews"
      subtext={data.total?.total_events
        ? `Includes ${formatCount(data.total.total_events)} events`
        : "In the selected period"}
      value={data.total ? formatCount(data.total.total) : "—"}
    />
    <StatCard
      icon={FileText}
      label="Tracked pages"
      subtext="Paths in this report"
      value={data.hits ? formatCount(data.hits.hits.length) : "—"}
    />
    <StatCard
      compact
      icon={Globe}
      label="Top browser"
      subtext={data.browsers?.stats?.[0]
        ? `${formatCount(data.browsers.stats[0].count)} visitors`
        : "No browser data"}
      value={data.browsers?.stats?.[0]?.name?.trim() || "—"}
    />
    <StatCard
      compact
      icon={MapPin}
      label="Top country"
      subtext={data.locations?.stats?.[0]
        ? `${formatCount(data.locations.stats[0].count)} visitors`
        : "No location data"}
      value={data.locations?.stats?.[0]?.name?.trim() || "—"}
    />
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
        Pageviews
      </span>
    </FrameHeader>
    <FramePanel>
      <AreaChart
        data={data.total?.stats ?? []}
        group={groups.group}
        height={280}
      />
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
      <DonutChart data={data.browsers?.stats ?? []} />
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
      {#if data.hits?.hits?.length}
        <div
          aria-hidden="true"
          class="flex justify-between border-b border-border px-2 pb-2 text-xs text-muted-foreground"
        >
          <span>Page</span><span>Pageviews</span>
        </div>
        <ul aria-label="Top pages" class="m-0 list-none p-0">
          {#each data.hits.hits.slice(0, 6) as hit, i (hit.path_id)}
            <PageRow
              diff={data.diffs?.[hit.path_id]}
              group={groups.group}
              {hit}
              href={resolve("/dashboard/pages/[id]", {
                id: String(hit.path_id),
              })}
              {linkDomain}
              rank={i + 1}
              scaleMax={sharedScaleMax}
            />
          {/each}
        </ul>
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
      {#if data.locations?.stats?.length}
        <BarChart
          data={data.locations.stats}
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
      {#if report.stats?.length}
        <BarChart
          data={report.stats}
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
    </FramePanel>
  </Frame>
{/snippet}
