<script lang="ts" module>
  import { displayPreferences, numbersHidden, t } from "$lib/display";
  import type { CsvCell, CsvRow } from "$lib/csv";
  import type { HitList, HitStat } from "$lib/types";

  // The same share BarChart shows: this page's rows, one decimal.
  function sharePercent(count: number, total: number): number {
    return total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;
  }

  // The same rounding PageRow shows; null means no previous-period visits.
  function changePercent(diff: number | null | undefined): CsvCell {
    if (diff === undefined) return "";
    if (diff === null) return t("charts.new");
    if (diff === 0) return 0;

    return Math.sign(diff) * Math.max(Math.round(Math.abs(diff)), 1);
  }

  /** BarChart rows. "Fewer numbers" leaves out the counts, as on screen. */
  export function statCsvRows(
    stats: readonly HitStat[],
    label: string
  ): CsvRow[] {
    const counts = !numbersHidden();
    const total = stats.reduce((sum, stat) => sum + stat.count, 0);
    const header = counts
      ? [label, t("charts.visits"), t("tools.csvShare")]
      : [label, t("tools.csvShare")];

    return [
      header,
      ...stats.map((stat) => {
        const name = stat.name?.trim() || t("charts.unknown");
        const share = sharePercent(stat.count, total);

        return counts ? [name, stat.count, share] : [name, share];
      }),
    ];
  }

  /** Pages rows; the change column appears once the comparison loaded. */
  export function pageCsvRows(
    hits: readonly HitList[],
    diffs?: Readonly<Record<number, number | null>>
  ): CsvRow[] {
    const counts = !numbersHidden();
    const total = hits.reduce((sum, hit) => sum + hit.count, 0);
    const header = [
      t("tools.csvPath"),
      t("tools.csvTitle"),
      ...(counts ? [t("reports.visits")] : []),
      t("tools.csvShare"),
      ...(diffs ? [t("tools.csvChange")] : []),
    ];

    return [
      header,
      ...hits.map((hit) => [
        hit.path,
        hit.title,
        ...(counts ? [hit.count] : []),
        sharePercent(hit.count, total),
        ...(diffs ? [changePercent(diffs[hit.path_id])] : []),
      ]),
    ];
  }

  /** Path directory rows: the list has no counts. */
  export function pathCsvRows(
    paths: readonly { readonly path: string; readonly title: string }[]
  ): CsvRow[] {
    return [
      [t("tools.csvPath"), t("tools.csvTitle")],
      ...paths.map((item) => [item.path, item.title]),
    ];
  }
</script>

<script lang="ts">
  import { page } from "$app/state";
  import { Button } from "$lib/components/ui/button";
  import { csvFileName, toCsv } from "$lib/csv";
  import { rangeFromParams, toDayString } from "$lib/period";
  import { wallClockNow } from "$lib/preferences";
  import { Download } from "@lucide/svelte";

  type CsvDownloadProps = {
    /** False for lists without a report period, such as Paths. */
    readonly dated?: boolean;
    /** File name part after the site, such as "browsers". */
    readonly report: string;
    /** The rows on screen, header first. */
    readonly rows: readonly CsvRow[];
  };

  let { dated = true, report, rows }: CsvDownloadProps = $props();

  function fileName(): string {
    const site = page.data.site;
    const { end, start } = rangeFromParams(
      page.url.searchParams,
      wallClockNow(displayPreferences().timezone)
    );

    return csvFileName([
      site?.cname || site?.code || "",
      report,
      ...(dated ? [`${toDayString(start)}_${toDayString(end)}`] : []),
    ]);
  }

  // Built from data already on the page: no GoatCounter request and no use
  // of the hourly-limited export. A blob: download needs no CSP exception.
  function download() {
    // The byte order mark makes Excel read UTF-8 instead of the ANSI code page.
    const blob = new Blob(["\uFEFF", toCsv(rows)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = fileName();
    link.href = url;
    link.click();
    // Revoking right away can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
</script>

<Button onclick={download} size="sm" variant="outline">
  <Download data-icon="inline-start" />
  {t("tools.csvDownload")}
</Button>
