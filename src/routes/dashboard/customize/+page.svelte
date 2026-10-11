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
  import { t } from "$lib/display";
  import { formatDate } from "$lib/preferences";
  import { REPORT_FREQUENCIES } from "$lib/report-period";
  import {
    NativeSelect,
    NativeSelectOption,
  } from "$lib/components/ui/native-select";
  import { Switch } from "$lib/components/ui/switch";
  import {
    describeViewQuery,
    WIDGET_LABEL_KEYS,
    WIDGET_OPTION_SPECS,
    type WidgetSetting,
  } from "$lib/dashboard-layout";
  import {
    ArrowDown,
    ArrowUp,
    Mail,
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
  const preferences = $derived(data.preferences);
  const fewerNumbersChoice = $derived(
    layout.overrides.fewerNumbers === null
      ? "follow"
      : layout.overrides.fewerNumbers
        ? "on"
        : "off"
  );

  const STYLE_LABELS = $derived({
    bar: t("customize.styleBar"),
    line: t("customize.styleLine"),
    text: t("customize.styleText"),
  });

  const FREQUENCY_LABELS = $derived({
    biweekly: t("customize.frequencyBiweekly"),
    daily: t("customize.frequencyDaily"),
    monthly: t("customize.frequencyMonthly"),
    never: t("customize.frequencyNever"),
    weekly: t("customize.frequencyWeekly"),
  });

  function describeView(query: string): string[] {
    return describeViewQuery(query).map((part) => t(part.key, part.params));
  }

  const reports = $derived(data.emailReports);
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
  description={t("customize.seoDescription")}
  noindex
  title={t("customize.seoTitle")}
/>

<PageHeader
  description={t("customize.description")}
  title={t("customize.title")}
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
          <FrameTitle id="save-view-heading"
            >{t("customize.saveViewTitle")}</FrameTitle
          >
          <FrameDescription>
            {t("customize.saveViewDescription")}
          </FrameDescription>
        </FrameHeader>
        <form action="?/saveView" method="POST" use:enhance={notifyAndUpdate}>
          <FramePanel aria-labelledby="save-view-heading" class="grid gap-5">
            <input name="query" type="hidden" value={data.saveQuery} />
            <input name="returnTo" type="hidden" value={data.returnTo ?? ""} />
            <input name="site" type="hidden" value={siteParam} />
            <div class="flex flex-wrap gap-1.5">
              {#each describeView(data.saveQuery) as part (part)}
                <Badge variant="secondary">{part}</Badge>
              {/each}
            </div>
            <div class="grid gap-2">
              <Label for="view-name">{t("customize.viewName")}</Label>
              <Input
                autocomplete="off"
                id="view-name"
                maxlength={40}
                name="name"
                placeholder={t("customize.viewNamePlaceholder")}
                required
              />
            </div>
            <Label
              class="cursor-pointer items-start gap-3 leading-normal font-normal"
              for="view-default"
            >
              <Checkbox class="mt-0.5" id="view-default" name="makeDefault" />
              <span class="grid gap-0.5">
                <span class="text-sm font-medium"
                  >{t("customize.useDefault")}</span
                >
                <span class="text-xs text-muted-foreground">
                  {t("customize.useDefaultHelp")}
                </span>
              </span>
            </Label>
          </FramePanel>
          <FrameFooter class="flex-row justify-end gap-2">
            {#if data.returnTo}
              <Button href={data.returnTo} variant="ghost"
                >{t("customize.cancel")}</Button
              >
            {/if}
            <Button type="submit">
              <Save />
              {t("customize.saveView")}
            </Button>
          </FrameFooter>
        </form>
      </Frame>
    {/if}
    <Frame>
      <FrameHeader>
        <FrameTitle id="views-heading">{t("customize.savedViews")}</FrameTitle>
        <FrameDescription>
          {t("customize.savedViewsDescription")}
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
                      <Badge size="sm" variant="primary-light"
                        >{t("customize.defaultBadge")}</Badge
                      >
                    {/if}
                  </div>
                  <p class="truncate text-xs text-muted-foreground">
                    {describeView(view.query).join(" · ")}
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
                        ? t("customize.stopDefaultNamed", { name: view.name })
                        : t("customize.useDefaultNamed", { name: view.name })}
                      size="icon-sm"
                      title={isDefault
                        ? t("customize.removeDefault")
                        : t("customize.makeDefault")}
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
                      aria-label={t("customize.deleteViewNamed", {
                        name: view.name,
                      })}
                      size="icon-sm"
                      title={t("customize.deleteView")}
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
            desc={t("customize.noViewsDescription")}
            icon={Bookmark}
            title={t("customize.noViews")}
          />
        {/if}
      </FramePanel>
    </Frame>
    <Frame>
      <FrameHeader>
        <FrameTitle id="display-heading">{t("customize.display")}</FrameTitle>
        <FrameDescription>
          {t("customize.displayDescription")}
        </FrameDescription>
      </FrameHeader>
      <form action="?/saveDisplay" method="POST" use:enhance={notifyAndUpdate}>
        <FramePanel aria-labelledby="display-heading" class="grid gap-5">
          <div class="grid gap-2">
            <Label for="display-fewer-numbers"
              >{t("customize.fewerNumbers")}</Label
            >
            <NativeSelect
              aria-describedby="display-fewer-numbers-help"
              class="w-full sm:w-72"
              disabled={preferences?.fewerNumbersLocked}
              id="display-fewer-numbers"
              name="fewerNumbers"
              value={fewerNumbersChoice}
            >
              <NativeSelectOption value="follow"
                >{t("customize.followGoatCounter")}</NativeSelectOption
              >
              <NativeSelectOption value="on"
                >{t("customize.fewerNumbersOn")}</NativeSelectOption
              >
              <NativeSelectOption value="off"
                >{t("customize.fewerNumbersOff")}</NativeSelectOption
              >
            </NativeSelect>
            <p
              class="text-xs text-muted-foreground"
              id="display-fewer-numbers-help"
            >
              {#if preferences?.fewerNumbersLocked}
                {t("customize.fewerNumbersLocked")}
              {:else}
                {t("customize.fewerNumbersHelp")}
              {/if}
            </p>
          </div>
          <div class="grid gap-2">
            <Label for="display-locale">{t("customize.language")}</Label>
            <NativeSelect
              class="w-full sm:w-72"
              id="display-locale"
              name="locale"
              value={layout.overrides.locale ?? "follow"}
            >
              <NativeSelectOption value="follow"
                >{t("customize.followGoatCounter")}</NativeSelectOption
              >
              <NativeSelectOption value="en">English</NativeSelectOption>
              <NativeSelectOption value="id"
                >Bahasa Indonesia</NativeSelectOption
              >
            </NativeSelect>
          </div>
        </FramePanel>
        <FrameFooter class="flex-row justify-end gap-2">
          <Button type="submit">
            <Save />
            {t("customize.saveDisplay")}
          </Button>
        </FrameFooter>
      </form>
    </Frame>
    <Frame>
      <FrameHeader>
        <FrameTitle id="email-reports-heading"
          >{t("customize.emailReports")}</FrameTitle
        >
        <FrameDescription>
          {t("customize.emailReportsDescription", {
            email: reports.recipient,
          })}
        </FrameDescription>
      </FrameHeader>
      {#if reports.configured}
        <form
          action="?/saveEmailReport"
          method="POST"
          use:enhance={notifyAndUpdate}
        >
          <FramePanel
            aria-labelledby="email-reports-heading"
            class="grid gap-5"
          >
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="grid gap-2">
                <Label for="report-frequency">{t("customize.frequency")}</Label>
                <NativeSelect
                  class="w-full"
                  id="report-frequency"
                  name="frequency"
                  value={reports.subscription.frequency}
                >
                  {#each REPORT_FREQUENCIES as frequency (frequency)}
                    <NativeSelectOption value={frequency}
                      >{FREQUENCY_LABELS[frequency]}</NativeSelectOption
                    >
                  {/each}
                </NativeSelect>
              </div>
              <div class="grid gap-2">
                <Label for="report-site">{t("customize.emailSite")}</Label>
                <NativeSelect
                  class="w-full"
                  id="report-site"
                  name="siteId"
                  value={String(reports.subscription.siteId ?? data.site.id)}
                >
                  {#each data.sites as site (site.id)}
                    <NativeSelectOption value={String(site.id)}
                      >{site.cname || site.code}</NativeSelectOption
                    >
                  {/each}
                </NativeSelect>
              </div>
            </div>
            <p class="text-xs text-muted-foreground">
              {t("customize.emailScheduleHelp")}
              {#if reports.subscription.lastSentAt}
                {t("customize.lastSent", {
                  date: formatDate(
                    new Date(reports.subscription.lastSentAt),
                    data.preferences.dateFormat,
                    "full",
                    data.preferences.locale
                  ),
                })}
              {/if}
            </p>
            {#if reports.subscription.lastError}
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle class="line-clamp-none"
                  >{t("customize.emailFailed", {
                    error: reports.subscription.lastError,
                  })}</AlertTitle
                >
              </Alert>
            {/if}
          </FramePanel>
          <FrameFooter class="flex-row flex-wrap justify-end gap-2">
            <Button
              formaction="?/sendTestEmail"
              type="submit"
              variant="outline"
            >
              <Mail />
              {t("customize.sendTestEmail")}
            </Button>
            <Button type="submit">
              <Save />
              {t("customize.saveSchedule")}
            </Button>
          </FrameFooter>
        </form>
      {:else}
        <FramePanel aria-labelledby="email-reports-heading">
          <p class="text-sm text-muted-foreground">
            {t("customize.emailNotConfiguredHelpBefore")}
            <code class="font-mono text-xs">SMTP_HOST</code>
            {t("customize.emailNotConfiguredHelpJoin")}
            <code class="font-mono text-xs">SMTP_FROM</code>{t(
              "customize.emailNotConfiguredHelpAfter"
            )}
          </p>
        </FramePanel>
      {/if}
    </Frame>
  </div>
  <Frame>
    <FrameHeader>
      <FrameTitle id="widgets-heading">{t("customize.widgets")}</FrameTitle>
      <FrameDescription>
        {t("customize.widgetsDescription")}
      </FrameDescription>
    </FrameHeader>
    <form action="?/saveWidgets" method="POST" use:enhance={notifyAndUpdate}>
      <FramePanel aria-labelledby="widgets-heading" class="p-0">
        <ol class="divide-y divide-border">
          {#each widgets as widget, index (widget.id)}
            {@const spec = WIDGET_OPTION_SPECS[widget.id]}
            <li class="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
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
                  {t(WIDGET_LABEL_KEYS[widget.id])}
                </span>
              </Label>
              <div class="flex items-center gap-0.5">
                <Button
                  aria-label={t("customize.moveUp", {
                    widget: t(WIDGET_LABEL_KEYS[widget.id]),
                  })}
                  disabled={index === 0}
                  onclick={() => move(index, -1)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <ArrowUp />
                </Button>
                <Button
                  aria-label={t("customize.moveDown", {
                    widget: t(WIDGET_LABEL_KEYS[widget.id]),
                  })}
                  disabled={index === widgets.length - 1}
                  onclick={() => move(index, 1)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <ArrowDown />
                </Button>
              </div>
              {#if widget.hidden}
                <!-- Keep options of hidden widgets when the layout is saved. -->
                {#if widget.options.limit}
                  <input
                    name="limit:{widget.id}"
                    type="hidden"
                    value={widget.options.limit}
                  />
                {/if}
                {#if widget.options.style}
                  <input
                    name="style:{widget.id}"
                    type="hidden"
                    value={widget.options.style}
                  />
                {/if}
              {/if}
              {#if !widget.hidden && (spec.limit || spec.styles)}
                <div class="flex w-full flex-wrap items-center gap-3 pl-8">
                  {#if spec.limit}
                    <Label
                      class="gap-2 text-xs font-normal text-muted-foreground"
                      for="limit-{widget.id}"
                    >
                      {t("customize.rows")}
                      <Input
                        class="h-7 w-20"
                        id="limit-{widget.id}"
                        max={spec.limit.max}
                        min={spec.limit.min}
                        name="limit:{widget.id}"
                        type="number"
                        value={widget.options.limit ?? spec.limit.default}
                      />
                    </Label>
                  {/if}
                  {#if spec.styles}
                    <Label
                      class="gap-2 text-xs font-normal text-muted-foreground"
                      for="style-{widget.id}"
                    >
                      {t("customize.chart")}
                      <NativeSelect
                        id="style-{widget.id}"
                        name="style:{widget.id}"
                        size="sm"
                        value={widget.options.style ?? spec.styles[0]}
                      >
                        {#each spec.styles as style (style)}
                          <NativeSelectOption value={style}
                            >{STYLE_LABELS[style]}</NativeSelectOption
                          >
                        {/each}
                      </NativeSelect>
                    </Label>
                  {/if}
                </div>
              {/if}
            </li>
          {/each}
        </ol>
      </FramePanel>
      <FrameFooter class="flex-row justify-end gap-2">
        <Button name="reset" type="submit" value="on" variant="ghost">
          <RotateCcw />
          {t("customize.reset")}
        </Button>
        <Button type="submit">
          <Save />
          {t("customize.saveLayout")}
        </Button>
      </FrameFooter>
    </form>
  </Frame>
</div>
