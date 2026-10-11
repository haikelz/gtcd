<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import DashboardToolbar from "$lib/components/DashboardToolbar.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import ErrorAlert from "$lib/components/ErrorAlert.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageRow from "$lib/components/PageRow.svelte";
  import ReportPagination from "$lib/components/ReportPagination.svelte";
  import ScaleToggle from "$lib/components/ScaleToggle.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import {
    Frame,
    FrameDescription,
    FrameHeader,
    FramePanel,
    FrameTitle,
  } from "$lib/components/ui/frame";
  import { statsScaleMax } from "$lib/period.js";
  import { FileText } from "@lucide/svelte";
  import { t } from "$lib/display";
  import { SvelteURLSearchParams } from "svelte/reactivity";

  let { data } = $props();

  const linkDomain = $derived(data.site?.linkDomain ?? "");
  const sharedScaleMax = $derived(
    page.url.searchParams.get("scale") === "shared" && data.hits?.hits
      ? statsScaleMax(data.hits.hits, "day")
      : undefined
  );

  function pagesHref(exclude: string): string {
    const params = new SvelteURLSearchParams(page.url.searchParams);
    if (exclude) params.set("exclude", exclude);
    else params.delete("exclude");
    const query = params.toString();
    return query ? `${page.url.pathname}?${query}` : page.url.pathname;
  }
</script>

<SEO
  description={t("reports.pagesSeoDescription")}
  noindex
  title={t("reports.pagesSeoTitle")}
/>

<PageHeader
  description={t("reports.pagesDescription")}
  title={t("reports.pagesTitle")}
/>

<DashboardToolbar showFilter />

{#if data.error}
  <ErrorAlert message={data.error} />
{:else if data.hits?.hits && data.hits.hits.length > 0}
  <Frame class="animate-fade-in">
    <FrameHeader class="flex-row flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <FrameTitle>{t("reports.pagesReport")}</FrameTitle>
        <FrameDescription class="text-xs">
          {t("reports.pagesTrackedPaths", { count: data.hits.hits.length })}
        </FrameDescription>
      </div>
      <ScaleToggle />
    </FrameHeader>
    <FramePanel>
      <div
        aria-hidden="true"
        class="flex justify-between px-2 pb-2 text-xs text-muted-foreground"
      >
        <span>{t("reports.pageColumn")}</span><span>{t("reports.visits")}</span>
      </div>
      <ul
        aria-label={t("reports.pagesList")}
        class="m-0 list-none border-t border-border p-0"
      >
        {#each data.hits.hits as hit, i (hit.path_id)}
          <PageRow
            diff={data.diffs?.[hit.path_id]}
            {hit}
            href={resolve(`/dashboard/pages/${hit.path_id}`)}
            {linkDomain}
            rank={i + 1}
            scaleMax={sharedScaleMax}
          />
        {/each}
      </ul>
      <ReportPagination
        nextHref={data.hits.more
          ? pagesHref(data.nextExcludedPathIds)
          : undefined}
        previousHref={data.excludedPathIds
          ? pagesHref(data.previousExcludedPathIds)
          : undefined}
      />
    </FramePanel>
  </Frame>
{:else}
  <Frame class="animate-fade-in">
    <FramePanel>
      <EmptyState
        desc={t("reports.pagesEmptyDescription")}
        icon={FileText}
        title={t("reports.pagesEmptyTitle")}
      />
    </FramePanel>
  </Frame>
{/if}
