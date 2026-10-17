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
  import { t } from "$lib/display";
  import { SvelteURLSearchParams } from "svelte/reactivity";

  let { data } = $props();

  const linkDomain = $derived(data.site?.linkDomain ?? "");
  const sharedScaleMax = $derived(
    page.url.searchParams.get("scale") === "shared" && data.hits?.hits
      ? statsScaleMax(data.hits.hits, "day")
      : undefined
  );

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

{#if data.error}
  <ErrorAlert message={data.error} />
  {#if data.cursorError}
    <Button
      href={resolve(pagesHref("") as "/dashboard/pages")}
      variant="outline">{t("reports.resetPagination")}</Button
    >
  {/if}
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
      <div>
        {#snippet rows(diffs?: Record<number, number | null>)}
          <ul
            aria-label={t("reports.pagesList")}
            class="m-0 list-none border-t border-border p-0"
          >
            {#each data.hits.hits as hit, i (hit.path_id)}
              <PageRow
                diff={diffs?.[hit.path_id]}
                {hit}
                href={resolve(`/dashboard/pages/${hit.path_id}`)}
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
      {#if data.paginationNotice}
        <p role="status" class="text-sm text-muted-foreground">
          {data.paginationNotice}
        </p>
        <Button
          href={resolve(pagesHref("") as "/dashboard/pages")}
          variant="outline">{t("reports.resetPagination")}</Button
        >
        <Button onclick={() => location.reload()} size="sm" variant="outline"
          >{t("common.retry")}</Button
        >
      {/if}
      <ReportPagination
        nextHref={data.nextCursor ? pagesHref(data.nextCursor) : undefined}
        previousHref={data.hasPrevious
          ? pagesHref(data.previousCursor)
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
