<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Frame, FramePanel } from "$lib/components/ui/frame";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { cn } from "$lib/utils.js";
  import {
    ArrowDownRight,
    ArrowUpRight,
    type ChartNoAxesCombined,
  } from "@lucide/svelte";

  type StatCardProps = {
    readonly class?: string;
    /** Truncate long text values (names) to one line instead of wrapping. */
    readonly compact?: boolean;
    readonly icon?: typeof ChartNoAxesCombined;
    readonly label: string;
    /** Show placeholders while the value streams in. */
    readonly loading?: boolean;
    readonly subtext?: string;
    readonly trend?: { value: string; direction: "up" | "down" };
    readonly value?: string | number;
  };

  let {
    class: className = "",
    compact = false,
    icon: Icon,
    label,
    loading = false,
    subtext,
    trend,
    value = "—",
  }: StatCardProps = $props();
</script>

<Frame class={className} spacing="sm">
  <FramePanel
    aria-busy={loading}
    aria-label={loading
      ? `${label}: loading`
      : `${label}: ${value}${subtext ? `, ${subtext}` : ""}`}
    class="flex flex-col gap-2"
    role="group"
  >
    <div class="flex items-center justify-between gap-2">
      <p class="text-xs font-medium text-muted-foreground">{label}</p>
      {#if Icon}
        <Icon
          aria-hidden="true"
          class="size-4 shrink-0 text-muted-foreground"
        />
      {/if}
    </div>
    {#if loading}
      <Skeleton class="h-8 w-28" />
      <Skeleton class="h-3 w-32" />
    {:else}
      <div class="flex min-w-0 flex-wrap items-center gap-2">
        <p
          class={cn(
            "min-w-0 text-2xl font-semibold tracking-tight text-foreground tabular-nums",
            compact ? "truncate" : "break-words"
          )}
          title={compact ? String(value) : undefined}
        >
          {value}
        </p>
        {#if trend}
          <Badge
            size="sm"
            variant={trend.direction === "up"
              ? "success-light"
              : "destructive-light"}
          >
            {#if trend.direction === "up"}
              <ArrowUpRight aria-hidden="true" />
            {:else}
              <ArrowDownRight aria-hidden="true" />
            {/if}
            <span class="sr-only">Trend {trend.direction}:</span>
            {trend.value}
          </Badge>
        {/if}
      </div>
      {#if subtext}
        <p class="text-xs text-muted-foreground">{subtext}</p>
      {/if}
    {/if}
  </FramePanel>
</Frame>
