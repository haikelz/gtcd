<script lang="ts">
  import { resolve } from "$app/paths";
  import SEO from "$lib/components/SEO.svelte";
  import {
    CircleAlert,
    CircleCheck,
    Clock3,
    Download,
    FileArchive,
    RefreshCw,
  } from "@lucide/svelte";

  let { data, form } = $props();
  const job = $derived(data.job);
  let format = $derived(form?.values?.format ?? "csv");
  const isReady = $derived(job?.finished_at && !job.error);
  const exportState = $derived(
    job?.error
      ? "Failed"
      : isReady
        ? "Ready to download"
        : job
          ? "Preparing"
          : "No active export"
  );
</script>

<SEO
  title="Exports — gtcd"
  description="Export GoatCounter analytics data."
  noindex
/>

<header class="mb-6">
  <div class="max-w-2xl">
    <p class="eyebrow mb-2">Data portability</p>
    <h1
      class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground"
    >
      Data exports
    </h1>
    <p class="text-sm leading-6 text-muted-foreground mt-2">
      Package your GoatCounter analytics for your own reporting workflow.
    </p>
  </div>
</header>

{#if form?.error}
  <div class="alert alert-error mb-5" role="alert">
    <CircleAlert class="h-5 w-5 shrink-0" />
    <span>{form.error}</span>
  </div>
{/if}

<div class="grid max-w-5xl gap-5">
  <form method="POST" action="?/create" class="panel !p-0 overflow-hidden">
    <section class="p-5 sm:p-6" aria-labelledby="export-create-heading">
      <div class="flex items-start gap-3">
        <span class="metric-icon shrink-0" aria-hidden="true"
          ><FileArchive class="h-5 w-5" /></span
        >
        <div>
          <p class="eyebrow mb-1">Step 1</p>
          <h2 id="export-create-heading" class="section-title">
            Create an export
          </h2>
          <p class="text-sm leading-6 text-muted-foreground mt-1">
            GoatCounter prepares a gzip-compressed file in the background.
          </p>
        </div>
      </div>
    </section>
    <section class="border-t border-border p-5 sm:p-6">
      <fieldset class="mb-6">
        <legend class="label-text font-medium">Format</legend>
        <div class="grid gap-3 mt-3 sm:grid-cols-2">
          <label
            class="flex min-h-22 cursor-pointer items-center gap-3 rounded-box border border-border p-4"
          >
            <input
              class="radio radio-primary shrink-0"
              name="format"
              type="radio"
              value="csv"
              bind:group={format}
            />
            <span
              ><span class="block text-sm font-medium">CSV</span><span
                class="block text-xs leading-5 text-muted-foreground mt-0.5"
                >Individual pageviews for spreadsheets and data tools.</span
              ></span
            >
          </label>
          <label
            class="flex min-h-22 cursor-pointer items-center gap-3 rounded-box border border-border p-4"
          >
            <input
              class="radio radio-primary shrink-0"
              name="format"
              type="radio"
              value="json"
              bind:group={format}
            />
            <span
              ><span class="block text-sm font-medium">JSON</span><span
                class="block text-xs leading-5 text-muted-foreground mt-0.5"
                >Aggregate data for a portable analytics backup.</span
              ></span
            >
          </label>
        </div>
      </fieldset>
      {#if format === "csv"}
        <label class="form-control">
          <span class="label-text font-medium mb-3"
            >Start after hit ID <span class="font-normal text-muted-foreground"
              >(optional)</span
            ></span
          >
          <input
            class="input input-bordered w-full"
            name="startFromHitId"
            type="number"
            min="1"
            inputmode="numeric"
            value={form?.values?.startFromHitId ?? ""}
            aria-describedby="csv-cursor-help"
          />
          <span
            id="csv-cursor-help"
            class="text-sm leading-6 text-muted-foreground"
            >Paste the last hit ID from an earlier CSV export to download only
            newer pageviews.</span
          >
        </label>
      {:else}
        <label class="form-control">
          <span class="label-text font-medium mb-3"
            >Start date <span class="font-normal text-muted-foreground"
              >(optional)</span
            ></span
          >
          <input
            class="input input-bordered w-full"
            name="startFromDay"
            type="date"
            value={form?.values?.startFromDay ?? ""}
            aria-describedby="json-date-help"
          />
          <span
            id="json-date-help"
            class="text-sm leading-6 text-muted-foreground"
            >Leave blank to include all aggregate data, or choose a day to
            export newer data only.</span
          >
        </label>
      {/if}
    </section>
    <footer
      class="flex flex-col gap-5 border-t border-border p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6"
    >
      <div class="flex max-w-2xl gap-3">
        <Clock3
          class="h-5 w-5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <p class="text-sm leading-6 text-muted-foreground">
          GoatCounter permits one export request per hour. Completed files
          remain available upstream for 24 hours.
        </p>
      </div>
      <button class="btn btn-primary shrink-0" type="submit"
        ><FileArchive class="h-4 w-4" /> Create export</button
      >
    </footer>
  </form>

  <aside>
    {#if job}
      <section
        class="panel p-5 sm:p-6"
        aria-live="polite"
        aria-labelledby="export-status-heading"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-3">
            <span class="metric-icon shrink-0" aria-hidden="true">
              {#if job.error}
                <CircleAlert class="h-5 w-5 text-error" />
              {:else if isReady}
                <CircleCheck class="h-5 w-5 text-success" />
              {:else}
                <RefreshCw class="h-5 w-5 animate-spin" />
              {/if}
            </span>
            <div>
              <p class="eyebrow mb-1">Current request</p>
              <h2 id="export-status-heading" class="section-title">
                {exportState}
              </h2>
              <p class="text-sm leading-6 text-muted-foreground mt-1">
                Export #{job.id} is being prepared as a {job.format.toUpperCase()}
                file.
              </p>
            </div>
          </div>
          <span class="badge badge-outline uppercase shrink-0"
            >{job.format}</span
          >
        </div>
        {#if job.error}
          <div class="alert alert-error mt-6">
            <CircleAlert class="h-5 w-5 shrink-0" />
            {job.error}
          </div>
        {:else if isReady}
          <dl
            class="grid grid-cols-2 gap-4 border-y border-border my-6 py-5 text-sm"
          >
            <div class="border-r border-border pr-4">
              <dt class="text-muted-foreground">Rows included</dt>
              <dd class="metric-value text-2xl mt-1">
                {job.num_rows?.toLocaleString() ?? "—"}
              </dd>
            </div>
            <div>
              <dt class="text-muted-foreground">File size</dt>
              <dd class="metric-value text-2xl mt-1">{job.size ?? "—"}</dd>
            </div>
          </dl>
          <a
            class="btn btn-primary"
            href={resolve(`/api/admin/exports/${job.id}`)}
            ><Download class="h-4 w-4" /> Download {job.format.toUpperCase()}</a
          >
        {:else}
          <div class="border-y border-border my-6 py-5 flex gap-3">
            <RefreshCw
              class="h-5 w-5 shrink-0 text-primary animate-spin"
              aria-hidden="true"
            />
            <div>
              <p class="text-sm font-medium">
                GoatCounter is preparing this export
              </p>
              <p class="text-sm leading-6 text-muted-foreground mt-1">
                Refresh the status when the file is ready to download.
              </p>
            </div>
          </div>
          <a
            class="btn btn-outline"
            href={resolve(`/dashboard/exports?export=${job.id}`)}
            >Refresh status</a
          >
        {/if}
      </section>
    {:else}
      <section class="panel p-5 sm:p-6" aria-labelledby="export-status-heading">
        <div class="flex items-start gap-3">
          <span class="metric-icon shrink-0" aria-hidden="true"
            ><Download class="h-5 w-5" /></span
          >
          <div>
            <p class="eyebrow mb-1">Step 2</p>
            <h2 id="export-status-heading" class="section-title">
              Your export status
            </h2>
            <p class="text-sm leading-6 text-muted-foreground mt-1">
              When an export is requested, its preparation and download action
              appear here.
            </p>
          </div>
        </div>
        <ol class="list-none m-0 mt-6 p-0 border-l border-border space-y-5">
          <li class="relative pl-6">
            <span
              class="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary"
              aria-hidden="true"
            ></span>
            <p class="text-sm font-medium">Create an export</p>
            <p class="text-sm leading-6 text-muted-foreground mt-1">
              Choose CSV for individual pageviews or JSON for aggregate data.
            </p>
          </li>
          <li class="relative pl-6">
            <span
              class="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-base-300"
              aria-hidden="true"
            ></span>
            <p class="text-sm font-medium">Wait for preparation</p>
            <p class="text-sm leading-6 text-muted-foreground mt-1">
              The request runs in GoatCounter, so it does not interrupt
              dashboard use.
            </p>
          </li>
          <li class="relative pl-6">
            <span
              class="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-base-300"
              aria-hidden="true"
            ></span>
            <p class="text-sm font-medium">Download securely</p>
            <p class="text-sm leading-6 text-muted-foreground mt-1">
              The completed file is available through this protected dashboard.
            </p>
          </li>
        </ol>
      </section>
    {/if}
  </aside>
</div>
