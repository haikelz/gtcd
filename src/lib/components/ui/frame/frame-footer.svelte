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

<footer
  bind:this={ref}
  class={cn(
    "flex flex-col gap-(--frame-panel-footer-gap) px-(--frame-panel-footer-px) py-(--frame-panel-footer-py)",
    className
  )}
  data-slot="frame-panel-footer"
  {...restProps}
>
  {@render children?.()}
</footer>
