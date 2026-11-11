<script lang="ts">
  import { busiestHours } from "$lib/busiest-hours";
  import {
    displayPreferences,
    formatCount,
    numbersHidden,
    t,
  } from "$lib/display";
  import { fromDayString } from "$lib/period.js";
  import { formatDate, formatHour, weekdayName } from "$lib/preferences";
  import type { HitListStat } from "$lib/types";

  type HourHeatmapProps = {
    /** GoatCounter `/stats/total` days with their 24 hourly buckets. */
    readonly data: readonly HitListStat[];
  };

  type Cell = { readonly hour: number; readonly row: number };

  let { data }: HourHeatmapProps = $props();

  const id = $props.id();

  // Rows run Monday to Sunday; JavaScript numbers weekdays from Sunday.
  // ponytail: ignores GoatCounter's sunday_starts_week setting; read it
  // through DisplayPreferences if Sunday-first users ask.
  const ROW_WEEKDAYS = [1, 2, 3, 4, 5, 6, 0] as const;
  const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
  // Sequential scale on the first chart token; level 0 means no visits.
  const LEVEL_FILLS = [
    "fill-muted",
    "fill-chart-1/25",
    "fill-chart-1/50",
    "fill-chart-1/75",
    "fill-chart-1",
  ] as const;
  const LEVEL_SWATCHES = [
    "bg-muted",
    "bg-chart-1/25",
    "bg-chart-1/50",
    "bg-chart-1/75",
    "bg-chart-1",
  ] as const;
  const LABEL_WIDTH = 40;
  const HEADER_HEIGHT = 20;
  const CELL_HEIGHT = 22;
  const GAP = 2;

  let width = $state(600);
  let active = $state<Cell | null>(null);

  const preferences = $derived(displayPreferences());
  const hideNumbers = $derived(numbersHidden());
  const grid = $derived(busiestHours(data, preferences.timezone));
  const max = $derived(Math.max(0, ...grid.flat()));
  const busiest = $derived.by((): Cell => {
    for (let row = 0; row < grid.length; row++) {
      const hour = grid[row].indexOf(max);
      if (hour >= 0) return { hour, row };
    }
    return { hour: 0, row: 0 };
  });
  const cellWidth = $derived(Math.max((width - LABEL_WIDTH) / 24, 4));
  const labelStep = $derived(cellWidth * 3 >= 44 ? 3 : 6);
  const height = HEADER_HEIGHT + CELL_HEIGHT * 7;

  function level(value: number): number {
    if (value <= 0 || max <= 0) return 0;

    return Math.max(1, Math.ceil((value / max) * 4));
  }

  function weekday(row: number, variant: "short" | "long" = "short"): string {
    return weekdayName(ROW_WEEKDAYS[row], preferences.locale, variant);
  }

  function hourLabel(hour: number): string {
    return formatHour(hour, preferences.twentyFourHours);
  }

  /** Averages keep one decimal; fewer-numbers mode shows a share of the peak. */
  function cellValue(value: number): string {
    return hideNumbers
      ? `${max > 0 ? Math.round((value / max) * 100) : 0}%`
      : formatCount(Math.round(value * 10) / 10);
  }

  function dayLabel(day: string | undefined): string {
    const date = day ? fromDayString(day) : null;

    return date
      ? formatDate(date, preferences.dateFormat, "full", preferences.locale)
      : "";
  }

  function describe(cell: Cell): string {
    const value = grid[cell.row][cell.hour];
    const params = {
      hour: hourLabel(cell.hour),
      weekday: weekday(cell.row),
    };

    return hideNumbers
      ? t("insights.hourShare", {
          ...params,
          share: max > 0 ? Math.round((value / max) * 100) : 0,
        })
      : t("insights.hourVisits", {
          ...params,
          count: formatCount(Math.round(value * 10) / 10),
        });
  }

  function handleKeydown(event: KeyboardEvent) {
    const current = active ?? busiest;
    const moves: Record<string, Cell> = {
      ArrowDown: { ...current, row: Math.min(current.row + 1, 6) },
      ArrowLeft: { ...current, hour: Math.max(current.hour - 1, 0) },
      ArrowRight: { ...current, hour: Math.min(current.hour + 1, 23) },
      ArrowUp: { ...current, row: Math.max(current.row - 1, 0) },
      End: { ...current, hour: 23 },
      Home: { ...current, hour: 0 },
    };
    const next = moves[event.key];
    if (!next) return;

    event.preventDefault();
    active = next;
  }
</script>

<div class="flex flex-col gap-3">
  <p
    aria-live="polite"
    class="min-h-4 text-xs text-muted-foreground tabular-nums"
  >
    {active ? describe(active) : t("insights.hoursExplore")}
  </p>
  <div bind:clientWidth={width} class="w-full">
    <!-- The image takes focus so keyboard users can step through cells with
         the arrow keys; screen readers read the same values from the table
         below, so it keeps role="img". -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
    <svg
      aria-describedby="{id}-desc"
      aria-labelledby="{id}-title"
      class="block w-full rounded-sm"
      {height}
      onblur={() => (active = null)}
      onfocus={() => (active ??= busiest)}
      onkeydown={handleKeydown}
      onmouseleave={() => (active = null)}
      role="img"
      tabindex="0"
      viewBox="0 0 {width} {height}"
    >
      <title id="{id}-title">{t("insights.hoursGridTitle")}</title>
      <desc id="{id}-desc"
        >{t("insights.hoursGridDescription", {
          end: dayLabel(data.at(-1)?.day),
          hour: hourLabel(busiest.hour),
          start: dayLabel(data[0]?.day),
          weekday: weekday(busiest.row, "long"),
        })}</desc
      >
      {#each HOURS as hour (hour)}
        {#if hour % labelStep === 0}
          <text
            class="fill-muted-foreground text-xs tabular-nums"
            dominant-baseline="middle"
            x={LABEL_WIDTH + hour * cellWidth}
            y={HEADER_HEIGHT / 2}>{hourLabel(hour)}</text
          >
        {/if}
      {/each}
      {#each grid as values, row (row)}
        {@const y = HEADER_HEIGHT + row * CELL_HEIGHT}
        <text
          class="fill-muted-foreground text-xs"
          dominant-baseline="middle"
          x="0"
          y={y + CELL_HEIGHT / 2}>{weekday(row)}</text
        >
        {#each values as value, hour (hour)}
          {@const isActive = active?.row === row && active.hour === hour}
          <rect
            class={LEVEL_FILLS[level(value)]}
            height={CELL_HEIGHT - GAP}
            onmouseenter={() => (active = { hour, row })}
            role="presentation"
            rx="2"
            stroke={isActive ? "var(--foreground)" : undefined}
            stroke-width={isActive ? 2 : undefined}
            width={Math.max(cellWidth - GAP, 1)}
            x={LABEL_WIDTH + hour * cellWidth}
            {y}
          />
        {/each}
      {/each}
    </svg>
  </div>
  <div
    aria-hidden="true"
    class="flex items-center justify-end gap-1.5 text-xs text-muted-foreground"
    title={t("insights.hoursLegend")}
  >
    <span>{t("insights.hoursFewer")}</span>
    {#each LEVEL_SWATCHES as swatch (swatch)}
      <span class="size-3 rounded-xs {swatch}"></span>
    {/each}
    <span>{t("insights.hoursMore")}</span>
  </div>
  <table class="sr-only">
    <caption>
      {hideNumbers
        ? t("insights.hoursTableCaptionShare")
        : t("insights.hoursTableCaption")}
    </caption>
    <thead>
      <tr>
        <th scope="col">{t("insights.hoursWeekday")}</th>
        {#each HOURS as hour (hour)}
          <th scope="col">{hourLabel(hour)}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each grid as values, row (row)}
        <tr>
          <th scope="row">{weekday(row, "long")}</th>
          {#each values as value, hour (hour)}
            <td>{cellValue(value)}</td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
