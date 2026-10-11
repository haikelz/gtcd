<script lang="ts">
  import { cn } from "$lib/utils.js";
  import { ToggleGroup as ToggleGroupPrimitive } from "bits-ui";
  import {
    getToggleGroupContext,
    type ToggleSize,
    toggleVariants,
    type ToggleVariant,
  } from "./toggle-group.svelte";

  type ToggleGroupItemProps = ToggleGroupPrimitive.ItemProps & {
    readonly size?: ToggleSize;
    readonly variant?: ToggleVariant;
  };

  let {
    class: className,
    ref = $bindable(null),
    size = "default",
    variant = "default",
    ...restProps
  }: ToggleGroupItemProps = $props();

  const context = getToggleGroupContext();
  const resolvedSize = $derived(context?.size ?? size);
  const resolvedVariant = $derived(context?.variant ?? variant);
</script>

<ToggleGroupPrimitive.Item
  bind:ref
  class={cn(
    "shrink-0 group-data-[spacing=0]/toggle-group:rounded-none group-data-[spacing=0]/toggle-group:px-2 focus:z-10 focus-visible:z-10 group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:first:rounded-l-lg group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:last:rounded-r-lg group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-[orientation=horizontal]/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l",
    toggleVariants({
      size: resolvedSize,
      variant: resolvedVariant,
    }),
    className
  )}
  data-size={resolvedSize}
  data-slot="toggle-group-item"
  data-spacing={context?.spacing}
  data-variant={resolvedVariant}
  {...restProps}
/>
