<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLAttributes } from "svelte/elements";

  // ReUI renders a div; gtcd keeps an h2 so report sections stay in the
  // document outline under each page's h1.
  type FrameTitleProps = WithElementRef<HTMLAttributes<HTMLHeadingElement>> & {
    readonly level?: 2 | 3 | 4;
  };

  let {
    children,
    class: className,
    level = 2,
    ref = $bindable(null),
    ...restProps
  }: FrameTitleProps = $props();
</script>

<svelte:element
  this={`h${level}`}
  bind:this={ref}
  class={cn("text-sm font-semibold", className)}
  data-slot="frame-panel-title"
  {...restProps}
>
  {@render children?.()}
</svelte:element>
