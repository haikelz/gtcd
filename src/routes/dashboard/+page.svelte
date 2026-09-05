<script lang="ts">
  import { goto } from "$app/navigation";
  import AreaChart from "$lib/components/AreaChart.svelte";
  import BarChart from "$lib/components/BarChart.svelte";
  import DateRangePicker from "$lib/components/DateRangePicker.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import StatCard from "$lib/components/StatCard.svelte";

  let { data } = $props();
  let datePreset = $state("7d");
  $effect(() => { datePreset = data.range || "7d"; });

  function handleDateChange(preset: string) {
    datePreset = preset;
    goto(`/dashboard?range=${preset}`, { replaceState: true });
  }

  const breakdowns = $derived([
    { title: "Browsers", label: "Browser", href: "/dashboard/browsers", stats: data.browsers?.stats },
    { title: "Locations", label: "Country", href: "/dashboard/locations", stats: data.locations?.stats },
    { title: "Operating systems", label: "System", href: "/dashboard/systems", stats: data.systems?.stats },
    { title: "Languages", label: "Language", href: "/dashboard/languages", stats: data.languages?.stats },
    { title: "Screen sizes", label: "Screen size", href: "/dashboard/devices", stats: data.sizes?.stats },
  ]);
</script>

<SEO title="Dashboard overview" description="Explore your website traffic, most-viewed pages, and audience breakdowns." noindex />

<header class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 mb-8">
  <div>
    <p class="eyebrow">Your website, at a glance</p>
    <h1 class="text-3xl tracking-tight text-foreground">Overview</h1>
    <p class="text-sm mt-2 text-muted-foreground">A little context for every visit.</p>
  </div>
  <DateRangePicker value={datePreset} onchange={handleDateChange} />
</header>

{#if data.error}
  <div role="alert" class="alert alert-error mb-6">
    <div><p class="font-medium">We couldn't load your analytics</p><p class="text-sm mt-1">{data.error}</p></div>
    <button type="button" class="btn btn-sm btn-outline" onclick={() => location.reload()}>Retry</button>
  </div>
{/if}

<section class="metric-strip mb-6" aria-label="Key performance indicators">
  <StatCard label="Pageviews" value={data.total?.total?.toLocaleString() ?? "—"} subtext="In the selected period" />
  <StatCard label="Tracked pages" value={data.hits?.hits?.length?.toLocaleString() ?? "—"} subtext="Paths in this report" />
  <StatCard label="Top browser" value={data.browsers?.stats?.[0]?.name?.trim() || "—"}
    subtext={data.browsers?.stats?.[0] ? `${data.browsers.stats[0].count.toLocaleString()} visitors` : "No browser data"} />
  <StatCard label="Top country" value={data.locations?.stats?.[0]?.name?.trim() || "—"}
    subtext={data.locations?.stats?.[0] ? `${data.locations.stats[0].count.toLocaleString()} visitors` : "No location data"} />
</section>

<section class="chart-container mb-6" aria-labelledby="heading-traffic">
  <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
    <div>
      <h2 id="heading-traffic" class="section-title">Traffic over time</h2>
      <p class="text-xs text-muted-foreground mt-1">Daily activity across your website</p>
    </div>
    <span class="inline-flex items-center gap-2 text-xs text-muted-foreground"><span class="w-4 h-0.5 bg-primary" aria-hidden="true"></span>Pageviews</span>
  </div>
  <AreaChart data={data.total?.stats ?? []} height={280} />
</section>

<section aria-label="Content and audience reports" class="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div class="panel">
    <div class="flex items-center justify-between gap-4 mb-3">
      <h2 class="section-title">Top pages</h2>
      <a href="/dashboard/pages" class="section-link">View report <span aria-hidden="true">↗</span></a>
    </div>
    {#if data.hits?.hits?.length}
      <div class="flex justify-between text-xs text-muted-foreground pb-3 border-b border-border" aria-hidden="true"><span>Page</span><span>Views</span></div>
      <ul class="list-none p-0 m-0" aria-label="Top pages">
        {#each data.hits.hits.slice(0, 6) as hit, i}
          <li class="border-b border-border last:border-0">
            <a href="/dashboard/pages/{hit.path_id}" class="list-row no-underline group" aria-label="{hit.path}, {hit.count.toLocaleString()} views">
              <span class="flex items-center gap-3 min-w-0">
                <span class="list-index" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <span class="list-name font-mono group-hover:text-primary" title={hit.path}>{hit.path}</span>
              </span>
              <span class="list-count">{hit.count.toLocaleString()}</span>
            </a>
          </li>
        {/each}
      </ul>
    {:else}
      <div class="empty-state"><p class="empty-state-title">No page data</p><p class="empty-state-desc">Try another date range to explore your traffic.</p></div>
    {/if}
  </div>
  {#each breakdowns as report}
    <div class="panel">
      <div class="flex items-center justify-between gap-4 mb-3">
        <h2 class="section-title">{report.title}</h2>
        <a href={report.href} class="section-link" aria-label="View {report.title.toLowerCase()} report">View report <span aria-hidden="true">↗</span></a>
      </div>
      {#if report.stats?.length}
        <BarChart data={report.stats} maxItems={6} label={report.label} />
      {:else}
        <div class="empty-state"><p class="empty-state-title">No {report.title.toLowerCase()} data</p><p class="empty-state-desc">Try another date range to explore your audience.</p></div>
      {/if}
    </div>
  {/each}
</section>
