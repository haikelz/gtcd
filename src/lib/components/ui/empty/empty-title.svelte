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

<p
  bind:this={ref}
  class={cn("text-sm font-medium tracking-tight", className)}
  data-slot="empty-title"
  {...restProps}
>
  {@render children?.()}
</p>
