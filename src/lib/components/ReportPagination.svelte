<script lang="ts">
  import { resolve } from "$app/paths";
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
    class="flex items-center justify-between gap-3 border-t border-border mt-5 pt-5"
    aria-label="Report pagination"
  >
    {#if previousHref}
      <a class="btn btn-outline" href={resolve(previousHref as "/dashboard")}
        >Previous</a
      >
    {:else}
      <span></span>
    {/if}
    {#if nextHref}
      <a class="btn btn-outline" href={resolve(nextHref as "/dashboard")}
        >Next</a
      >
    {/if}
  </nav>
{/if}
