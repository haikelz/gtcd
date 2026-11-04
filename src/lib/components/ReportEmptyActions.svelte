<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { Button } from "$lib/components/ui/button";
  import { dashboardHref, t } from "$lib/display";

  type ReportEmptyActionsProps = {
    /** False when the path filter does not narrow this report. */
    readonly filterable?: boolean;
  };

  let { filterable = true }: ReportEmptyActionsProps = $props();

  // Next steps for an empty report: drop the filter, else widen the period;
  // admins of a site without hits also get the tracking setup.
  const PAGING_PARAMS = ["cursor", "exclude", "offset"];

  const params = $derived(page.url.searchParams);
  const filtered = $derived(filterable && params.has("filter"));
  const showsLastYear = $derived(
    params.get("range") === "year" && !params.has("start")
  );
  const widerHref = $derived.by(() => {
    const url = new URL(page.url);

    for (const key of PAGING_PARAMS) url.searchParams.delete(key);
    if (filtered) {
      url.searchParams.delete("filter");
    } else {
      url.searchParams.delete("end");
      url.searchParams.delete("start");
      url.searchParams.set("range", "year");
    }

    return `${url.pathname}${url.search}`;
  });
  const needsTracking = $derived(
    page.data.isAdmin === true && page.data.site?.receivedData === false
  );
</script>

{#if filtered || !showsLastYear}
  <Button href={widerHref} size="sm" variant="outline">
    {filtered ? t("shell.clearFilter") : t("reports.showLastYear")}
  </Button>
{/if}
{#if needsTracking}
  <Button
    href={dashboardHref(resolve("/dashboard/settings"))}
    size="sm"
    variant="outline"
  >
    {t("reports.setUpTracking")}
  </Button>
{/if}
