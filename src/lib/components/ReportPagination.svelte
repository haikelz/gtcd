<script lang="ts">
  import { resolve } from "$app/paths";
  import { Button } from "$lib/components/ui/button";
  let {
    previousHref,
    nextHref,
  }: {
    previousHref?: string;
    nextHref?: string;
  } = $props();
</script>

{#if previousHref || nextHref}
  <nav
    class="mt-5 flex items-center justify-between gap-3 border-t border-border pt-5"
    aria-label="Report pagination"
  >
    {#if previousHref}
      <Button variant="outline" href={resolve(previousHref as "/dashboard")}
        >Previous</Button
      >
    {:else}
      <span></span>
    {/if}
    {#if nextHref}
      <Button variant="outline" href={resolve(nextHref as "/dashboard")}
        >Next</Button
      >
    {/if}
  </nav>
{/if}
