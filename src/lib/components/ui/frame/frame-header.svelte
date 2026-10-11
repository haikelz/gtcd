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

<header
  bind:this={ref}
  class={cn(
    "flex flex-col gap-(--frame-panel-header-gap) px-(--frame-panel-header-px) py-(--frame-panel-header-py)",
    className
  )}
  data-slot="frame-panel-header"
  {...restProps}
>
  {@render children?.()}
</header>
