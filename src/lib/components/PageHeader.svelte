<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  type PageHeaderProps = {
    readonly actions?: Snippet;
    /** Rendered above the title, e.g. a back link on detail pages. */
    readonly eyebrow?: Snippet;
    readonly description?: string;
    readonly title: string;
    readonly titleClass?: string;
  };

  let { actions, description, eyebrow, title, titleClass }: PageHeaderProps =
    $props();
</script>

<header class="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
  <div class="min-w-0 max-w-prose">
    {#if eyebrow}
      <div class="mb-2">{@render eyebrow()}</div>
    {/if}
    <h1
      class={cn(
        "text-2xl font-semibold tracking-tight break-words text-foreground",
        titleClass
      )}
    >
      {title}
    </h1>
    {#if description}
      <p class="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    {/if}
  </div>
  {#if actions}
    <div class="flex flex-wrap items-center gap-2">{@render actions()}</div>
  {/if}
</header>
