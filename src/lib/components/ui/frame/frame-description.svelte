<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLAttributes } from "svelte/elements";

  let {
    children,
    class: className,
    ref = $bindable(null),
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLParagraphElement>> = $props();
</script>

<p
  bind:this={ref}
  class={cn("text-sm text-muted-foreground", className)}
  data-slot="frame-panel-description"
  {...restProps}
>
  {@render children?.()}
</p>
