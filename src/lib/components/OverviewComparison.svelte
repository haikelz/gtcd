<script lang="ts">
  import {
    Frame,
    FrameHeader,
    FrameTitle,
    FrameDescription,
    FramePanel,
  } from "$lib/components/ui/frame";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import {
    displayPreferences,
    formatCount,
    numbersHidden,
    t,
  } from "$lib/display";
  import {
    compareCount,
    compareLeader,
    compareTotals,
  } from "$lib/overview-comparison";
  import type {
    CountTotalResponse,
    StatsResponse,
  } from "$lib/server/goatcounter/types";

  type Props = {
    period: string;
    total: Promise<CountTotalResponse | null>;
    browsers: Promise<StatsResponse | null>;
    locations: Promise<StatsResponse | null>;
    previous: {
      total: Promise<CountTotalResponse | null>;
      browsers: Promise<StatsResponse | null>;
      locations: Promise<StatsResponse | null>;
    };
    showTotal: boolean;
    showBrowsers: boolean;
    showLocations: boolean;
  };
  let {
    period,
    total,
    browsers,
    locations,
    previous,
    showTotal,
    showBrowsers,
    showLocations,
  }: Props = $props();
  const totals = $derived(Promise.all([total, previous.total]));
  const browserPair = $derived(Promise.all([browsers, previous.browsers]));
  const locationPair = $derived(Promise.all([locations, previous.locations]));

  function decimal(value: number, signed = false): string {
    return new Intl.NumberFormat(displayPreferences().locale, {
      maximumFractionDigits: 1,
      signDisplay: signed ? "exceptZero" : "auto",
    }).format(value);
  }
</script>

<Frame
  aria-labelledby="overview-comparison"
  dense
  spacing="default"
  role="region"
>
  <FrameHeader>
    <FrameTitle id="overview-comparison"
      >{t("overview.comparisonTitle")}</FrameTitle
    >
    <FrameDescription
      >{t("overview.changeVsPrevious", { period })}</FrameDescription
    >
  </FrameHeader>
  <FramePanel>
    <dl class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {#if showTotal}
        {#await totals}
          {@render loading()}
        {:then [current, prior]}
          {@const compared = compareTotals(current, prior)}
          {@render count(t("overview.pageviews"), compared.pageviews)}
          {@render count(t("overview.trackedEvents"), compared.events)}
        {/await}
      {/if}
      {#if showBrowsers}
        {#await browserPair}
          {@render loading()}
        {:then [current, prior]}
          {@render audience(
            t("overview.kpiTopBrowser"),
            compareLeader(current, prior)
          )}
        {/await}
      {/if}
      {#if showLocations}
        {#await locationPair}
          {@render loading()}
        {:then [current, prior]}
          {@render audience(
            t("overview.kpiTopCountry"),
            compareLeader(current, prior)
          )}
        {/await}
      {/if}
    </dl>
  </FramePanel>
</Frame>

{#snippet loading()}
  <div role="status">
    <span class="sr-only">{t("overview.loadingComparison")}</span>
    <Skeleton class="h-14 w-full" />
  </div>
{/snippet}

{#snippet count(label: string, delta: ReturnType<typeof compareCount>)}
  <div class="min-w-0">
    <dt class="text-xs text-muted-foreground">{label}</dt>
    <dd class="mt-1 text-sm tabular-nums">
      {#if !delta}
        {t("overview.comparisonUnavailable")}
      {:else if numbersHidden()}
        {t("overview.kpiHidden")}
      {:else}
        <span class="block text-lg font-semibold">
          {#if delta.percent !== null}
            {decimal(delta.percent, true)}%
          {:else}
            {t(
              delta.current === 0
                ? "overview.noActivity"
                : "overview.newActivity"
            )}
          {/if}
        </span>
        <span class="block text-xs text-muted-foreground">
          {t("overview.countChange", {
            change: `${delta.absolute > 0 ? "+" : ""}${formatCount(delta.absolute)}`,
          })}
        </span>
      {/if}
    </dd>
  </div>
{/snippet}

{#snippet audience(label: string, leader: ReturnType<typeof compareLeader>)}
  <div class="min-w-0">
    <dt class="text-xs text-muted-foreground">{label}</dt>
    <dd class="mt-1 text-sm tabular-nums">
      {#if leader}
        <span class="font-medium break-words">{leader.name}</span>
        <span class="block text-xs text-muted-foreground"
          >{t("overview.shareShift", {
            shift: decimal(leader.shift, true),
          })}</span
        >
      {:else}
        {t("overview.shareUnavailable")}
      {/if}
    </dd>
  </div>
{/snippet}
