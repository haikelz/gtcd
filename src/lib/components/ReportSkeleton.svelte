<script lang="ts">
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { t } from "$lib/display";

  type ReportSkeletonProps = {
    /** Screen-reader status; defaults to a generic report message. */
    readonly label?: string;
    readonly rows?: number;
  };

  let { label, rows = 5 }: ReportSkeletonProps = $props();
</script>

<!-- Same shape as BarChart rows: name and value, then the share bar. -->
<div class="flex w-full flex-col gap-4 py-1" role="status">
  <span class="sr-only">{label ?? t("reports.loading")}</span>
  {#each { length: rows }, i (i)}
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between gap-4">
        <Skeleton class="h-4 w-1/3" />
        <Skeleton class="h-4 w-16" />
      </div>
      <Skeleton class="h-1.5 w-full rounded-full" />
    </div>
  {/each}
</div>
