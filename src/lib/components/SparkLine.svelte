<script lang="ts">
  import { cn } from "$lib/utils.js";
  import { seriesPoints } from "$lib/period.js";
  import { displayPreferences } from "$lib/display";
  import type { Group } from "$lib/period.js";
  import type { HitListStat } from "$lib/types";

  type SparkLineProps = {
    readonly class?: string;
    readonly data: HitListStat[];
    readonly group?: Group;
    readonly max?: number;
  };

  let {
    class: className = "",
    data,
    group = "day",
    max,
  }: SparkLineProps = $props();

  const width = 100;
  const height = 28;

  const series = $derived(seriesPoints(data, group, displayPreferences()));
  const scale = $derived(
    Math.max(max ?? 0, ...series.map((point) => point.value), 1)
  );
  const linePath = $derived.by(() => {
    if (series.length === 0) return "";
    const x = (i: number) =>
      series.length === 1 ? width / 2 : (i / (series.length - 1)) * width;
    const y = (value: number) => height - 2 - (value / scale) * (height - 4);
    return series
      .map(
        (point, i) =>
          `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(point.value).toFixed(2)}`
      )
      .join(" ");
  });
  const areaPath = $derived(
    linePath ? `${linePath} L ${width} ${height} L 0 ${height} Z` : ""
  );
</script>

<svg
  aria-hidden="true"
  class={cn("h-7 w-28 shrink-0 lg:w-36", className)}
  focusable="false"
  preserveAspectRatio="none"
  viewBox="0 0 {width} {height}"
>
  {#if linePath}
    <path class="fill-chart-1/10" d={areaPath} />
    <path
      class="fill-none stroke-chart-1"
      d={linePath}
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.5"
      vector-effect="non-scaling-stroke"
    />
  {/if}
</svg>
