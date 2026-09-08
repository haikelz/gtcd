<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import AreaChart from "$lib/components/AreaChart.svelte";
  import BarChart from "$lib/components/BarChart.svelte";
  import DateRangePicker from "$lib/components/DateRangePicker.svelte";
  import DonutChart from "$lib/components/DonutChart.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import StatCard from "$lib/components/StatCard.svelte";
  import {
    ArrowUpRight,
    ChartNoAxesCombined,
    FileText,
    Globe,
    Languages,
    MapPin,
    Monitor,
    Smartphone,
    TriangleAlert,
  } from "@lucide/svelte";

  let { data } = $props();
  let datePreset = $derived(data.range || "7d");

  function handleDateChange(preset: string) {
    datePreset = preset;
    goto(resolve(`/dashboard?range=${preset}`), { replaceState: true });
  }

  const technicalReports = $derived([
    {
      title: "Operating systems",
      label: "System",
      href: "/dashboard/systems" as const,
      stats: data.systems?.stats,
      icon: Monitor,
      tone: "lavender" as const,
    },
    {
      title: "Languages",
      label: "Language",
      href: "/dashboard/languages" as const,
      stats: data.languages?.stats,
      icon: Languages,
      tone: "coral" as const,
    },
    {
      title: "Screen sizes",
      label: "Screen size",
      href: "/dashboard/devices" as const,
      stats: data.sizes?.stats,
      icon: Smartphone,
      tone: "mint" as const,
    },
  ]);
</script>

<SEO
  title="Dashboard overview"
  description="Explore your website traffic, most-viewed pages, and audience breakdowns."
  noindex
/>

<header
  class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 mb-8"
>
  <div>
    <p class="text-sm text-muted-foreground mb-2">Website analytics</p>
    <h1 class="tracking-tight text-foreground">Traffic overview</h1>
    <p class="text-sm text-muted-foreground mt-2">
      A closer look at the people behind your pageviews.
    </p>
  </div>
  <DateRangePicker value={datePreset} onchange={handleDateChange} />
</header>

{#if data.error}
  <div role="alert" class="alert alert-error mb-6">
    <TriangleAlert class="h-5 w-5 shrink-0" />
    <div>
      <p class="font-medium">We couldn't load your analytics</p>
      <p class="text-sm mt-1">{data.error}</p>
    </div>
    <button
      type="button"
      class="btn btn-sm btn-outline"
      onclick={() => location.reload()}>Retry</button
    >
  </div>
{/if}

<section class="metric-grid mb-6" aria-label="Key performance indicators">
  <StatCard
    label="Pageviews"
    value={data.total?.total?.toLocaleString() ?? "—"}
    subtext="In the selected period"
    icon={ChartNoAxesCombined}
    featured
  />
  <StatCard
    label="Tracked pages"
    value={data.hits?.hits?.length?.toLocaleString() ?? "—"}
    subtext="Paths in this report"
    icon={FileText}
  />
  <StatCard
    label="Top browser"
    class="metric-text"
    value={data.browsers?.stats?.[0]?.name?.trim() || "—"}
    subtext={data.browsers?.stats?.[0]
      ? `${data.browsers.stats[0].count.toLocaleString()} visitors`
      : "No browser data"}
    icon={Globe}
    tone="mint"
  />
  <StatCard
    label="Top country"
    class="metric-text"
    value={data.locations?.stats?.[0]?.name?.trim() || "—"}
    subtext={data.locations?.stats?.[0]
      ? `${data.locations.stats[0].count.toLocaleString()} visitors`
      : "No location data"}
    icon={MapPin}
    tone="amber"
  />
</section>

<div class="traffic-grid mb-6">
  <section class="chart-container" aria-labelledby="heading-traffic">
    <div class="panel-heading">
      <div>
        <h2 id="heading-traffic" class="section-title">Traffic over time</h2>
        <p class="text-xs text-muted-foreground mt-1">
          Daily activity across your website
        </p>
      </div>
      <span class="flex items-center gap-2 text-xs text-muted-foreground"
        ><span class="w-2 h-2 rounded-full bg-chart-1" aria-hidden="true"
        ></span>Pageviews</span
      >
    </div>
    <AreaChart data={data.total?.stats ?? []} height={280} />
  </section>
  <section class="panel" aria-labelledby="heading-audience">
    <div class="panel-heading">
      <div>
        <h2 id="heading-audience" class="section-title">Browser mix</h2>
        <p class="text-xs text-muted-foreground mt-1">
          How your audience gets here
        </p>
      </div>
      <a
        href={resolve("/dashboard/browsers")}
        class="btn btn-ghost btn-square btn-sm tooltip tooltip-left"
        aria-label="View browser report"
        data-tip="View browser report"><ArrowUpRight class="h-4 w-4" /></a
      >
    </div>
    <DonutChart data={data.browsers?.stats ?? []} />
  </section>
</div>

<div class="content-grid mb-8">
  <section class="panel" aria-labelledby="heading-pages">
    <div class="panel-heading">
      <div>
        <h2 id="heading-pages" class="section-title">Your most-read pages</h2>
        <p class="text-xs text-muted-foreground mt-1">
          The content bringing people in
        </p>
      </div>
      <a href={resolve("/dashboard/pages")} class="section-link"
        >All pages <ArrowUpRight class="h-4 w-4" /></a
      >
    </div>
    {#if data.hits?.hits?.length}
      <div
        class="flex justify-between text-xs text-muted-foreground pb-3 border-b border-border"
        aria-hidden="true"
      >
        <span>Page</span><span>Pageviews</span>
      </div>
      <ul class="list-none p-0 m-0" aria-label="Top pages">
        {#each data.hits.hits.slice(0, 6) as hit, i (hit.path_id)}
          <li class="border-b border-border last:border-0">
            <a
              href={resolve("/dashboard/pages/[id]", {
                id: String(hit.path_id),
              })}
              class="list-row no-underline group"
              aria-label="{hit.path}, {hit.count.toLocaleString()} views"
            >
              <span class="flex items-center gap-3 min-w-0">
                <span class="list-index" aria-hidden="true"
                  >{String(i + 1).padStart(2, "0")}</span
                >
                <span
                  class="list-name font-mono group-hover:text-primary"
                  title={hit.path}>{hit.path}</span
                >
              </span>
              <span class="list-count">{hit.count.toLocaleString()}</span>
            </a>
          </li>
        {/each}
      </ul>
    {:else}
      <div class="empty-state">
        <p class="empty-state-title">No page data</p>
        <p class="empty-state-desc">
          Try another date range to explore your traffic.
        </p>
      </div>
    {/if}
  </section>
  <section class="panel" aria-labelledby="heading-locations">
    <div class="panel-heading">
      <div>
        <h2 id="heading-locations" class="section-title">Where visitors are</h2>
        <p class="text-xs text-muted-foreground mt-1">
          Your audience, by country
        </p>
      </div>
      <a
        href={resolve("/dashboard/locations")}
        class="btn btn-ghost btn-square btn-sm tooltip tooltip-left"
        aria-label="View locations report"
        data-tip="View locations report"><ArrowUpRight class="h-4 w-4" /></a
      >
    </div>
    {#if data.locations?.stats?.length}
      <BarChart
        data={data.locations.stats}
        maxItems={5}
        label="Country"
        tone="mint"
      />
    {:else}
      <div class="empty-state">
        <p class="empty-state-title">No location data</p>
        <p class="empty-state-desc">
          Try another date range to explore your audience.
        </p>
      </div>
    {/if}
  </section>
</div>

<div class="flex items-center justify-between gap-4 mb-4">
  <h2 class="text-lg font-medium">A little more about your audience</h2>
  <span class="hidden sm:block text-xs text-muted-foreground"
    >Devices & preferences</span
  >
</div>
<section class="technical-grid" aria-label="Technical audience reports">
  {#each technicalReports as report (report.href)}
    <div class="panel">
      <div class="panel-heading">
        <div class="flex items-center gap-2">
          <report.icon class="h-4 w-4 text-muted-foreground" />
          <h3 class="section-title">{report.title}</h3>
        </div>
        <a
          href={resolve(report.href)}
          class="btn btn-ghost btn-square btn-sm tooltip tooltip-left"
          aria-label="View {report.title.toLowerCase()} report"
          data-tip="View {report.title.toLowerCase()} report"
          ><ArrowUpRight class="h-4 w-4" /></a
        >
      </div>
      {#if report.stats?.length}
        <BarChart
          data={report.stats}
          maxItems={4}
          label={report.label}
          tone={report.tone}
        />
      {:else}
        <div class="empty-state">
          <p class="empty-state-title">No {report.title.toLowerCase()} data</p>
          <p class="empty-state-desc">
            Try another date range to explore your audience.
          </p>
        </div>
      {/if}
    </div>
  {/each}
</section>
