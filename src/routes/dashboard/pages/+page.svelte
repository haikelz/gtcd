<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import CsvDownload, { pageCsvRows } from "$lib/components/CsvDownload.svelte";
  import DashboardToolbar from "$lib/components/DashboardToolbar.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import ErrorAlert from "$lib/components/ErrorAlert.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import PageRow from "$lib/components/PageRow.svelte";
  import ReportEmptyActions from "$lib/components/ReportEmptyActions.svelte";
  import ReportPagination from "$lib/components/ReportPagination.svelte";
  import ReportSkeleton from "$lib/components/ReportSkeleton.svelte";
  import ScaleToggle from "$lib/components/ScaleToggle.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import {
    Frame,
    FrameDescription,
    FrameHeader,
    FramePanel,
    FrameTitle,
  } from "$lib/components/ui/frame";
  import { statsScaleMax } from "$lib/period.js";
  import { FileText } from "@lucide/svelte";
  import { dashboardHref, t } from "$lib/display";
  import { SvelteURLSearchParams } from "svelte/reactivity";

  let { data } = $props();

  const linkDomain = $derived(data.site?.linkDomain ?? "");
  const sharedScale = $derived(page.url.searchParams.get("scale") === "shared");

  function pagesHref(cursor: string): string {
    const params = new SvelteURLSearchParams(page.url.searchParams);
    params.delete("exclude");
    if (cursor) params.set("cursor", cursor);
    else params.delete("cursor");
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

{#snippet failed(message: string)}
  <ErrorAlert {message} />
  {#if data.cursorError}
    <Button
      href={resolve(pagesHref("") as "/dashboard/pages")}
      variant="outline">{t("reports.resetPagination")}</Button
    >
  {/if}
{/snippet}

{#if data.error}
  {@render failed(data.error)}
{:else if data.report}
  {#await data.report}
    <Frame>
      <FrameHeader>
        <FrameTitle>{t("reports.pagesReport")}</FrameTitle>
      </FrameHeader>
      <FramePanel><ReportSkeleton /></FramePanel>
    </Frame>
  {:then report}
    {#if report.hits.hits.length > 0}
      {@const sharedScaleMax = sharedScale
        ? statsScaleMax(report.hits.hits, "day")
        : undefined}
      <Frame class="animate-fade-in">
        <FrameHeader
          class="flex-row flex-wrap items-center justify-between gap-3"
        >
          <div class="min-w-0">
            <FrameTitle>{t("reports.pagesReport")}</FrameTitle>
            <FrameDescription class="text-xs">
              {t("reports.pagesTrackedPaths", {
                count: report.hits.hits.length,
              })}
            </FrameDescription>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <ScaleToggle />
            {#await data.comparison}
              <CsvDownload
                report="pages"
                rows={pageCsvRows(report.hits.hits)}
              />
            {:then comparison}
              <CsvDownload
                report="pages"
                rows={pageCsvRows(
                  report.hits.hits,
                  comparison?.status === "ready" ? comparison.diffs : undefined
                )}
              />
            {/await}
          </div>
        </FrameHeader>
        <FramePanel>
          <div
            aria-hidden="true"
            class="flex justify-between px-2 pb-2 text-xs text-muted-foreground"
          >
            <span>{t("reports.pageColumn")}</span><span
              >{t("reports.visits")}</span
            >
          </div>
          <div>
            {#snippet rows(diffs?: Record<number, number | null>)}
              <ul
                aria-label={t("reports.pagesList")}
                class="m-0 list-none border-t border-border p-0"
              >
                {#each report.hits.hits as hit, i (hit.path_id)}
                  <PageRow
                    diff={diffs?.[hit.path_id]}
                    {hit}
                    href={dashboardHref(
                      resolve("/dashboard/pages/[id]", {
                        id: String(hit.path_id),
                      }),
                      { view: true }
                    )}
                    {linkDomain}
                    rank={i + 1}
                    scaleMax={sharedScaleMax}
                  />
                {/each}
              </ul>
            {/snippet}
            {#await data.comparison}
              <div
                role="status"
                class="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Skeleton class="size-4" />
                {t("reports.comparisonLoading")}
              </div>
              {@render rows()}
            {:then comparison}
              {#if comparison?.status === "error"}
                <div role="status">
                  <ErrorAlert message={t("reports.comparisonFailed")} />
                </div>
                {@render rows()}
              {:else}
                <p role="status" class="sr-only">
                  {t("reports.comparisonLoaded")}
                </p>
                {@render rows(comparison?.diffs)}
              {/if}
            {/await}
          </div>
          {#if report.paginationNotice}
            <p role="status" class="text-sm text-muted-foreground">
              {report.paginationNotice}
            </p>
            <Button
              href={resolve(pagesHref("") as "/dashboard/pages")}
              variant="outline">{t("reports.resetPagination")}</Button
            >
            <Button
              onclick={() => location.reload()}
              size="sm"
              variant="outline">{t("common.retry")}</Button
            >
          {/if}
          <ReportPagination
            nextHref={report.nextCursor
              ? pagesHref(report.nextCursor)
              : undefined}
            previousHref={report.hasPrevious
              ? pagesHref(report.previousCursor)
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
          >
            {#snippet actions()}<ReportEmptyActions />{/snippet}
          </EmptyState>
        </FramePanel>
      </Frame>
    {/if}
  {:catch failure}
    {@render failed(failure.message)}
  {/await}
{/if}
