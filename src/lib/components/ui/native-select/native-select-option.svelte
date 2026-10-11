<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLOptionAttributes } from "svelte/elements";

  let {
    children,
    class: className,
    ref = $bindable(null),
    ...restProps
  }: WithElementRef<HTMLOptionAttributes, HTMLOptionElement> = $props();
</script>

<option
  bind:this={ref}
  class={cn("bg-[Canvas] text-[CanvasText]", className)}
  data-slot="native-select-option"
  {...restProps}
>
  {@render children?.()}
</option>
