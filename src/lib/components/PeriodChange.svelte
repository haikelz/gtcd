<script lang="ts">
  import { t } from "$lib/display";
  import type { compareCount } from "$lib/overview-comparison";

  type PeriodChangeProps = {
    /** null renders nothing: the comparison is unavailable. */
    readonly change: ReturnType<typeof compareCount>;
  };

  let { change }: PeriodChangeProps = $props();

  // Same wording and colors as the Pages report's change column.
  const display = $derived.by(() => {
    if (!change) return null;
    if (change.absolute === 0) {
      return { className: "text-muted-foreground", text: "0%" };
    }
    if (change.percent === null) {
      return {
        className: "text-muted-foreground italic",
        text: t("charts.new"),
      };
    }

    const magnitude = Math.max(Math.round(Math.abs(change.percent)), 1);
    return change.percent > 0
      ? {
          className: "text-success-foreground dark:text-success",
          text: `+${magnitude}%`,
        }
      : {
          className: "text-destructive-foreground dark:text-destructive",
          text: `–${magnitude}%`,
        };
  });
</script>

{#if display}
  <span
    class="text-xs font-medium tabular-nums {display.className}"
    title={t("charts.changeVsPrevious")}
    ><span class="sr-only">{`${t("charts.changeVsPrevious")}: `}</span
    >{display.text}</span
  >
{/if}
