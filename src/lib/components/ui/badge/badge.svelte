<script lang="ts" module>
  import { type VariantProps, tv } from "tailwind-variants";

  // Port of ReUI Badge (base-nova). The `focus` variants are omitted because
  // ReUI documents no `--focus` token to back them.
  export const badgeVariants = tv({
    base: [
      "relative inline-flex w-fit shrink-0 items-center justify-center border border-transparent font-medium whitespace-nowrap outline-none transition-shadow",
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
      "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-3",
    ],
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        outline: "border-border bg-transparent dark:bg-input/32",
        secondary: "bg-secondary text-secondary-foreground",
        info: "bg-info text-white",
        success: "bg-success text-white",
        warning: "bg-warning text-white",
        destructive: "bg-destructive text-white",
        invert: "bg-invert text-invert-foreground",
        "primary-light":
          "border-primary/10 bg-primary/10 text-primary dark:border-primary/25 dark:bg-primary/15 dark:text-primary",
        "warning-light":
          "border-warning/15 bg-warning/10 text-warning-foreground dark:border-warning/25 dark:bg-warning/15 dark:text-warning",
        "success-light":
          "border-success/15 bg-success/10 text-success-foreground dark:border-success/25 dark:bg-success/15 dark:text-success",
        "info-light":
          "border-info/15 bg-info/10 text-info-foreground dark:border-info/25 dark:bg-info/15 dark:text-info",
        "destructive-light":
          "border-destructive/15 bg-destructive/10 text-destructive-foreground dark:border-destructive/25 dark:bg-destructive/15 dark:text-destructive",
        "invert-light":
          "border-invert/15 bg-invert/10 text-foreground dark:border-invert/45 dark:bg-invert/35 dark:text-invert-foreground",
        "primary-outline":
          "border-border bg-background text-primary dark:bg-input/30",
        "warning-outline":
          "border-border bg-background text-warning-foreground dark:bg-input/30",
        "success-outline":
          "border-border bg-background text-success-foreground dark:bg-input/30",
        "info-outline":
          "border-border bg-background text-info-foreground dark:bg-input/30",
        "destructive-outline":
          "border-border bg-background text-destructive-foreground dark:bg-input/30",
        "invert-outline":
          "border-border bg-background text-invert-foreground dark:bg-input/30",
      },
      size: {
        xs: "h-4 min-w-4 gap-1 px-1 py-0.25 text-[0.6rem] leading-none",
        sm: "h-4.5 min-w-4.5 gap-1 px-1 py-0.25 text-[0.625rem] leading-none",
        default: "h-5 min-w-5 gap-1 px-1.25 py-0.5 text-xs",
        lg: "h-5.5 min-w-5.5 gap-1 px-1.5 py-0.5 text-xs",
        xl: "h-6 min-w-6 gap-1.5 px-2 py-0.75 text-sm",
      },
      radius: {
        default: "rounded-sm",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      radius: "default",
      size: "default",
      variant: "default",
    },
  });

  export type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];
  export type BadgeSize = VariantProps<typeof badgeVariants>["size"];
  export type BadgeRadius = VariantProps<typeof badgeVariants>["radius"];
</script>

<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLAttributes } from "svelte/elements";

  type BadgeProps = WithElementRef<HTMLAttributes<HTMLSpanElement>> & {
    readonly radius?: BadgeRadius;
    readonly size?: BadgeSize;
    readonly variant?: BadgeVariant;
  };

  let {
    children,
    class: className,
    radius = "default",
    ref = $bindable(null),
    size = "default",
    variant = "default",
    ...restProps
  }: BadgeProps = $props();
</script>

<span
  bind:this={ref}
  class={cn(badgeVariants({ radius, size, variant }), className)}
  data-slot="badge"
  {...restProps}
>
  {@render children?.()}
</span>
