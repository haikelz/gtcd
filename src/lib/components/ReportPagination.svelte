<script lang="ts">
  import { resolve } from "$app/paths";
  import { Button } from "$lib/components/ui/button";
  import { t } from "$lib/display";
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
    aria-label={t("shell.reportPagination")}
  >
    {#if previousHref}
      <Button variant="outline" href={resolve(previousHref as "/dashboard")}
        >{t("shell.previous")}</Button
      >
    {:else}
      <span></span>
    {/if}
    {#if nextHref}
      <Button variant="outline" href={resolve(nextHref as "/dashboard")}
        >{t("shell.next")}</Button
      >
    {/if}
  </nav>
{/if}
