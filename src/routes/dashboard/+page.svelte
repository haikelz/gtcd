<script lang="ts">
  import { goto } from "$app/navigation";
  import AreaChart from "$lib/components/AreaChart.svelte";
  import BarChart from "$lib/components/BarChart.svelte";
  import DateRangePicker from "$lib/components/DateRangePicker.svelte";
  import SEO from "$lib/components/SEO.svelte";

  let { data } = $props();
  let datePreset = $state("7d");

  $effect(() => {
    datePreset = data.range || "7d";
  });

  function handleDateChange(preset: string) {
    datePreset = preset;
    goto(`/dashboard?range=${preset}`, { replaceState: true });
  }
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
    <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">Overview</h1>
    <p class="text-sm mt-1.5" style="color: var(--color-muted-foreground);">
      Traffic, visitors, and breakdowns for your site.
    </p>
  </div>
  <DateRangePicker value={datePreset} onchange={handleDateChange} />
</header>

{#if data.error}
  <div
    class="rounded-2xl border p-5 animate-fade-in"
    style="border-color: oklch(58% 0.24 25 / 0.2); background: oklch(58% 0.24 25 / 0.04);"
  >
    <p class="text-sm font-medium" style="color: var(--color-error);">
      {data.error}
    </p>
  </div>
{:else}
  <!-- KPI Cards -->
  <div
    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8"
  >
    <div class="stat-card animate-fade-in animate-fade-in-delay-1">
      <div class="flex items-start justify-between mb-3">
        <p class="stat-label">Visitors</p>
        <div
          class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style="background: oklch(54% 0.27 265 / 0.08);"
        >
          <svg
            class="w-4.5 h-4.5"
            style="color: var(--color-primary);"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            /></svg
          >
        </div>
      </div>
      <p class="stat-value">{data.total?.total?.toLocaleString() ?? "—"}</p>
      <p class="text-xs mt-1.5" style="color: var(--color-muted-foreground);">
        Unique visitors
      </p>
    </div>

    <div class="stat-card animate-fade-in animate-fade-in-delay-2">
      <div class="flex items-start justify-between mb-3">
        <p class="stat-label">Pageviews</p>
        <div
          class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style="background: oklch(62% 0.19 155 / 0.08);"
        >
          <svg
            class="w-4.5 h-4.5"
            style="color: var(--color-success);"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
            /></svg
          >
        </div>
      </div>
      <p class="stat-value">
        {data.hits?.hits?.length?.toLocaleString() ?? "—"}
      </p>
      <p class="text-xs mt-1.5" style="color: var(--color-muted-foreground);">
        Pages tracked
      </p>
    </div>

    <div class="stat-card animate-fade-in animate-fade-in-delay-3">
      <div class="flex items-start justify-between mb-3">
        <p class="stat-label">Top Browser</p>
        <div
          class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style="background: oklch(78% 0.16 80 / 0.08);"
        >
          <svg
            class="w-4.5 h-4.5"
            style="color: var(--color-warning);"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
            /></svg
          >
        </div>
      </div>
      <p class="stat-value text-xl">{data.browsers?.stats?.[0]?.name ?? "—"}</p>
      {#if data.browsers?.stats?.[0]}
        <p class="text-xs mt-1.5" style="color: var(--color-muted-foreground);">
          {data.browsers.stats[0].count.toLocaleString()} visitors
        </p>
      {/if}
    </div>

    <div class="stat-card animate-fade-in animate-fade-in-delay-4">
      <div class="flex items-start justify-between mb-3">
        <p class="stat-label">Top Country</p>
        <div
          class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style="background: oklch(60% 0.2 25 / 0.06);"
        >
          <svg
            class="w-4.5 h-4.5"
            style="color: oklch(60% 0.2 25);"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            /><path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            /></svg
          >
        </div>
      </div>
      <p class="stat-value text-xl">
        {data.locations?.stats?.[0]?.name ?? "—"}
      </p>
      {#if data.locations?.stats?.[0]}
        <p class="text-xs mt-1.5" style="color: var(--color-muted-foreground);">
          {data.locations.stats[0].count.toLocaleString()} visitors
        </p>
      {/if}
    </div>
  </div>

  <!-- Traffic Chart -->
  <section class="mb-6 sm:mb-8 animate-fade-in" style="animation-delay: 0.15s;">
    <div class="chart-container">
      <div class="flex items-center justify-between mb-5">
        <h2 class="section-title">Traffic</h2>
        <a href="/dashboard/pages" class="section-link">View all →</a>
      </div>
      <AreaChart data={data.total?.stats ?? []} height={260} />
    </div>
  </section>

  <!-- Pages + Browsers -->
  <section class="mb-6 sm:mb-8">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div class="card animate-fade-in" style="animation-delay: 0.2s;">
        <div class="flex items-center justify-between mb-4">
          <h3 class="section-title">Top Pages</h3>
          <a href="/dashboard/pages" class="section-link">View all →</a>
        </div>
        {#if data.hits?.hits && data.hits.hits.length > 0}
          <ul
            class="list-none p-0 m-0"
            style="border-top: 1px solid var(--color-border);"
          >
            {#each data.hits.hits.slice(0, 8) as hit, i}
              <li style="border-bottom: 1px solid var(--color-border);">
                <a
                  href="/dashboard/pages/{hit.path_id}"
                  class="list-row no-underline group"
                >
                  <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <span class="list-index">{i + 1}</span>
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
          <p
            class="text-sm py-10 text-center"
            style="color: var(--color-muted-foreground);"
          >
            No page data
          </p>
        {/if}
      </div>

      <div class="card animate-fade-in" style="animation-delay: 0.25s;">
        <div class="flex items-center justify-between mb-4">
          <h3 class="section-title">Browsers</h3>
          <a href="/dashboard/browsers" class="section-link">View all →</a>
        </div>
        {#if data.browsers?.stats}
          <BarChart data={data.browsers.stats} maxItems={8} />
        {:else}
          <p
            class="text-sm py-10 text-center"
            style="color: var(--color-muted-foreground);"
          >
            No browser data
          </p>
        {/if}
      </div>
    </div>
  </section>

  <!-- Systems + Locations + Languages -->
  <section class="mb-6 sm:mb-8">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      <div class="card animate-fade-in" style="animation-delay: 0.3s;">
        <div class="flex items-center justify-between mb-4">
          <h3 class="section-title">Operating Systems</h3>
          <a href="/dashboard/systems" class="section-link">All →</a>
        </div>
        {#if data.systems?.stats}
          <BarChart data={data.systems.stats} maxItems={6} />
        {:else}
          <p
            class="text-sm py-10 text-center"
            style="color: var(--color-muted-foreground);"
          >
            No data
          </p>
        {/if}
      </div>

      <div class="card animate-fade-in" style="animation-delay: 0.35s;">
        <div class="flex items-center justify-between mb-4">
          <h3 class="section-title">Locations</h3>
          <a href="/dashboard/locations" class="section-link">All →</a>
        </div>
        {#if data.locations?.stats}
          <BarChart data={data.locations.stats} maxItems={6} />
        {:else}
          <p
            class="text-sm py-10 text-center"
            style="color: var(--color-muted-foreground);"
          >
            No data
          </p>
        {/if}
      </div>

      <div
        class="card sm:col-span-2 lg:col-span-1 animate-fade-in"
        style="animation-delay: 0.4s;"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="section-title">Languages</h3>
          <a href="/dashboard/languages" class="section-link">All →</a>
        </div>
        {#if data.languages?.stats}
          <BarChart data={data.languages.stats} maxItems={6} />
        {:else}
          <p
            class="text-sm py-10 text-center"
            style="color: var(--color-muted-foreground);"
          >
            No data
          </p>
        {/if}
      </div>
    </div>
  </section>

  <!-- Screen Sizes -->
  <section class="mb-6 sm:mb-8">
    <div class="card animate-fade-in" style="animation-delay: 0.45s;">
      <div class="flex items-center justify-between mb-4">
        <h3 class="section-title">Screen Sizes</h3>
        <a href="/dashboard/devices" class="section-link">View all →</a>
      </div>
      {#if data.sizes?.stats}
        <BarChart data={data.sizes.stats} maxItems={8} />
      {:else}
        <p
          class="text-sm py-10 text-center"
          style="color: var(--color-muted-foreground);"
        >
          No device data
        </p>
      {/if}
    </div>
  </section>
{/if}
