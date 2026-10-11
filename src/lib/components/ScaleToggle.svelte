<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import {
    ToggleGroup,
    ToggleGroupItem,
  } from "$lib/components/ui/toggle-group";
  import { SvelteURLSearchParams } from "svelte/reactivity";

  // Mirrors GoatCounter's chart scaling: every row on one shared maximum, or
  // each row scaled to its own peak (gtcd's default).
  const value = $derived(
    page.url.searchParams.get("scale") === "shared" ? "shared" : "row"
  );

  function selectScale(next: string) {
    if (next !== "shared" && next !== "row") return;

    const params = new SvelteURLSearchParams(page.url.searchParams);
    if (next === "shared") params.set("scale", "shared");
    else params.delete("scale");

    const query = params.toString();
    // eslint-disable-next-line svelte/no-navigation-without-resolve -- same route with updated query; the path comes from the current URL.
    goto(query ? `${page.url.pathname}?${query}` : page.url.pathname, {
      keepFocus: true,
      noScroll: true,
      replaceState: true,
    });
  }
</script>

<ToggleGroup
  aria-label="Chart scale"
  onValueChange={selectScale}
  size="sm"
  spacing={0}
  type="single"
  {value}
  variant="outline"
>
  <ToggleGroupItem
    aria-label="Scale each page to its own peak"
    title="Scale each page to its own peak"
    value="row">Per page</ToggleGroupItem
  >
  <ToggleGroupItem
    aria-label="Scale all pages to the same maximum"
    title="Scale all pages to the same maximum"
    value="shared">Shared</ToggleGroupItem
  >
</ToggleGroup>
