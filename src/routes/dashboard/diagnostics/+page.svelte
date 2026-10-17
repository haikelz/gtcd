<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { resolve } from "$app/paths";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import { Alert, AlertDescription } from "$lib/components/ui/alert";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import {
    Frame,
    FrameDescription,
    FrameHeader,
    FramePanel,
    FrameTitle,
  } from "$lib/components/ui/frame";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { t } from "$lib/display";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  let refreshing = $state(false);
  let refreshFailed = $state(false);
  const counterKeys = [
    "memoryHits",
    "sharedHits",
    "misses",
    "inflightDeduplications",
    "upstreamAttempts",
    "rateLimited",
    "backoffs",
    "retries",
  ] as const;

  function timestamp(value: number | string | null): string {
    if (!value) return t("diagnostics.unknown");
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? t("diagnostics.unknown")
      : date.toISOString();
  }

  async function refresh() {
    refreshing = true;
    refreshFailed = false;
    try {
      await invalidateAll();
    } catch {
      refreshFailed = true;
    } finally {
      refreshing = false;
    }
  }
</script>

<SEO
  noindex
  title={t("diagnostics.title")}
  description={t("diagnostics.description")}
/>
<PageHeader
  title={t("diagnostics.title")}
  description={t("diagnostics.description")}
>
  {#snippet actions()}
    <Button size="sm" variant="outline" disabled={refreshing} onclick={refresh}>
      {refreshing ? t("diagnostics.loading") : t("diagnostics.refresh")}
    </Button>
  {/snippet}
</PageHeader>

{#snippet loading()}
  <div class="grid gap-3" role="status" aria-label={t("diagnostics.loading")}>
    <Skeleton class="h-5 w-40" />
    <Skeleton class="h-5 w-64 max-w-full" />
  </div>
{/snippet}

{#snippet retry(message: string)}
  <Alert variant="destructive">
    <AlertDescription>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p>{message}</p>
        <Button
          size="sm"
          variant="outline"
          disabled={refreshing}
          onclick={refresh}>{t("diagnostics.retry")}</Button
        >
      </div>
    </AlertDescription>
  </Alert>
{/snippet}

<div class="grid min-w-0 gap-6" aria-busy={refreshing}>
  {#if refreshFailed}
    {@render retry(t("diagnostics.refreshError"))}
  {/if}
  <Frame>
    <FrameHeader>
      <FrameTitle>{t("diagnostics.dependencies")}</FrameTitle>
      <FrameDescription>{t("diagnostics.observations")}</FrameDescription>
    </FrameHeader>
    <FramePanel class="grid gap-4">
      <div class="flex flex-wrap items-center gap-2">
        <h2 class="text-sm font-medium">GoatCounter</h2>
        <Badge
          variant={data.client.upstream.status === "up"
            ? "success-light"
            : data.client.upstream.status === "down"
              ? "destructive-light"
              : "secondary"}
          >{t(`diagnostics.${data.client.upstream.status}`)}</Badge
        >
      </div>
      <dl class="grid gap-3 text-sm sm:grid-cols-3">
        {#each ["observedAt", "lastSuccessAt", "lastFailureAt"] as const as key (key)}
          <div class="grid gap-1">
            <dt class="text-muted-foreground">{t(`diagnostics.${key}`)}</dt>
            <dd class="text-xs break-words tabular-nums">
              {timestamp(data.client.upstream[key])}
            </dd>
          </div>
        {/each}
      </dl>
      {#await data.redis}
        {@render loading()}
      {:then redis}
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-sm font-medium">Redis</h2>
          <Badge
            variant={redis.status === "up"
              ? "success-light"
              : "destructive-light"}>{t(`diagnostics.${redis.status}`)}</Badge
          >
          <p class="text-xs text-muted-foreground">
            {t("diagnostics.checkedAt")}: {timestamp(redis.checkedAt)}
          </p>
        </div>
      {/await}
    </FramePanel>
  </Frame>
  <Frame>
    <FrameHeader>
      <FrameTitle>{t("diagnostics.counters")}</FrameTitle>
      <FrameDescription
        >{t("diagnostics.local", {
          startedAt: timestamp(data.client.startedAt),
        })}</FrameDescription
      >
    </FrameHeader>
    <FramePanel class="grid gap-4">
      <p class="text-xs text-muted-foreground">
        {t("diagnostics.sampledAt")}: {timestamp(data.client.sampledAt)}
      </p>
      <dl class="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
        {#each counterKeys as key (key)}
          <div class="grid gap-1">
            <dt class="text-muted-foreground">
              {t(`diagnostics.${key}`)}
            </dt>
            <dd class="font-medium tabular-nums">
              {data.client.counters[key]}
            </dd>
          </div>
        {/each}
      </dl>
    </FramePanel>
  </Frame>
  <Frame>
    <FrameHeader>
      <FrameTitle>{t("diagnostics.scheduler")}</FrameTitle>
      <FrameDescription
        >{t("diagnostics.schedulerDescription")}</FrameDescription
      >
    </FrameHeader>
    <FramePanel class="grid gap-4">
      {#await data.scheduler}
        {@render loading()}
      {:then result}
        {#if result.diagnostics}
          {@const scheduler = result.diagnostics}
          <dl class="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
            {#each ["lastRunAt", "lastSuccessAt", "pending", "failed"] as const as key (key)}
              <div class="grid gap-1">
                <dt class="text-muted-foreground">{t(`diagnostics.${key}`)}</dt>
                <dd class="text-xs break-words tabular-nums">
                  {key === "pending" || key === "failed"
                    ? scheduler[key]
                    : timestamp(scheduler[key])}
                </dd>
              </div>
            {/each}
          </dl>
          {#if !scheduler.lastRunAt && !scheduler.pending && !scheduler.failed}
            <p class="text-sm text-muted-foreground">
              {t("diagnostics.empty")}
            </p>
            <div>
              <Button
                href={resolve("/dashboard/customize")}
                size="sm"
                variant="outline">{t("diagnostics.configure")}</Button
              >
            </div>
          {/if}
        {:else}
          {@render retry(t("diagnostics.schedulerError"))}
        {/if}
      {/await}
    </FramePanel>
  </Frame>
</div>
