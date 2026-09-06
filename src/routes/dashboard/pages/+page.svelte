<script lang="ts">
  import { goto } from "$app/navigation";
  import DateRangePicker from "$lib/components/DateRangePicker.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import { FileText, TriangleAlert } from "@lucide/svelte";

  let { data } = $props();
  let datePreset = $state("7d");

  $effect(() => {
    datePreset = data.range || "7d";
  });

  function handleDateChange(preset: string) {
    datePreset = preset;
    goto(`/dashboard/pages?range=${preset}`, { replaceState: true });
  }
</script>

<SEO
  title="Pages — gtcd"
  description="Top pages for your GoatCounter site."
  noindex
/>

<header
  class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8 animate-fade-in"
>
  <div>
    <p class="eyebrow mb-1.5">Breakdown</p>
    <h1
      class="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground"
    >
      Pages
    </h1>
    <p class="text-sm mt-1.5 text-muted-foreground">
      Which pages your visitors view.
    </p>
  </div>
  <DateRangePicker value={datePreset} onchange={handleDateChange} />
</header>

{#if data.error}
  <div role="alert" class="alert alert-error animate-fade-in">
    <TriangleAlert class="h-5 w-5 shrink-0" />
    <span class="text-sm font-medium">{data.error}</span>
    <button
      type="button"
      class="btn btn-sm btn-outline"
      onclick={() => location.reload()}
    >
      Retry
    </button>
  </div>
{:else if data.hits?.hits && data.hits.hits.length > 0}
  <div class="panel animate-fade-in">
    <div class="flex items-baseline justify-between gap-3 mb-6">
      <h2 class="section-title">Page report</h2>
      <span class="text-xs text-muted-foreground"
        >{data.hits.hits.length} tracked paths</span
      >
    </div>
    <div
      class="flex justify-between text-xs text-muted-foreground pb-3"
      aria-hidden="true"
    >
      <span>Page</span><span>Views</span>
    </div>
    <ul
      class="list-none p-0 m-0 border-t border-border"
      aria-label="Pages list"
    >
      {#each data.hits.hits as hit, i}
        <li class="border-b border-border">
          <a
            href="/dashboard/pages/{hit.path_id}"
            class="list-row no-underline group"
            aria-label="{hit.path}, {hit.count.toLocaleString()} visits"
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
  </div>
{:else}
  <div class="panel empty-state animate-fade-in">
    <div class="empty-state-icon" aria-hidden="true">
      <FileText class="h-6 w-6" strokeWidth={1.5} />
    </div>
    <p class="empty-state-title">No page data</p>
    <p class="empty-state-desc">No pages tracked for this time period.</p>
  </div>
{/if}
