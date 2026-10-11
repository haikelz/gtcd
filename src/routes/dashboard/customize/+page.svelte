<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- view links are resolve("/dashboard") plus saved query parameters; returnTo is validated server-side. */
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import { showToast } from "$lib/components/toast.js";
  import { Alert, AlertTitle } from "$lib/components/ui/alert";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import {
    Frame,
    FrameDescription,
    FrameFooter,
    FrameHeader,
    FramePanel,
    FrameTitle,
  } from "$lib/components/ui/frame";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Switch } from "$lib/components/ui/switch";
  import {
    describeViewQuery,
    WIDGET_LABELS,
    type WidgetSetting,
  } from "$lib/dashboard-layout";
  import {
    ArrowDown,
    ArrowUp,
    Bookmark,
    CircleAlert,
    RotateCcw,
    Save,
    Star,
    Trash2,
  } from "@lucide/svelte";
  import type { SubmitFunction } from "@sveltejs/kit";
  import { SvelteURLSearchParams } from "svelte/reactivity";

  let { data, form } = $props();

  const layout = $derived(data.dashboardLayout);
  const siteParam = $derived(page.url.searchParams.get("site") ?? "");

  let widgets = $derived<WidgetSetting[]>(
    layout.widgets.map((widget) => ({ ...widget }))
  );

  // Toast the action's result, then refresh the layout from the server.
  const notifyAndUpdate: SubmitFunction = () => {
    return async ({ result, update }) => {
      await update({ reset: false });
      if (
        result.type === "success" &&
        typeof result.data?.message === "string"
      ) {
        showToast(result.data.message, "success");
      }
    };
  };

  function viewHref(query: string): string {
    const params = new SvelteURLSearchParams(query);
    if (siteParam) params.set("site", siteParam);
    const search = params.toString();
    return `${resolve("/dashboard")}${search ? `?${search}` : ""}`;
  }

  function move(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= widgets.length) return;

    const next = [...widgets];
    [next[index], next[target]] = [next[target], next[index]];
    widgets = next;
  }

  function setVisible(index: number, visible: boolean) {
    widgets = widgets.map((widget, i) =>
      i === index ? { ...widget, hidden: !visible } : widget
    );
  }
</script>

<SEO
  description="Save report views and arrange the overview."
  noindex
  title="Customize dashboard — gtcd"
/>

<PageHeader
  description="Save the report views you come back to and choose what the overview shows. These settings belong to your account."
  title="Customize dashboard"
/>

{#if form?.message && page.status >= 400}
  <Alert class="mb-4" variant="destructive">
    <CircleAlert />
    <AlertTitle class="line-clamp-none">{form.message}</AlertTitle>
  </Alert>
{/if}

<div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
  <div class="space-y-4">
    {#if data.saveQuery !== null}
      <Frame>
        <FrameHeader>
          <FrameTitle id="save-view-heading">Save this view</FrameTitle>
          <FrameDescription>
            Keep the current period, filter and grouping under a name.
          </FrameDescription>
        </FrameHeader>
        <form action="?/saveView" method="POST" use:enhance={notifyAndUpdate}>
          <FramePanel aria-labelledby="save-view-heading" class="grid gap-5">
            <input name="query" type="hidden" value={data.saveQuery} />
            <input name="returnTo" type="hidden" value={data.returnTo ?? ""} />
            <input name="site" type="hidden" value={siteParam} />
            <div class="flex flex-wrap gap-1.5">
              {#each describeViewQuery(data.saveQuery) as part (part)}
                <Badge variant="secondary">{part}</Badge>
              {/each}
            </div>
            <div class="grid gap-2">
              <Label for="view-name">Name</Label>
              <Input
                autocomplete="off"
                id="view-name"
                maxlength={40}
                name="name"
                placeholder="Last month, blog only"
                required
              />
            </div>
            <Label
              class="cursor-pointer items-start gap-3 leading-normal font-normal"
              for="view-default"
            >
              <Checkbox class="mt-0.5" id="view-default" name="makeDefault" />
              <span class="grid gap-0.5">
                <span class="text-sm font-medium">Use as default view</span>
                <span class="text-xs text-muted-foreground">
                  Reports open with this period and filter.
                </span>
              </span>
            </Label>
          </FramePanel>
          <FrameFooter class="flex-row justify-end gap-2">
            {#if data.returnTo}
              <Button href={data.returnTo} variant="ghost">Cancel</Button>
            {/if}
            <Button type="submit">
              <Save />
              Save view
            </Button>
          </FrameFooter>
        </form>
      </Frame>
    {/if}
    <Frame>
      <FrameHeader>
        <FrameTitle id="views-heading">Saved views</FrameTitle>
        <FrameDescription>
          Open a view from the Views menu in any report toolbar.
        </FrameDescription>
      </FrameHeader>
      <FramePanel
        aria-labelledby="views-heading"
        class={layout.views.length ? "p-0" : undefined}
      >
        {#if layout.views.length}
          <ul class="divide-y divide-border">
            {#each layout.views as view (view.name)}
              {@const isDefault = layout.defaultView === view.name}
              <li class="flex flex-wrap items-center gap-3 px-4 py-3">
                <div class="grid min-w-0 flex-1 gap-1">
                  <div class="flex items-center gap-2">
                    <a
                      class="truncate text-sm font-medium underline-offset-4 hover:underline"
                      href={viewHref(view.query)}>{view.name}</a
                    >
                    {#if isDefault}
                      <Badge size="sm" variant="primary-light">Default</Badge>
                    {/if}
                  </div>
                  <p class="truncate text-xs text-muted-foreground">
                    {describeViewQuery(view.query).join(" · ")}
                  </p>
                </div>
                <div class="flex items-center gap-1">
                  <form
                    action="?/setDefaultView"
                    method="POST"
                    use:enhance={notifyAndUpdate}
                  >
                    <input
                      name="name"
                      type="hidden"
                      value={isDefault ? "" : view.name}
                    />
                    <Button
                      aria-label={isDefault
                        ? `Stop using ${view.name} as default`
                        : `Use ${view.name} as default`}
                      size="icon-sm"
                      title={isDefault ? "Remove default" : "Make default"}
                      type="submit"
                      variant="ghost"
                    >
                      <Star class={isDefault ? "fill-current" : undefined} />
                    </Button>
                  </form>
                  <form
                    action="?/deleteView"
                    method="POST"
                    use:enhance={notifyAndUpdate}
                  >
                    <input name="name" type="hidden" value={view.name} />
                    <Button
                      aria-label="Delete {view.name}"
                      size="icon-sm"
                      title="Delete view"
                      type="submit"
                      variant="ghost"
                    >
                      <Trash2 />
                    </Button>
                  </form>
                </div>
              </li>
            {/each}
          </ul>
        {:else}
          <EmptyState
            desc="Set up a report the way you like it, then choose Views → Save current view in the toolbar."
            icon={Bookmark}
            title="No saved views yet"
          />
        {/if}
      </FramePanel>
    </Frame>
  </div>
  <Frame>
    <FrameHeader>
      <FrameTitle id="widgets-heading">Overview widgets</FrameTitle>
      <FrameDescription>
        Choose which widgets the overview shows and in what order. Hidden
        widgets also skip their GoatCounter requests.
      </FrameDescription>
    </FrameHeader>
    <form action="?/saveWidgets" method="POST" use:enhance={notifyAndUpdate}>
      <FramePanel aria-labelledby="widgets-heading" class="p-0">
        <ol class="divide-y divide-border">
          {#each widgets as widget, index (widget.id)}
            <li class="flex items-center gap-3 px-4 py-2.5">
              <input name="widget" type="hidden" value={widget.id} />
              {#if widget.hidden}
                <input name="hidden" type="hidden" value={widget.id} />
              {/if}
              <span
                class="w-5 text-right text-xs text-muted-foreground tabular-nums"
                >{index + 1}</span
              >
              <Label
                class="min-w-0 flex-1 cursor-pointer gap-3 font-normal"
                for="widget-{widget.id}"
              >
                <Switch
                  checked={!widget.hidden}
                  id="widget-{widget.id}"
                  onCheckedChange={(checked) => setVisible(index, checked)}
                />
                <span
                  class={widget.hidden
                    ? "truncate text-sm text-muted-foreground"
                    : "truncate text-sm"}
                >
                  {WIDGET_LABELS[widget.id]}
                </span>
              </Label>
              <div class="flex items-center gap-0.5">
                <Button
                  aria-label="Move {WIDGET_LABELS[widget.id]} up"
                  disabled={index === 0}
                  onclick={() => move(index, -1)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <ArrowUp />
                </Button>
                <Button
                  aria-label="Move {WIDGET_LABELS[widget.id]} down"
                  disabled={index === widgets.length - 1}
                  onclick={() => move(index, 1)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <ArrowDown />
                </Button>
              </div>
            </li>
          {/each}
        </ol>
      </FramePanel>
      <FrameFooter class="flex-row justify-end gap-2">
        <Button name="reset" type="submit" value="on" variant="ghost">
          <RotateCcw />
          Reset
        </Button>
        <Button type="submit">
          <Save />
          Save layout
        </Button>
      </FrameFooter>
    </form>
  </Frame>
</div>
