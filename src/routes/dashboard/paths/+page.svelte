<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import ErrorAlert from "$lib/components/ErrorAlert.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import ReportPagination from "$lib/components/ReportPagination.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import {
    Frame,
    FrameDescription,
    FrameHeader,
    FramePanel,
    FrameTitle,
  } from "$lib/components/ui/frame";
  import { FolderTree } from "@lucide/svelte";
  import { SvelteURLSearchParams } from "svelte/reactivity";

  let { data } = $props();

  function pathsHref(after?: number): string {
    const params = new SvelteURLSearchParams(page.url.searchParams);
    if (after) params.set("after", String(after));
    else params.delete("after");
    const query = params.toString();
    return query ? `${page.url.pathname}?${query}` : page.url.pathname;
  }
</script>

<SEO
  description="All GoatCounter paths tracked for this site."
  noindex
  title="Path directory — gtcd"
/>

<PageHeader
  description="Every tracked path, including paths without recent traffic."
  title="Path directory"
/>

{#if data.error}
  <ErrorAlert message={data.error} />
{:else if data.paths?.paths && data.paths.paths.length > 0}
  <Frame>
    <FrameHeader
      class="flex-row flex-wrap items-baseline justify-between gap-3"
    >
      <FrameTitle id="path-directory-heading">Tracked paths</FrameTitle>
      <FrameDescription class="text-xs">
        {data.paths.paths.length} paths on this page
      </FrameDescription>
    </FrameHeader>
    <FramePanel aria-labelledby="path-directory-heading" role="region">
      <ul aria-label="Tracked paths" class="m-0 list-none p-0">
        {#each data.paths.paths as item (item.id)}
          <li class="border-b border-border last:border-0">
            <a
              aria-label={`${item.path}${item.event ? ", event" : ""}`}
              class="group flex min-h-11 items-center justify-between gap-3 px-2 py-2.5 no-underline transition-colors hover:bg-foreground/5"
              href={resolve(`/dashboard/pages/${item.id}`)}
            >
              <div class="min-w-0 flex-1">
                <span
                  class="block min-w-0 truncate font-mono text-sm font-medium transition-colors group-hover:text-primary"
                  >{item.path}</span
                >
                {#if item.title && item.title !== item.path}
                  <span
                    class="mt-1 block truncate text-xs text-muted-foreground"
                    >{item.title}</span
                  >
                {/if}
              </div>
              {#if item.event}
                <Badge class="shrink-0" variant="outline">Event</Badge>
              {/if}
            </a>
          </li>
        {/each}
      </ul>
      <ReportPagination
        nextHref={data.paths.more && data.nextAfter
          ? pathsHref(data.nextAfter)
          : undefined}
      />
    </FramePanel>
  </Frame>
{:else}
  <Frame>
    <FramePanel>
      <EmptyState
        desc="Paths appear after GoatCounter receives pageviews or events."
        icon={FolderTree}
        title="No tracked paths"
      />
    </FramePanel>
  </Frame>
{/if}
