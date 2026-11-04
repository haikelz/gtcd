<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLAttributes } from "svelte/elements";

  let {
    children,
    class: className,
    ref = $bindable(null),
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLElement>> = $props();
</script>

<div
  bind:this={ref}
  class={cn(
    "flex w-full max-w-sm min-w-0 flex-col items-center gap-2.5 text-sm text-balance",
    className
  )}
  data-slot="empty-content"
  {...restProps}
>
  {@render children?.()}
</div>
