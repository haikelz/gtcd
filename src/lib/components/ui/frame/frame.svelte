<script lang="ts" module>
  import { type VariantProps, tv } from "tailwind-variants";

  /*
   * Port of ReUI Frame (base-nova). Frame publishes the panel geometry as CSS
   * variables; FramePanel, FrameHeader and FrameFooter read them back, so one
   * `spacing` or `variant` on the Frame re-times every child.
   */
  export const frameVariants = tv({
    base: [
      "relative flex min-w-0 flex-col gap-(--frame-gap) rounded-(--frame-radius) bg-muted/50 px-(--frame-px) py-(--frame-py)",
      "[--frame-radius:var(--radius-xl)]",
      "[--frame-gap:--spacing(0.75)] [--frame-px:--spacing(0.75)] [--frame-py:--spacing(0.75)] [--frame-panel-header-gap:0rem] [--frame-panel-footer-gap:--spacing(1)]",
      "[--frame-panel-px:var(--frame-panel-px-base)] [--frame-panel-py:var(--frame-panel-py-base)] [--frame-panel-header-px:var(--frame-panel-header-px-base)] [--frame-panel-header-py:var(--frame-panel-header-py-base)] [--frame-panel-footer-px:var(--frame-panel-footer-px-base)] [--frame-panel-footer-py:var(--frame-panel-footer-py-base)]",
      "[--frame-panel-bg:var(--color-card)] [--frame-panel-border-color:var(--color-border)] [--frame-border-color:var(--color-border)]",
      "[--frame-panel-radius:calc(var(--frame-radius)-var(--frame-px)-1px)]",
    ],
    variants: {
      variant: {
        default: "border border-(--frame-border-color) bg-clip-padding",
        inverse:
          "border border-(--frame-border-color) bg-background bg-clip-padding [--frame-panel-bg:color-mix(in_oklch,var(--color-muted)_40%,transparent)]",
        ghost:
          "[--frame-panel-radius:calc(var(--frame-radius)-var(--frame-px))]",
      },
      spacing: {
        xs: "[--frame-panel-footer-px-base:--spacing(2)] [--frame-panel-footer-py-base:--spacing(0.5)] [--frame-panel-header-px-base:--spacing(2)] [--frame-panel-header-py-base:--spacing(0.5)] [--frame-panel-px-base:--spacing(2)] [--frame-panel-py-base:--spacing(2)]",
        sm: "[--frame-panel-footer-px-base:--spacing(3)] [--frame-panel-footer-py-base:--spacing(1.5)] [--frame-panel-header-px-base:--spacing(3)] [--frame-panel-header-py-base:--spacing(1.5)] [--frame-panel-px-base:--spacing(3)] [--frame-panel-py-base:--spacing(3.5)]",
        default:
          "[--frame-panel-footer-px-base:--spacing(4)] [--frame-panel-footer-py-base:--spacing(2)] [--frame-panel-header-px-base:--spacing(4)] [--frame-panel-header-py-base:--spacing(2)] [--frame-panel-px-base:--spacing(4)] [--frame-panel-py-base:--spacing(4)]",
        lg: "[--frame-panel-footer-px-base:--spacing(5)] [--frame-panel-footer-py-base:--spacing(2.5)] [--frame-panel-header-px-base:--spacing(5)] [--frame-panel-header-py-base:--spacing(2.5)] [--frame-panel-px-base:--spacing(5)] [--frame-panel-py-base:--spacing(5)]",
      },
      stacked: {
        true: [
          "gap-0 *:has-[+[data-slot=frame-panel]]:rounded-b-none",
          "*:has-[+[data-slot=frame-panel]]:before:hidden",
          "*:[[data-slot=frame-panel]+[data-slot=frame-panel]]:rounded-t-none",
          "*:[[data-slot=frame-panel]+[data-slot=frame-panel]]:border-t-0",
        ],
        false: [
          "data-[spacing=sm]:*:[[data-slot=frame-panel]+[data-slot=frame-panel]]:mt-0.5",
          "data-[spacing=default]:*:[[data-slot=frame-panel]+[data-slot=frame-panel]]:mt-1",
          "data-[spacing=lg]:*:[[data-slot=frame-panel]+[data-slot=frame-panel]]:mt-2",
        ],
      },
      dense: {
        true: "gap-0 border-(--frame-border-color) p-0 [--frame-panel-radius:var(--frame-radius)] [&_[data-slot=frame-panel]]:-mx-px [&_[data-slot=frame-panel]]:before:hidden [&_[data-slot=frame-panel]:last-child]:-mb-px [&:not(:has([data-slot=frame-panel-header]))_[data-slot=frame-panel]:is(:first-child)]:-mt-px",
        false: "",
      },
    },
    defaultVariants: {
      dense: false,
      spacing: "default",
      stacked: false,
      variant: "default",
    },
  });

  export type FrameVariant = VariantProps<typeof frameVariants>["variant"];
  export type FrameSpacing = VariantProps<typeof frameVariants>["spacing"];
</script>

<script lang="ts">
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type { HTMLAttributes } from "svelte/elements";

  type FrameProps = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
    readonly dense?: boolean;
    readonly spacing?: FrameSpacing;
    readonly stacked?: boolean;
    readonly variant?: FrameVariant;
  };

  let {
    children,
    class: className,
    dense = false,
    ref = $bindable(null),
    spacing = "default",
    stacked = false,
    variant = "default",
    ...restProps
  }: FrameProps = $props();
</script>

<div
  bind:this={ref}
  class={cn(frameVariants({ dense, spacing, stacked, variant }), className)}
  data-slot="frame"
  data-spacing={spacing}
  {...restProps}
>
  {@render children?.()}
</div>
