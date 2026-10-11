<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLAttributes } from "svelte/elements";

  type FramePanelProps = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
    /** Size the panel to its content instead of growing to fill the frame. */
    readonly fit?: boolean;
  };

  let {
    children,
    class: className,
    fit = false,
    ref = $bindable(null),
    ...restProps
  }: FramePanelProps = $props();
</script>

<div
  bind:this={ref}
  class={cn(
    "relative min-w-0 overflow-hidden rounded-(--frame-panel-radius) border border-(--frame-panel-border-color) bg-(--frame-panel-bg) bg-clip-padding text-card-foreground shadow-xs",
    !fit && "grow",
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--frame-panel-radius)-1px)] before:shadow-black/5",
    "dark:bg-clip-border dark:before:shadow-white/5",
    "px-(--frame-panel-px) py-(--frame-panel-py)",
    className
  )}
  data-slot="frame-panel"
  {...restProps}
>
  {@render children?.()}
</div>
