<script lang="ts" module>
  import { type VariantProps, tv } from "tailwind-variants";

  // Port of ReUI Alert (base-nova).
  export const alertVariants = tv({
    base: [
      "relative grid w-full grid-cols-[0_1fr] items-center gap-y-0.5 rounded-lg border px-3 py-2.5 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*3)_1fr] has-[>svg]:gap-x-2.5 [&>svg:not([class*=size-])]:size-4",
      "has-[>[data-slot=alert-title]+[data-slot=alert-description]]:[&_[data-slot=alert-action]]:sm:row-end-3",
      "has-[>[data-slot=alert-title]+[data-slot=alert-description]]:items-start",
      "has-[>[data-slot=alert-title]+[data-slot=alert-description]]:[&_svg]:translate-y-0.5",
    ],
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "border-destructive/30 bg-destructive/4 [&>svg]:text-destructive",
        info: "border-info/30 bg-info/4 [&>svg]:text-info",
        success: "border-success/30 bg-success/4 [&>svg]:text-success",
        warning: "border-warning/30 bg-warning/4 [&>svg]:text-warning",
        invert:
          "border-invert bg-invert text-invert-foreground [&_[data-slot=alert-description]]:text-invert-foreground/70",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  });

  export type AlertVariant = VariantProps<typeof alertVariants>["variant"];
</script>

<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLAttributes } from "svelte/elements";

  type AlertProps = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
    readonly variant?: AlertVariant;
  };

  let {
    children,
    class: className,
    ref = $bindable(null),
    role = "alert",
    variant = "default",
    ...restProps
  }: AlertProps = $props();
</script>

<div
  bind:this={ref}
  class={cn(alertVariants({ variant }), className)}
  data-slot="alert"
  {role}
  {...restProps}
>
  {@render children?.()}
</div>
