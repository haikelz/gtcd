<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLAttributes } from "svelte/elements";

  let {
    children,
    class: className,
    ref = $bindable(null),
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
  bind:this={ref}
  class={cn(
    "flex gap-1.5 max-sm:col-start-2 max-sm:mt-2 max-sm:justify-start sm:col-start-3 sm:row-start-1 sm:justify-end sm:self-center",
    className
  )}
  data-slot="alert-action"
  {...restProps}
>
  {@render children?.()}
</div>
