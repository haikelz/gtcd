<script lang="ts">
  import { formatCount } from "$lib/display";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import {
    Alert,
    AlertDescription,
    AlertTitle,
  } from "$lib/components/ui/alert";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import {
    Frame,
    FrameDescription,
    FrameFooter,
    FrameHeader,
    FramePanel,
    FrameTitle,
  } from "$lib/components/ui/frame";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { RadioGroup, RadioGroupItem } from "$lib/components/ui/radio-group";
  import {
    CircleAlert,
    Download,
    FileArchive,
    RefreshCw,
  } from "@lucide/svelte";

  const formatOptions = [
    {
      description: "Individual pageviews for spreadsheets and data tools.",
      label: "CSV",
      value: "csv",
    },
    {
      description: "Aggregate data for a portable analytics backup.",
      label: "JSON",
      value: "json",
    },
  ] as const;

  const exportSteps = [
    {
      description:
        "Choose CSV for individual pageviews or JSON for aggregate data.",
      title: "Create an export",
    },
    {
      description:
        "The request runs in GoatCounter, so it does not interrupt dashboard use.",
      title: "Wait for preparation",
    },
    {
      description:
        "The completed file is available through this protected dashboard.",
      title: "Download securely",
    },
  ] as const;

  let { data, form } = $props();

  let format = $derived(form?.values?.format ?? "csv");

  const job = $derived(data.job);
  const isReady = $derived(job?.finished_at && !job.error);
  const exportState = $derived(
    job?.error
      ? "Export failed"
      : isReady
        ? "Ready to download"
        : "Preparing export"
  );
</script>

<SEO
  description="Export GoatCounter analytics data."
  noindex
  title="Exports — gtcd"
/>

<PageHeader
  description="Package your GoatCounter analytics for your own reporting workflow."
  title="Data exports"
/>

{#if form?.error}
  <Alert class="mb-4" variant="destructive">
    <CircleAlert />
    <AlertTitle>Export not requested</AlertTitle>
    <AlertDescription>{form.error}</AlertDescription>
  </Alert>
{/if}

<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
  <form action="?/create" class="min-w-0" method="POST">
    <Frame>
      <FrameHeader>
        <FrameTitle id="export-create-heading">Create an export</FrameTitle>
        <FrameDescription>
          GoatCounter prepares a gzip-compressed file in the background.
        </FrameDescription>
      </FrameHeader>
      <FramePanel
        aria-labelledby="export-create-heading"
        class="grid gap-5"
        role="region"
      >
        <fieldset class="grid gap-2">
          <legend class="mb-2 text-sm font-medium">Format</legend>
          <RadioGroup
            bind:value={format}
            class="gap-2 sm:grid-cols-2"
            name="format"
          >
            {#each formatOptions as option (option.value)}
              <Label
                class="cursor-pointer items-start gap-3 rounded-lg border border-border p-3 leading-normal font-normal has-data-checked:bg-muted/50"
                for="export-format-{option.value}"
              >
                <RadioGroupItem
                  class="mt-0.5"
                  id="export-format-{option.value}"
                  value={option.value}
                />
                <span class="grid gap-0.5">
                  <span class="text-sm font-medium">{option.label}</span>
                  <span class="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </Label>
            {/each}
          </RadioGroup>
        </fieldset>
        {#if format === "csv"}
          <div class="grid gap-2">
            <Label for="export-start-hit">
              Start after hit ID
              <span class="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              aria-describedby="csv-cursor-help"
              id="export-start-hit"
              inputmode="numeric"
              min="1"
              name="startFromHitId"
              type="number"
              value={form?.values?.startFromHitId ?? ""}
            />
            <p class="text-xs text-muted-foreground" id="csv-cursor-help">
              Paste the last hit ID from an earlier CSV export to download only
              newer pageviews.
            </p>
          </div>
        {:else}
          <div class="grid gap-2">
            <Label for="export-start-day">
              Start date
              <span class="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              aria-describedby="json-date-help"
              id="export-start-day"
              name="startFromDay"
              type="date"
              value={form?.values?.startFromDay ?? ""}
            />
            <p class="text-xs text-muted-foreground" id="json-date-help">
              Leave blank to include all aggregate data, or choose a day to
              export newer data only.
            </p>
          </div>
        {/if}
      </FramePanel>
      <FrameFooter
        class="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-xs text-muted-foreground">
          One export request per hour. Completed files stay available for 24
          hours.
        </p>
        <Button class="shrink-0 self-end sm:self-auto" type="submit">
          <FileArchive />
          Create export
        </Button>
      </FrameFooter>
    </Frame>
  </form>
  <Frame aria-live={job ? "polite" : undefined}>
    {#if job}
      <FrameHeader class="flex-row items-center justify-between gap-3">
        <FrameTitle id="export-status-heading">{exportState}</FrameTitle>
        <Badge class="uppercase" variant="outline">{job.format}</Badge>
      </FrameHeader>
      <FramePanel
        aria-labelledby="export-status-heading"
        class="grid gap-4"
        role="region"
      >
        <p class="text-sm text-muted-foreground">
          Export #{job.id}, {job.format.toUpperCase()} file.
        </p>
        {#if job.error}
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>GoatCounter reported an error</AlertTitle>
            <AlertDescription>{job.error}</AlertDescription>
          </Alert>
        {:else if isReady}
          <dl class="grid grid-cols-2 gap-4">
            <div class="grid gap-1">
              <dt class="text-xs text-muted-foreground">Rows included</dt>
              <dd class="text-xl font-semibold tabular-nums">
                {job.num_rows == null ? "—" : formatCount(job.num_rows)}
              </dd>
            </div>
            <div class="grid gap-1">
              <dt class="text-xs text-muted-foreground">File size</dt>
              <dd class="text-xl font-semibold tabular-nums">
                {job.size ?? "—"}
              </dd>
            </div>
          </dl>
        {:else}
          <Alert role="status" variant="info">
            <RefreshCw class="animate-spin motion-reduce:animate-none" />
            <AlertTitle>GoatCounter is preparing this export</AlertTitle>
            <AlertDescription>
              Refresh the status when the file is ready to download.
            </AlertDescription>
          </Alert>
        {/if}
      </FramePanel>
      {#if isReady}
        <FrameFooter class="flex-row justify-end gap-2">
          <Button
            href={resolve(
              `/api/admin/exports/${job.id}?site=${page.data.site.id}`
            )}
          >
            <Download />
            Download {job.format.toUpperCase()}
          </Button>
        </FrameFooter>
      {:else if !job.error}
        <FrameFooter class="flex-row justify-end gap-2">
          <Button
            href={resolve(
              `/dashboard/exports?site=${page.data.site.id}&export=${job.id}`
            )}
            variant="outline"
          >
            <RefreshCw />
            Refresh status
          </Button>
        </FrameFooter>
      {/if}
    {:else}
      <FrameHeader>
        <FrameTitle id="export-status-heading">Export status</FrameTitle>
        <FrameDescription>
          Requested exports show their progress and download here.
        </FrameDescription>
      </FrameHeader>
      <FramePanel aria-labelledby="export-status-heading" role="region">
        <ol class="grid gap-4">
          {#each exportSteps as step, index (step.title)}
            <li class="flex gap-3">
              <span
                aria-hidden="true"
                class="grid size-6 shrink-0 place-items-center rounded-full border border-border bg-muted text-xs font-medium tabular-nums text-muted-foreground"
              >
                {index + 1}
              </span>
              <div class="grid gap-0.5">
                <p class="text-sm font-medium">{step.title}</p>
                <p class="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </li>
          {/each}
        </ol>
      </FramePanel>
    {/if}
  </Frame>
</div>
