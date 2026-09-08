<script lang="ts">
  import { page } from "$app/state";
  import { resolve } from "$app/paths";
  import { SvelteURLSearchParams } from "svelte/reactivity";
  import ReportPagination from "$lib/components/ReportPagination.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import { FolderTree, TriangleAlert } from "@lucide/svelte";

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
  title="Path directory — gtcd"
  description="All GoatCounter paths tracked for this site."
  noindex
/>

<header class="flex flex-col gap-3 mb-6 sm:mb-8">
  <div>
    <p class="eyebrow mb-1.5">Content inventory</p>
    <h1
      class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground"
    >
      Path directory
    </h1>
    <p class="text-sm mt-1.5 text-muted-foreground">
      Every tracked path, including paths without recent traffic.
    </p>
  </div>
</header>

{#if data.error}
  <div role="alert" class="alert alert-error">
    <TriangleAlert class="h-5 w-5 shrink-0" />
    <span class="text-sm font-medium">{data.error}</span>
    <button
      type="button"
      class="btn btn-sm btn-outline"
      onclick={() => location.reload()}>Retry</button
    >
  </div>
{:else if data.paths?.paths && data.paths.paths.length > 0}
  <section class="panel" aria-labelledby="path-directory-heading">
    <div class="flex flex-wrap items-baseline justify-between gap-3 mb-6">
      <h2 id="path-directory-heading" class="section-title">Tracked paths</h2>
      <span class="text-xs text-muted-foreground"
        >{data.paths.paths.length} paths on this page</span
      >
    </div>
    <ul
      class="list-none p-0 m-0 border-t border-border"
      aria-label="Tracked paths"
    >
      {#each data.paths.paths as item (item.id)}
        <li class="border-b border-border">
          <a
            href={resolve(`/dashboard/pages/${item.id}`)}
            class="list-row no-underline group"
            aria-label={`${item.path}${item.event ? ", event" : ""}`}
          >
            <div class="min-w-0 flex-1">
              <span
                class="list-name font-mono group-hover:text-primary transition-colors"
                >{item.path}</span
              >
              {#if item.title && item.title !== item.path}
                <span class="block truncate text-xs text-muted-foreground mt-1"
                  >{item.title}</span
                >
              {/if}
            </div>
            {#if item.event}<span class="badge badge-outline shrink-0"
                >Event</span
              >{/if}
          </a>
        </li>
      {/each}
    </ul>
    <ReportPagination
      nextHref={data.paths.more && data.nextAfter
        ? pathsHref(data.nextAfter)
        : undefined}
    />
  </section>
{:else}
  <div class="panel empty-state">
    <div class="empty-state-icon" aria-hidden="true">
      <FolderTree class="h-6 w-6" strokeWidth={1.5} />
    </div>
    <p class="empty-state-title">No tracked paths</p>
    <p class="empty-state-desc">
      Paths appear after GoatCounter receives pageviews or events.
    </p>
  </div>
{/if}
