<script lang="ts" module>
  import { getContext, setContext } from "svelte";
  import { type VariantProps, tv } from "tailwind-variants";

  // Port of shadcn base-nova Toggle variants, shared by ToggleGroupItem.
  // Deviation (DESIGN.md): focus is the global ring outline in app.css; in
  // joined groups (spacing 0) the item paints a background gap so the ring
  // never sits against a neighbour's ink fill.
  export const toggleVariants = tv({
    base: "group/toggle inline-flex items-center justify-center gap-1 rounded-full text-sm font-medium whitespace-nowrap transition-all hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-pressed:bg-ink aria-pressed:text-ink-foreground aria-pressed:hover:bg-ink-hover data-[state=on]:bg-ink data-[state=on]:text-ink-foreground data-[state=on]:hover:bg-ink-hover dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent hover:bg-muted",
      },
      size: {
        default:
          "h-8 min-w-8 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        sm: "h-7 min-w-7 rounded-full px-3 text-[0.8rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 min-w-9 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  });

  export type ToggleVariant = VariantProps<typeof toggleVariants>["variant"];
  export type ToggleSize = VariantProps<typeof toggleVariants>["size"];

  type ToggleGroupContext = {
    readonly size: ToggleSize;
    readonly spacing: number;
    readonly variant: ToggleVariant;
  };

  const CONTEXT_KEY = Symbol("toggle-group");

  export function getToggleGroupContext(): ToggleGroupContext | undefined {
    return getContext<ToggleGroupContext | undefined>(CONTEXT_KEY);
  }

  function setToggleGroupContext(context: ToggleGroupContext) {
    setContext(CONTEXT_KEY, context);
  }
</script>

<script lang="ts">
  import { cn } from "$lib/utils.js";
  import { ToggleGroup as ToggleGroupPrimitive } from "bits-ui";

  type ToggleGroupProps = ToggleGroupPrimitive.RootProps & {
    readonly size?: ToggleSize;
    readonly spacing?: number;
    readonly variant?: ToggleVariant;
  };

  let {
    class: className,
    orientation = "horizontal",
    ref = $bindable(null),
    size = "default",
    spacing = 2,
    variant = "default",
    ...restProps
  }: ToggleGroupProps = $props();

  setToggleGroupContext({
    get size() {
      return size;
    },
    get spacing() {
      return spacing;
    },
    get variant() {
      return variant;
    },
  });
</script>

<ToggleGroupPrimitive.Root
  bind:ref
  class={cn(
    "group/toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))] rounded-full data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
    className
  )}
  data-size={size}
  data-slot="toggle-group"
  data-spacing={spacing}
  data-variant={variant}
  {orientation}
  style="--gap: {spacing}"
  {...restProps}
/>
