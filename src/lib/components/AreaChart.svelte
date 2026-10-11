<script lang="ts">
  import { GROUP_LABELS, seriesPoints } from "$lib/period.js";
  import {
    ToggleGroup,
    ToggleGroupItem,
  } from "$lib/components/ui/toggle-group";
  import { displayPreferences, formatCount } from "$lib/display";
  import { cn } from "$lib/utils";
  import type { Group } from "$lib/period.js";
  import type { HitListStat } from "$lib/types";

  type AreaChartProps = {
    readonly data: HitListStat[];
    readonly group?: Group;
    readonly height?: number;
  };

  let { data, group = "day", height = 240 }: AreaChartProps = $props();

  const chartId = $props.id();

  const padding = { top: 16, right: 16, bottom: 36, left: 56 };

  function getChartDimensions(width: number) {
    return {
      chartWidth: Math.max(width - padding.left - padding.right, 10),
      chartHeight: Math.max(height - padding.top - padding.bottom, 10),
    };
  }

  function buildSmoothPath(
    points: { x: number; y: number }[],
    chartWidth: number,
    chartHeight: number
  ) {
    if (points.length === 0) return "";
    const maxY = Math.max(...points.map((p) => p.y), 1);
    const scaleX = (i: number) =>
      (i / Math.max(points.length - 1, 1)) * chartWidth;
    const scaleY = (v: number) => chartHeight - (v / maxY) * chartHeight;

    let d = `M ${scaleX(0)} ${scaleY(points[0].y)}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const tension = 0.3;
      const dx = scaleX(i) - scaleX(i - 1);
      const cpx1 = scaleX(i - 1) + dx * tension;
      const cpy1 = scaleY(prev.y);
      const cpx2 = scaleX(i) - dx * tension;
      const cpy2 = scaleY(curr.y);
      d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${scaleX(i)} ${scaleY(curr.y)}`;
    }
    return d;
  }

  function buildAreaPath(
    points: { x: number; y: number }[],
    chartWidth: number,
    chartHeight: number
  ) {
    const linePath = buildSmoothPath(points, chartWidth, chartHeight);
    if (!linePath) return "";
    return `${linePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;
  }

  let containerEl: HTMLDivElement | undefined = $state(undefined);
  let width = $state(600);
  let hoveredIndex = $state<number | null>(null);
  // GoatCounter's "view as text": the same series as a readable table.
  let view = $state<"chart" | "table">("chart");

  const series = $derived(seriesPoints(data, group, displayPreferences()));
  const groupLabel = $derived(GROUP_LABELS[group]);
  const points = $derived(series.map((d, i) => ({ x: i, y: d.value })));
  const dims = $derived(getChartDimensions(width));
  const linePath = $derived(
    buildSmoothPath(points, dims.chartWidth, dims.chartHeight)
  );
  const areaPath = $derived(
    buildAreaPath(points, dims.chartWidth, dims.chartHeight)
  );
  const maxY = $derived(Math.max(...points.map((p) => p.y), 1));

  // Whole-number steps, so small counts (e.g. a peak of 2) can't round to
  // repeated labels such as 0, 1, 1, 2, 2.
  const yTicks = $derived.by(() => {
    const step = Math.max(1, Math.ceil(maxY / 4));
    const ticks: { value: number; y: number }[] = [];

    for (let value = 0; value <= maxY; value += step) {
      ticks.push({
        value,
        y: dims.chartHeight - (value / maxY) * dims.chartHeight,
      });
    }

    return ticks;
  });

  const xLabels = $derived.by(() => {
    const ticks = series
      .map((point, i) => ({ point, i }))
      .filter(({ point }) => point.tick);
    const labelCount = Math.max(2, Math.floor(dims.chartWidth / 64));
    const step = Math.max(1, Math.ceil(ticks.length / labelCount));
    return ticks
      .map((tick, tickIndex) => ({ ...tick, tickIndex }))
      .filter(({ tickIndex }) => tickIndex % step === 0)
      .map(({ point, i }) => ({
        label: point.label,
        x: (i / Math.max(series.length - 1, 1)) * dims.chartWidth,
      }));
  });

  const totalSum = $derived(data.reduce((s, d) => s + d.daily, 0));
  const avgDaily = $derived(
    data.length > 0 ? Math.round(totalSum / data.length) : 0
  );

  const hoveredValue = $derived(
    hoveredIndex !== null && hoveredIndex < points.length
      ? points[hoveredIndex].y
      : null
  );
  const hoveredLabel = $derived(
    hoveredIndex !== null && hoveredIndex < series.length
      ? series[hoveredIndex].title
      : null
  );

  $effect(() => {
    if (!containerEl) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        width = entry.contentRect.width;
      }
    });
    observer.observe(containerEl);
    return () => observer.disconnect();
  });
</script>

<div bind:this={containerEl} class="w-full overflow-hidden">
  {#if data.length === 0 || series.length === 0}
    <div
      class="flex items-center justify-center text-sm text-muted-foreground"
      style="height: {height}px;"
    >
      No data available
    </div>
  {:else}
    <!-- Summary stats -->
    <div class="mb-4 flex min-h-12 flex-wrap items-center gap-6">
      <div>
        <p class="mb-0.5 text-xs font-medium text-muted-foreground">Total</p>
        <p class="text-lg font-semibold tabular-nums text-foreground">
          {formatCount(totalSum)}
        </p>
      </div>
      <div aria-hidden="true" class="h-8 w-px bg-border"></div>
      <div>
        <p class="mb-0.5 text-xs font-medium text-muted-foreground">
          Daily avg
        </p>
        <p class="text-lg font-semibold tabular-nums text-foreground">
          {formatCount(avgDaily)}
        </p>
      </div>
      {#if view === "chart"}
        <div aria-hidden="true" class="h-8 w-px bg-border"></div>
        <div class="min-w-24">
          <p class="mb-0.5 text-xs font-medium text-muted-foreground">
            {hoveredLabel ?? "Explore chart"}
          </p>
          <p class="text-lg font-semibold tabular-nums text-foreground">
            {hoveredValue == null ? "—" : formatCount(hoveredValue)}
          </p>
        </div>
      {/if}
      <ToggleGroup
        aria-label="Traffic view"
        class="ml-auto"
        onValueChange={(next) => {
          if (next === "chart" || next === "table") view = next;
        }}
        size="sm"
        spacing={0}
        type="single"
        value={view}
        variant="outline"
      >
        <ToggleGroupItem value="chart">Chart</ToggleGroupItem>
        <ToggleGroupItem value="table">Table</ToggleGroupItem>
      </ToggleGroup>
    </div>

    <!-- SVG Area Chart with Full A11Y -->
    <svg
      role="img"
      aria-label="{groupLabel} traffic line chart. Total visits: {formatCount(
        totalSum
      )}, Daily average: {formatCount(avgDaily)}."
      viewBox="0 0 {width} {height}"
      class={view === "table" ? "hidden" : "w-full"}
      style="height: {height}px;"
    >
      <title>{groupLabel} Traffic Chart</title>
      <desc
        >Line chart showing {groupLabel.toLowerCase()} visits between {series[0]
          ?.title} and {series[series.length - 1]?.title}.</desc
      >

      <defs>
        <linearGradient id="{chartId}-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--chart-1)" stop-opacity="0.25" />
          <stop offset="50%" stop-color="var(--chart-1)" stop-opacity="0.08" />
          <stop offset="100%" stop-color="var(--chart-1)" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="{chartId}-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="var(--chart-1)" stop-opacity="0.6" />
          <stop offset="50%" stop-color="var(--chart-1)" stop-opacity="1" />
          <stop offset="100%" stop-color="var(--chart-1)" stop-opacity="0.8" />
        </linearGradient>
      </defs>

      <g transform="translate({padding.left}, {padding.top})">
        <!-- Grid lines -->
        {#each yTicks as tick, i (i)}
          <line
            x1="0"
            y1={tick.y}
            x2={dims.chartWidth}
            y2={tick.y}
            stroke="var(--border)"
            stroke-width="1"
            stroke-dasharray={i === 0 ? "0" : "4 4"}
            opacity={i === 0 ? 0.6 : 0.4}
          />
          <text
            x="-12"
            y={tick.y}
            text-anchor="end"
            dominant-baseline="middle"
            class="fill-muted-foreground text-xs tabular-nums"
            >{formatCount(tick.value)}</text
          >
        {/each}

        <!-- Area -->
        <path d={areaPath} fill="url(#{chartId}-area)" />

        <!-- Line -->
        <path
          d={linePath}
          fill="none"
          stroke="url(#{chartId}-line)"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- Hover crosshair -->
        {#if hoveredIndex !== null && hoveredIndex < points.length}
          {@const hx =
            (hoveredIndex / Math.max(points.length - 1, 1)) * dims.chartWidth}
          {@const hy =
            dims.chartHeight -
            (points[hoveredIndex].y / maxY) * dims.chartHeight}
          <line
            x1={hx}
            y1="0"
            x2={hx}
            y2={dims.chartHeight}
            stroke="var(--chart-1)"
            stroke-opacity="0.25"
            stroke-width="1"
          />
          <circle
            cx={hx}
            cy={hy}
            r="5"
            fill="var(--chart-1)"
            stroke="var(--card)"
            stroke-width="3"
          />
        {/if}

        <!-- X labels -->
        {#each xLabels as label (label.x)}
          <text
            x={label.x}
            y={dims.chartHeight + 22}
            text-anchor="middle"
            class="fill-muted-foreground text-xs tabular-nums"
            >{label.label}</text
          >
        {/each}
      </g>

      <!-- Hover tracking overlay -->
      <rect
        role="presentation"
        aria-hidden="true"
        x={padding.left}
        y={padding.top}
        width={dims.chartWidth}
        height={dims.chartHeight}
        fill="transparent"
        onmousemove={(e: MouseEvent) => {
          const rect = (e.target as SVGRectElement).getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const idx = Math.round(
            (mouseX / dims.chartWidth) * (points.length - 1)
          );
          hoveredIndex = Math.max(0, Math.min(points.length - 1, idx));
        }}
        onmouseleave={() => {
          hoveredIndex = null;
        }}
      />
    </svg>

    <!-- Accessible summary table for assistive tech (WCAG 1.1.1 Non-text Content) -->
    <div
      class={view === "table"
        ? "max-h-80 overflow-auto rounded-lg border border-border"
        : "sr-only"}
    >
      <table class="w-full text-sm">
        <caption class={view === "table" ? "sr-only" : undefined}>
          {groupLabel} traffic statistics
        </caption>
        <thead class="sticky top-0 bg-card">
          <tr class="border-b border-border">
            <th class="h-9 px-3 text-left font-medium" scope="col">Period</th>
            <th class="h-9 px-3 text-right font-medium" scope="col">
              Visits
            </th>
          </tr>
        </thead>
        <tbody>
          {#each series as point, i (i)}
            <tr
              class={cn(
                "border-b border-border last:border-0",
                point.value === 0 && "text-muted-foreground"
              )}
            >
              <td class="px-3 py-1.5">{point.title}</td>
              <td class="px-3 py-1.5 text-right tabular-nums">
                {formatCount(point.value)}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
