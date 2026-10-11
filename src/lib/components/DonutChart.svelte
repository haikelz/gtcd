<script lang="ts">
  import EmptyState from "$lib/components/EmptyState.svelte";
  import { formatCount, numbersHidden, t } from "$lib/display";
  import type { HitStat } from "$lib/types";

  let {
    data,
    label = t("charts.defaultDonutLabel"),
  }: { data: HitStat[]; label?: string } = $props();

  const total = $derived(
    data.reduce((sum, category) => sum + category.count, 0)
  );
  const segments = $derived.by(() => {
    const ranked = [...data]
      .filter((category) => category.count > 0)
      .sort((a, b) => b.count - a.count);
    const visible = ranked.slice(0, 4);
    const remaining = ranked
      .slice(4)
      .reduce((sum, category) => sum + category.count, 0);
    if (remaining > 0)
      visible.push({
        id: "remainder",
        name: t("charts.other"),
        count: remaining,
      });

    let offset = 0;
    return visible.map((category, index) => {
      const share = total > 0 ? (category.count / total) * 100 : 0;
      const segment = {
        ...category,
        share,
        offset,
        color: `var(--chart-${index + 1})`,
      };
      offset += share;
      return segment;
    });
  });
</script>

{#if total > 0}
  <div class="flex flex-col">
    <div class="relative mx-auto mb-5 w-full max-w-50">
      <svg
        viewBox="0 0 200 200"
        role="img"
        aria-label={t("charts.distribution", { label })}
      >
        <title>{t("charts.distribution", { label })}</title>
        <desc
          >{numbersHidden()
            ? t("charts.donutDescriptionHidden", { label: label.toLowerCase() })
            : t("charts.donutDescription", {
                count: formatCount(total),
                label: label.toLowerCase(),
              })}</desc
        >
        <circle
          cx="100"
          cy="100"
          r="78"
          fill="none"
          stroke="var(--card)"
          stroke-width="22"
        />
        <g transform="rotate(-90 100 100)">
          {#each segments as segment, index (index)}
            <circle
              cx="100"
              cy="100"
              r="78"
              fill="none"
              stroke={segment.color}
              stroke-width="22"
              pathLength="100"
              stroke-dasharray="{segment.share} {100 - segment.share}"
              stroke-dashoffset={-segment.offset}
            />
          {/each}
        </g>
      </svg>
      <div
        class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        aria-hidden="true"
      >
        {#if numbersHidden()}
          <span class="text-sm font-medium text-muted-foreground"
            >{t("charts.shares")}</span
          >
        {:else}
          <span class="text-2xl font-semibold tracking-tight tabular-nums"
            >{formatCount(total)}</span
          >
          <span class="mt-1 text-xs text-muted-foreground"
            >{t("charts.recordedVisits")}</span
          >
        {/if}
      </div>
    </div>
    <ul
      class="list-none m-0 p-0 space-y-3"
      aria-label={t("charts.sharesList", { label })}
    >
      {#each segments as segment, index (index)}
        <li class="flex items-center gap-2 text-xs">
          <span
            class="w-2 h-2 rounded-full shrink-0"
            style:background={segment.color}
            aria-hidden="true"
          ></span>
          <span class="truncate flex-1 text-foreground" title={segment.name}
            >{segment.name}</span
          >
          {#if !numbersHidden()}<span class="tabular-nums text-muted-foreground"
              >{formatCount(segment.count)}</span
            >{/if}
          <span class="w-12 text-right tabular-nums font-medium"
            >{segment.share.toFixed(1)}%</span
          >
        </li>
      {/each}
    </ul>
    <table class="sr-only">
      <thead
        ><tr
          ><th scope="col">{label}</th><th scope="col">{t("charts.visits")}</th
          ><th scope="col">{t("charts.share")}</th></tr
        ></thead
      >
      <tbody
        >{#each segments as segment, index (index)}<tr
            ><th scope="row">{segment.name}</th><td>{segment.count}</td><td
              >{segment.share.toFixed(1)}%</td
            ></tr
          >{/each}</tbody
      >
    </table>
  </div>
{:else}
  <EmptyState
    title={t("charts.noLabelData", { label: label.toLowerCase() })}
    desc={t("charts.noLabelDataHint")}
    class="px-0 py-8"
  />
{/if}
