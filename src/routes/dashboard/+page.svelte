<script lang="ts">
  import { goto } from "$app/navigation";
  import AreaChart from "$lib/components/AreaChart.svelte";
  import BarChart from "$lib/components/BarChart.svelte";
  import DateRangePicker from "$lib/components/DateRangePicker.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import StatCard from "$lib/components/StatCard.svelte";

  let { data } = $props();
  let datePreset = $state("7d");

  $effect(() => {
    datePreset = data.range || "7d";
  });

  function handleDateChange(preset: string) {
    datePreset = preset;
    goto(`/dashboard?range=${preset}`, { replaceState: true });
  }

  const visitorIcon = `<svg class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>`;
  const pageviewIcon = `<svg class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>`;
  const browserIcon = `<svg class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>`;
  const locationIcon = `<svg class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>`;
</script>

<SEO
  title="Dashboard Overview"
  description="Real-time analytics dashboard for your GoatCounter site. View visitors, pageviews, top pages, browsers, operating systems, locations, and more."
/>

<header
  class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8 animate-fade-in"
>
  <div>
    <p class="eyebrow mb-1.5">Analytics</p>
    <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">Overview</h1>
    <p class="text-sm mt-1.5 text-muted-foreground">
      Traffic, visitors, and breakdowns for your site.
    </p>
  </div>
  <DateRangePicker value={datePreset} onchange={handleDateChange} />
</header>

{#if data.error}
  <div
    role="alert"
    class="rounded-2xl border border-error/30 bg-error/10 p-5 animate-fade-in flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
  >
    <div class="flex items-center gap-3">
      <svg
        class="w-6 h-6 text-error shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <div>
        <p class="font-semibold text-error text-sm">Failed to load analytics data</p>
        <p class="text-xs text-muted-foreground mt-0.5">{data.error}</p>
      </div>
    </div>
    <button
      type="button"
      class="btn btn-sm btn-error btn-outline"
      onclick={() => location.reload()}
    >
      Retry
    </button>
  </div>
{/if}

<!-- KPI Cards -->
<section aria-label="Key Performance Indicators" class="mb-6 sm:mb-8">
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
    <StatCard
      label="Visitors"
      value={data.total?.total?.toLocaleString() ?? "—"}
      subtext="Unique visitors"
      icon={visitorIcon}
      class="animate-fade-in animate-fade-in-delay-1"
    />

    <StatCard
      label="Pageviews"
      value={data.hits?.hits?.length?.toLocaleString() ?? "—"}
      subtext="Pages tracked"
      icon={pageviewIcon}
      class="animate-fade-in animate-fade-in-delay-2"
    />

    <StatCard
      label="Top Browser"
      value={data.browsers?.stats?.[0]?.name?.trim() ? data.browsers.stats[0].name.trim() : "Unknown"}
      subtext={data.browsers?.stats?.[0]
        ? `${data.browsers.stats[0].count.toLocaleString()} visitors`
        : undefined}
      icon={browserIcon}
      class="animate-fade-in animate-fade-in-delay-3"
    />

    <StatCard
      label="Top Country"
      value={data.locations?.stats?.[0]?.name?.trim() ? data.locations.stats[0].name.trim() : "Unknown"}
      subtext={data.locations?.stats?.[0]
        ? `${data.locations.stats[0].count.toLocaleString()} visitors`
        : undefined}
      icon={locationIcon}
      class="animate-fade-in animate-fade-in-delay-4"
    />
  </div>
</section>

<!-- Traffic Chart -->
<section
  aria-labelledby="heading-traffic"
  class="mb-6 sm:mb-8 animate-fade-in"
  style="animation-delay: 0.15s;"
>
  <div class="chart-container">
    <div class="flex items-center justify-between mb-5">
      <h2 id="heading-traffic" class="section-title">Traffic</h2>
      <a
        href="/dashboard/pages"
        class="section-link"
        aria-label="View all top pages"
      >
        View all <span aria-hidden="true">→</span>
      </a>
    </div>
    <AreaChart data={data.total?.stats ?? []} height={260} />
  </div>
</section>

<!-- Site Breakdowns -->
<section aria-labelledby="heading-breakdowns" class="mb-6 sm:mb-8">
  <h2 id="heading-breakdowns" class="sr-only">Site Breakdowns</h2>

  <!-- Pages + Browsers -->
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
    <div class="card animate-fade-in" style="animation-delay: 0.2s;">
      <div class="flex items-center justify-between mb-4">
        <h3 class="section-title">Top Pages</h3>
        <a
          href="/dashboard/pages"
          class="section-link"
          aria-label="View all top pages"
        >
          View all <span aria-hidden="true">→</span>
        </a>
      </div>
      {#if data.hits?.hits && data.hits.hits.length > 0}
        <ul
          class="list-none p-0 m-0 border-t border-border"
          aria-label="Top pages list"
        >
          {#each data.hits.hits.slice(0, 8) as hit, i}
            <li class="border-b border-border">
              <a
                href="/dashboard/pages/{hit.path_id}"
                class="list-row no-underline group"
                aria-label="{hit.path}, {hit.count.toLocaleString()} views"
              >
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                  <span class="list-index" aria-hidden="true">{i + 1}</span>
                  <span
                    class="list-name font-mono group-hover:text-primary transition-colors"
                    >{hit.path}</span
                  >
                </div>
                <span class="list-count">{hit.count.toLocaleString()}</span>
              </a>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="text-sm py-10 text-center text-muted-foreground">
          No page data available
        </p>
      {/if}
    </div>

    <div class="card animate-fade-in" style="animation-delay: 0.25s;">
      <div class="flex items-center justify-between mb-4">
        <h3 class="section-title">Browsers</h3>
        <a
          href="/dashboard/browsers"
          class="section-link"
          aria-label="View all browsers"
        >
          View all <span aria-hidden="true">→</span>
        </a>
      </div>
      {#if data.browsers?.stats && data.browsers.stats.length > 0}
        <BarChart data={data.browsers.stats} maxItems={8} />
      {:else}
        <p class="text-sm py-10 text-center text-muted-foreground">
          No browser data available
        </p>
      {/if}
    </div>
  </div>

  <!-- Systems + Locations + Languages -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
    <div class="card animate-fade-in" style="animation-delay: 0.3s;">
      <div class="flex items-center justify-between mb-4">
        <h3 class="section-title">Operating Systems</h3>
        <a
          href="/dashboard/systems"
          class="section-link"
          aria-label="View all operating systems"
        >
          All <span aria-hidden="true">→</span>
        </a>
      </div>
      {#if data.systems?.stats && data.systems.stats.length > 0}
        <BarChart data={data.systems.stats} maxItems={6} />
      {:else}
        <p class="text-sm py-10 text-center text-muted-foreground">
          No operating system data
        </p>
      {/if}
    </div>

    <div class="card animate-fade-in" style="animation-delay: 0.35s;">
      <div class="flex items-center justify-between mb-4">
        <h3 class="section-title">Locations</h3>
        <a
          href="/dashboard/locations"
          class="section-link"
          aria-label="View all locations"
        >
          All <span aria-hidden="true">→</span>
        </a>
      </div>
      {#if data.locations?.stats && data.locations.stats.length > 0}
        <BarChart data={data.locations.stats} maxItems={6} />
      {:else}
        <p class="text-sm py-10 text-center text-muted-foreground">
          No location data
        </p>
      {/if}
    </div>

    <div
      class="card sm:col-span-2 lg:col-span-1 animate-fade-in"
      style="animation-delay: 0.4s;"
    >
      <div class="flex items-center justify-between mb-4">
        <h3 class="section-title">Languages</h3>
        <a
          href="/dashboard/languages"
          class="section-link"
          aria-label="View all languages"
        >
          All <span aria-hidden="true">→</span>
        </a>
      </div>
      {#if data.languages?.stats && data.languages.stats.length > 0}
        <BarChart data={data.languages.stats} maxItems={6} />
      {:else}
        <p class="text-sm py-10 text-center text-muted-foreground">
          No language data
        </p>
      {/if}
    </div>
  </div>

  <!-- Screen Sizes -->
  <div class="card animate-fade-in" style="animation-delay: 0.45s;">
    <div class="flex items-center justify-between mb-4">
      <h3 class="section-title">Screen Sizes</h3>
      <a
        href="/dashboard/devices"
        class="section-link"
        aria-label="View all screen sizes"
      >
        View all <span aria-hidden="true">→</span>
      </a>
    </div>
    {#if data.sizes?.stats && data.sizes.stats.length > 0}
      <BarChart data={data.sizes.stats} maxItems={8} />
    {:else}
      <p class="text-sm py-10 text-center text-muted-foreground">
        No screen size data
      </p>
    {/if}
  </div>
</section>
