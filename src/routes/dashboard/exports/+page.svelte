<script lang="ts">
  import { resolve } from "$app/paths";
  import SEO from "$lib/components/SEO.svelte";
  import { Download, FileArchive, RefreshCw } from "@lucide/svelte";

  let { data } = $props();
  const job = $derived(data.job);
  const isReady = $derived(job?.finished_at && !job.error);
</script>

<SEO
  title="Exports — gtcd"
  description="Export GoatCounter analytics data."
  noindex
/>

<header class="flex flex-col gap-3 mb-8">
  <p class="eyebrow">Manage</p>
  <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
    Data exports
  </h1>
  <p class="text-sm text-muted-foreground">
    Create a server-side GoatCounter export. Completed files remain available
    upstream for 24 hours.
  </p>
</header>

<div class="grid gap-6 lg:grid-cols-2">
  <form method="POST" action="?/create" class="panel space-y-5">
    <div class="flex items-center gap-2">
      <FileArchive class="h-5 w-5 text-primary" />
      <h2 class="section-title">Create export</h2>
    </div>
    <label class="form-control">
      <span class="label-text">Format</span>
      <select class="select select-bordered w-full" name="format"
        ><option value="csv">CSV</option><option value="json">JSON</option
        ></select
      >
    </label>
    <p class="text-sm text-muted-foreground">
      GoatCounter permits one export request per hour.
    </p>
    <button class="btn btn-primary" type="submit">Create export</button>
  </form>

  {#if job}
    <section class="panel space-y-5" aria-live="polite">
      <div class="flex items-center justify-between gap-4">
        <h2 class="section-title">Export #{job.id}</h2>
        <span class="badge badge-outline uppercase">{job.format}</span>
      </div>
      {#if job.error}
        <div class="alert alert-error">{job.error}</div>
      {:else if isReady}
        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-muted-foreground">Rows</dt>
            <dd class="font-medium">{job.num_rows?.toLocaleString() ?? "—"}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground">Size</dt>
            <dd class="font-medium">{job.size ?? "—"}</dd>
          </div>
        </dl>
        <a
          class="btn btn-primary"
          href={resolve(`/api/admin/exports/${job.id}`)}
          ><Download class="h-4 w-4" /> Download {job.format.toUpperCase()}</a
        >
      {:else}
        <div class="alert">
          <RefreshCw class="h-4 w-4 animate-spin" /> GoatCounter is preparing this
          export.
        </div>
        <a
          class="btn btn-outline"
          href={resolve(`/dashboard/exports?export=${job.id}`)}
          >Refresh status</a
        >
      {/if}
    </section>
  {:else}
    <section class="panel empty-state">
      <p class="empty-state-title">No export selected</p>
      <p class="empty-state-desc">
        Create an export to track its preparation and download it securely.
      </p>
    </section>
  {/if}
</div>
