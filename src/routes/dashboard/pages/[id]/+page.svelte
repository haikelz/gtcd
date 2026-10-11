<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- the "Go to path"
     href is an external live-site URL, not an internal route. */
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import BarChart from "$lib/components/BarChart.svelte";
  import DashboardToolbar from "$lib/components/DashboardToolbar.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import ErrorAlert from "$lib/components/ErrorAlert.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import ReportPagination from "$lib/components/ReportPagination.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import {
    Frame,
    FrameHeader,
    FramePanel,
    FrameTitle,
  } from "$lib/components/ui/frame";
  import { ArrowLeft, Link2 } from "@lucide/svelte";
  import { SvelteURLSearchParams } from "svelte/reactivity";

  let { data } = $props();

  function refsHref(offset: number): string {
    const params = new SvelteURLSearchParams(page.url.searchParams);
    if (offset === 0) params.delete("offset");
    else params.set("offset", String(offset));
    const query = params.toString();
    return query ? `${page.url.pathname}?${query}` : page.url.pathname;
  }

  const pageTitle = $derived(
    data.hits?.hits?.find((hit) => hit.path_id === data.pathId)?.path ||
      `Page ${data.pathId}`
  );

  const currentHit = $derived(
    data.hits?.hits?.find((hit) => hit.path_id === data.pathId)
  );

  const goHref = $derived.by(() => {
    const linkDomain = data.site?.linkDomain;
    if (!linkDomain || currentHit?.event) return null;
    const base = /^https?:\/\//i.test(linkDomain)
      ? linkDomain
      : `http://${linkDomain}`;
    const path = pageTitle.startsWith("/") ? pageTitle : `/${pageTitle}`;
    return `${base.replace(/\/+$/, "")}${path}`;
  });
</script>

<SEO
  description="Referrer breakdown for {pageTitle}."
  noindex
  title={pageTitle}
/>

<PageHeader
  description="Referrers driving traffic to this page."
  title={pageTitle}
  titleClass="font-mono"
>
  {#snippet eyebrow()}
    <a
      class="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      href={resolve("/dashboard/pages")}
    >
      <ArrowLeft aria-hidden="true" class="size-4" /> Back to Pages
    </a>
  {/snippet}
  {#snippet actions()}
    {#if goHref}
      <a
        class="inline-block max-w-full truncate text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        href={goHref}
        rel="noopener noreferrer"
        target="_blank"
      >
        Go to {goHref.replace(/^https?:\/\//i, "")}
      </a>
    {/if}
  {/snippet}
</PageHeader>

<DashboardToolbar showFilter />

{#if data.error}
  <ErrorAlert message={data.error} />
{:else if data.refs?.refs && data.refs.refs.length > 0}
  <Frame class="animate-fade-in">
    <FrameHeader>
      <FrameTitle>Referrers</FrameTitle>
    </FrameHeader>
    <FramePanel>
      <BarChart data={data.refs.refs} label="Referrer" maxItems={30} />
      <ReportPagination
        nextHref={data.refs.more ? refsHref(data.offset + 30) : undefined}
        previousHref={data.offset > 0
          ? refsHref(Math.max(0, data.offset - 30))
          : undefined}
      />
    </FramePanel>
  </Frame>
{:else}
  <Frame class="animate-fade-in">
    <FramePanel>
      <EmptyState
        desc="No incoming referrers recorded for this page in this time window."
        icon={Link2}
        title="No referrers"
      />
    </FramePanel>
  </Frame>
{/if}
