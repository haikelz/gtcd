<script lang="ts" module>
  import { type VariantProps, tv } from "tailwind-variants";

  export const emptyMediaVariants = tv({
    base: "mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  });

  export type EmptyMediaVariant = VariantProps<
    typeof emptyMediaVariants
  >["variant"];
</script>

<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLAttributes } from "svelte/elements";

  type EmptyMediaProps = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
    readonly variant?: EmptyMediaVariant;
  };

  let {
    children,
    class: className,
    ref = $bindable(null),
    variant = "default",
    ...restProps
  }: EmptyMediaProps = $props();
</script>

<div
  bind:this={ref}
  class={cn(emptyMediaVariants({ variant }), className)}
  data-slot="empty-icon"
  data-variant={variant}
  {...restProps}
>
  {@render children?.()}
</div>
