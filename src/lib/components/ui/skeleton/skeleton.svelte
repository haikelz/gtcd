<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLAttributes } from "svelte/elements";

  let {
    class: className,
    ref = $bindable(null),
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
  bind:this={ref}
  aria-hidden="true"
  class={cn("animate-pulse rounded-md bg-muted", className)}
  data-slot="skeleton"
  {...restProps}
></div>
