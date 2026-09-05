<script lang="ts">
  import type { HitListStat } from "$lib/types";

  let {
    data,
    height = 240,
  }: {
    data: HitListStat[];
    height?: number;
  } = $props();

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

  const points = $derived(data.map((d, i) => ({ x: i, y: d.daily })));
  const dims = $derived(getChartDimensions(width));
  const linePath = $derived(
    buildSmoothPath(points, dims.chartWidth, dims.chartHeight)
  );
  const areaPath = $derived(
    buildAreaPath(points, dims.chartWidth, dims.chartHeight)
  );
  const maxY = $derived(Math.max(...points.map((p) => p.y), 1));

  const yTicks = $derived.by(() => {
    const count = 4;
    const step = maxY / count;
    return Array.from({ length: count + 1 }, (_, i) => ({
      value: Math.round(step * i),
      y: dims.chartHeight - ((step * i) / maxY) * dims.chartHeight,
    }));
  });

  const xLabels = $derived(
    data
      .map((d, i) => ({ d, i }))
      .filter(({ i }) => {
        const total = data.length;
        if (total <= 14) return true;
        if (total <= 60) return i % 7 === 0;
        return i % 30 === 0;
      })
      .map(({ d, i }) => ({
        label: d.day.slice(5),
        x: (i / Math.max(data.length - 1, 1)) * dims.chartWidth,
      }))
  );

  const totalSum = $derived(data.reduce((s, d) => s + d.daily, 0));
  const avgDaily = $derived(
    data.length > 0 ? Math.round(totalSum / data.length) : 0
  );

  const hoveredValue = $derived(
    hoveredIndex !== null && hoveredIndex < points.length
      ? points[hoveredIndex].y
      : null
  );
  const hoveredDate = $derived(
    hoveredIndex !== null && hoveredIndex < data.length
      ? data[hoveredIndex].day
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
  {#if data.length === 0}
    <div
      class="flex items-center justify-center text-sm text-muted-foreground"
      style="height: {height}px;"
    >
      No data available
    </div>
  {:else}
    <!-- Summary stats -->
    <div class="flex items-center gap-6 mb-5">
      <div>
        <p class="text-xs font-medium mb-0.5 text-muted-foreground">Total</p>
        <p class="font-bold text-lg tabular-nums text-foreground">
          {totalSum.toLocaleString()}
        </p>
      </div>
      <div class="w-px h-8 bg-border"></div>
      <div>
        <p class="text-xs font-medium mb-0.5 text-muted-foreground">Daily avg</p>
        <p class="font-bold text-lg tabular-nums text-foreground">
          {avgDaily.toLocaleString()}
        </p>
      </div>
      {#if hoveredValue !== null}
        <div class="w-px h-8 bg-border"></div>
        <div>
          <p class="text-xs font-medium mb-0.5 text-muted-foreground">
            {hoveredDate}
          </p>
          <p class="font-bold text-lg tabular-nums text-primary">
            {hoveredValue.toLocaleString()}
          </p>
        </div>
      {/if}
    </div>

    <!-- SVG Area Chart with Full A11Y -->
    <svg
      role="img"
      aria-label="Daily traffic line chart. Total visitors: {totalSum.toLocaleString()}, Daily average: {avgDaily.toLocaleString()}."
      viewBox="0 0 {width} {height}"
      class="w-full"
      style="height: {height}px;"
    >
      <title>Daily Traffic Chart</title>
      <desc
        >Line chart showing visitor traffic between {data[0]?.day} and {data[
          data.length - 1
        ]?.day}.</desc
      >

      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stop-color="var(--color-primary)"
            stop-opacity="0.15"
          />
          <stop
            offset="50%"
            stop-color="var(--color-primary)"
            stop-opacity="0.05"
          />
          <stop
            offset="100%"
            stop-color="var(--color-primary)"
            stop-opacity="0"
          />
        </linearGradient>
        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
          <stop
            offset="0%"
            stop-color="var(--color-primary)"
            stop-opacity="0.6"
          />
          <stop
            offset="50%"
            stop-color="var(--color-primary)"
            stop-opacity="1"
          />
          <stop
            offset="100%"
            stop-color="var(--color-primary)"
            stop-opacity="0.8"
          />
        </linearGradient>
      </defs>

      <g transform="translate({padding.left}, {padding.top})">
        <!-- Grid lines -->
        {#each yTicks as tick, i}
          <line
            x1="0"
            y1={tick.y}
            x2={dims.chartWidth}
            y2={tick.y}
            stroke="var(--color-border)"
            stroke-width="1"
            stroke-dasharray={i === 0 ? "0" : "4 4"}
            opacity={i === 0 ? 0.6 : 0.4}
          />
          <text
            x="-12"
            y={tick.y}
            text-anchor="end"
            dominant-baseline="middle"
            class="text-[10px] font-mono fill-muted-foreground"
            >{tick.value.toLocaleString()}</text
          >
        {/each}

        <!-- Area -->
        <path d={areaPath} fill="url(#chartGradient)" />

        <!-- Line -->
        <path
          d={linePath}
          fill="none"
          stroke="url(#lineGradient)"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- Hover crosshair -->
        {#if hoveredIndex !== null && hoveredIndex < points.length}
          {@const hx = (hoveredIndex / Math.max(points.length - 1, 1)) * dims.chartWidth}
          {@const hy =
            dims.chartHeight -
            (points[hoveredIndex].y / maxY) * dims.chartHeight}
          <line
            x1={hx}
            y1="0"
            x2={hx}
            y2={dims.chartHeight}
            stroke="var(--color-primary)"
            stroke-opacity="0.25"
            stroke-width="1"
          />
          <circle
            cx={hx}
            cy={hy}
            r="5"
            fill="var(--color-primary)"
            stroke="var(--color-base-100)"
            stroke-width="3"
            class="shadow-sm"
          />
        {/if}

        <!-- X labels -->
        {#each xLabels as label}
          <text
            x={label.x}
            y={dims.chartHeight + 22}
            text-anchor="middle"
            class="text-[10px] font-mono fill-muted-foreground"
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
    <div class="sr-only">
      <table>
        <caption>Daily traffic statistics</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Visitors</th>
          </tr>
        </thead>
        <tbody>
          {#each data as item}
            <tr>
              <td>{item.day}</td>
              <td>{item.daily}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
