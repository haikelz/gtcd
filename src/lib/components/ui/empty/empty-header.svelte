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
  class={cn("flex max-w-sm flex-col items-center gap-2", className)}
  data-slot="empty-header"
  {...restProps}
>
  {@render children?.()}
</div>
