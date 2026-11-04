<script lang="ts">
  import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
  } from "$lib/components/ui/empty";
  import type { ChartNoAxesCombined } from "@lucide/svelte";
  import type { Snippet } from "svelte";

  type EmptyStateProps = {
    /** The next step, usually one or two small buttons. */
    readonly actions?: Snippet;
    readonly class?: string;
    readonly desc?: string;
    readonly icon?: typeof ChartNoAxesCombined;
    readonly title: string;
  };

  let {
    actions,
    class: className,
    desc,
    icon: Icon,
    title,
  }: EmptyStateProps = $props();
</script>

<Empty class={className}>
  <EmptyHeader>
    {#if Icon}
      <EmptyMedia aria-hidden="true" variant="icon">
        <Icon />
      </EmptyMedia>
    {/if}
    <EmptyTitle>{title}</EmptyTitle>
    {#if desc}
      <EmptyDescription>{desc}</EmptyDescription>
    {/if}
  </EmptyHeader>
  {#if actions}
    <EmptyContent>
      <div class="flex flex-wrap justify-center gap-2">{@render actions()}</div>
    </EmptyContent>
  {/if}
</Empty>
