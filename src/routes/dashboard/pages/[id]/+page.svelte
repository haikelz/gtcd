<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import BarChart from "$lib/components/BarChart.svelte";
  import DashboardToolbar from "$lib/components/DashboardToolbar.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import ErrorAlert from "$lib/components/ErrorAlert.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import ReportEmptyActions from "$lib/components/ReportEmptyActions.svelte";
  import ReportPagination from "$lib/components/ReportPagination.svelte";
  import ReportSkeleton from "$lib/components/ReportSkeleton.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import {
    Frame,
    FrameHeader,
    FramePanel,
    FrameTitle,
  } from "$lib/components/ui/frame";
  import type { HitsResponse } from "$lib/server/goatcounter/types";
  import { ArrowLeft, Link2 } from "@lucide/svelte";
  import { dashboardHref, t } from "$lib/display";
  import { SvelteURLSearchParams } from "svelte/reactivity";

  let { data } = $props();

  function refsHref(offset: number): string {
    const params = new SvelteURLSearchParams(page.url.searchParams);
    if (offset === 0) params.delete("offset");
    else params.set("offset", String(offset));
    const query = params.toString();
    return query ? `${page.url.pathname}?${query}` : page.url.pathname;
  }

  function currentHit(hits: HitsResponse | null) {
    return hits?.hits.find((hit) => hit.path_id === data.pathId);
  }

  function pageTitle(hits: HitsResponse | null): string {
    return (
      currentHit(hits)?.path ||
      t("reports.pageDetailFallbackTitle", { id: data.pathId })
    );
  }

  function goHref(hits: HitsResponse | null): string | null {
    const linkDomain = data.site?.linkDomain;
    const hit = currentHit(hits);
    if (!linkDomain || !hit || hit.event) return null;

    const base = /^https?:\/\//i.test(linkDomain)
      ? linkDomain
      : `http://${linkDomain}`;
    const path = hit.path.startsWith("/") ? hit.path : `/${hit.path}`;
    return `${base.replace(/\/+$/, "")}${path}`;
  }
</script>

{#await data.hits}
  {@render header(null)}
{:then hits}
  {@render header(hits)}
{/await}

<DashboardToolbar showFilter />

{#await data.refs}
  <Frame>
    <FrameHeader>
      <FrameTitle>{t("reports.pageDetailReferrers")}</FrameTitle>
    </FrameHeader>
    <FramePanel><ReportSkeleton /></FramePanel>
  </Frame>
{:then refs}
  {#if refs.refs.length > 0}
    <Frame>
      <FrameHeader>
        <FrameTitle>{t("reports.pageDetailReferrers")}</FrameTitle>
      </FrameHeader>
      <FramePanel>
        <BarChart
          data={refs.refs}
          label={t("reports.referrerLabel")}
          maxItems={30}
        />
        <ReportPagination
          nextHref={refs.more ? refsHref(data.offset + 30) : undefined}
          previousHref={data.offset > 0
            ? refsHref(Math.max(0, data.offset - 30))
            : undefined}
        />
      </FramePanel>
    </Frame>
  {:else}
    <Frame>
      <FramePanel>
        <EmptyState
          desc={t("reports.pageDetailEmptyDescription")}
          icon={Link2}
          title={t("reports.pageDetailEmptyTitle")}
        >
          {#snippet actions()}<ReportEmptyActions
              filterable={false}
            />{/snippet}
        </EmptyState>
      </FramePanel>
    </Frame>
  {/if}
{:catch failure}
  <ErrorAlert message={failure.message} />
{/await}

{#snippet header(hits: HitsResponse | null)}
  {@const title = pageTitle(hits)}
  {@const href = goHref(hits)}
  <SEO
    description={t("reports.pageDetailSeoDescription", { title })}
    noindex
    {title}
  />
  <PageHeader
    description={t("reports.pageDetailDescription")}
    {title}
    titleClass="font-mono"
  >
    {#snippet eyebrow()}
      <a
        class="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        href={dashboardHref(resolve("/dashboard/pages"), { view: true })}
      >
        <ArrowLeft aria-hidden="true" class="size-4" />
        {t("reports.backToPages")}
      </a>
    {/snippet}
    {#snippet actions()}
      {#if href}
        <a
          class="inline-block max-w-full truncate text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          {href}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t("reports.pageDetailGoTo", {
            url: href.replace(/^https?:\/\//i, ""),
          })}
        </a>
      {/if}
    {/snippet}
  </PageHeader>
{/snippet}
