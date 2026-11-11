<script lang="ts">
  import { resolve } from "$app/paths";
  import DashboardToolbar from "$lib/components/DashboardToolbar.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PeriodChange from "$lib/components/PeriodChange.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import SparkLine from "$lib/components/SparkLine.svelte";
  import {
    Frame,
    FrameDescription,
    FrameHeader,
    FramePanel,
    FrameTitle,
  } from "$lib/components/ui/frame";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import {
    dashboardHref,
    displayPreferences,
    formatCount,
    numbersHidden,
    t,
  } from "$lib/display";
  import { compareCount } from "$lib/overview-comparison";
  import { seriesPoints } from "$lib/period";

  let { data } = $props();
</script>

<SEO
  description={t("sites.seoDescription")}
  noindex
  title={t("sites.seoTitle")}
/>

<PageHeader description={t("sites.description")} title={t("sites.title")} />

<DashboardToolbar />

<Frame aria-labelledby="sites-list" role="region">
  <FrameHeader>
    <FrameTitle id="sites-list">{t("sites.list")}</FrameTitle>
    <FrameDescription class="text-xs"
      >{t("sites.count", { count: data.rows.length })}</FrameDescription
    >
  </FrameHeader>
  <FramePanel>
    <div
      aria-hidden="true"
      class="flex justify-between px-2 pb-2 text-xs text-muted-foreground"
    >
      <span>{t("sites.columnSite")}</span><span>{t("sites.columnVisits")}</span>
    </div>
    <ul
      aria-labelledby="sites-list"
      class="m-0 list-none border-t border-border p-0"
    >
      {#each data.rows as row (row.id)}
        <li
          class="flex min-h-11 items-center justify-between gap-3 border-b border-border px-2 py-2.5 last:border-0"
        >
          <a
            class="min-w-0 flex-1 truncate rounded-sm font-mono text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            href={dashboardHref(`${resolve("/dashboard")}?site=${row.id}`, {
              view: true,
            })}>{row.name}</a
          >
          {#await row.current}
            <span class="sr-only">{t("sites.loading", { site: row.name })}</span
            >
            <Skeleton class="hidden h-7 w-28 md:block lg:w-36" />
            <Skeleton class="h-4 w-12" />
          {:then total}
            {@const points = seriesPoints(
              total.stats,
              "day",
              displayPreferences()
            )}
            <SparkLine
              class="hidden md:block"
              data={total.stats}
              description={t("sites.trendDescription", {
                end: points.at(-1)?.title ?? "",
                start: points[0]?.title ?? "",
              })}
              label={t("sites.trendLabel", { site: row.name })}
            />
            {#if !numbersHidden()}
              <table class="sr-only">
                <caption>{t("sites.tableCaption", { site: row.name })}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t("sites.day")}</th>
                    <th scope="col">{t("sites.columnVisits")}</th>
                  </tr>
                </thead>
                <tbody>
                  {#each points as point, i (i)}
                    <tr>
                      <td>{point.title}</td>
                      <td>{formatCount(point.value)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            {/if}
            <span class="shrink-0 text-right">
              <span
                class="block text-sm font-medium text-foreground tabular-nums"
                >{numbersHidden() ? "—" : formatCount(total.total)}</span
              >
              {#await row.previous then previous}
                <span class="block">
                  <PeriodChange
                    change={compareCount(total.total, previous?.total ?? null)}
                  />
                </span>
              {/await}
            </span>
          {:catch failure}
            <span class="shrink-0 text-right text-xs text-destructive"
              >{failure.message}</span
            >
          {/await}
        </li>
      {/each}
    </ul>
  </FramePanel>
</Frame>
