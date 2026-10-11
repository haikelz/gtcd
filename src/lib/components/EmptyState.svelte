<script lang="ts">
  import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
  } from "$lib/components/ui/empty";
  import type { ChartNoAxesCombined } from "@lucide/svelte";

  type EmptyStateProps = {
    readonly class?: string;
    readonly desc?: string;
    readonly icon?: typeof ChartNoAxesCombined;
    readonly title: string;
  };

  let { class: className, desc, icon: Icon, title }: EmptyStateProps = $props();
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
</Empty>
