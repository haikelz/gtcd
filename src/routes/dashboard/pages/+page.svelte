<script lang="ts">
  import { goto } from "$app/navigation";
  import DateRangePicker from "$lib/components/DateRangePicker.svelte";
  import SEO from "$lib/components/SEO.svelte";

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

<SEO title="Pages — gtcd" description="Top pages for your GoatCounter site." noindex />

<header
  class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8 animate-fade-in"
>
  <div>
    <p class="eyebrow mb-1.5">Breakdown</p>
    <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">Pages</h1>
    <p class="text-sm mt-1.5 text-muted-foreground">
      Which pages your visitors view.
    </p>
  </div>
  <DateRangePicker value={datePreset} onchange={handleDateChange} />
</header>

{#if data.error}
  <div role="alert" class="alert alert-error animate-fade-in">
    <svg
      class="w-5 h-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
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
      <span class="text-xs text-muted-foreground">{data.hits.hits.length} tracked paths</span>
    </div>
    <div class="flex justify-between text-xs text-muted-foreground pb-3" aria-hidden="true"><span>Page</span><span>Views</span></div>
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
      <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    </div>
    <p class="empty-state-title">No page data</p>
    <p class="empty-state-desc">No pages tracked for this time period.</p>
  </div>
{/if}
