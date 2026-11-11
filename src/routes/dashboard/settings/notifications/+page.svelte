<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import ErrorAlert from "$lib/components/ErrorAlert.svelte";
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
  import {
    NativeSelect,
    NativeSelectOption,
  } from "$lib/components/ui/native-select";
  import { dashboardHref, displayPreferences, t } from "$lib/display";
  import type { MessageKey } from "$lib/i18n";
  import { formatDate, wallClockNow } from "$lib/preferences";
  import {
    ArrowLeft,
    BellRing,
    CircleAlert,
    Plus,
    Send,
    Trash2,
  } from "@lucide/svelte";
  import type { SubmitFunction } from "@sveltejs/kit";

  let { data, form } = $props();

  const TYPES = ["slack", "discord", "telegram", "webhook"] as const;
  const TYPE_LABELS = {
    discord: "notifications.typeDiscord",
    slack: "notifications.typeSlack",
    telegram: "notifications.typeTelegram",
    webhook: "notifications.typeWebhook",
  } as const satisfies Record<(typeof TYPES)[number], MessageKey>;
  const URL_HELP = {
    discord: "notifications.urlHelpDiscord",
    slack: "notifications.urlHelpSlack",
    webhook: "notifications.urlHelpWebhook",
  } as const satisfies Record<string, MessageKey>;
  const SUMMARY_FREQUENCIES = [
    "daily",
    "weekly",
    "biweekly",
    "monthly",
  ] as const;
  const SUMMARY_LABELS = {
    biweekly: "email.reportBiweekly",
    daily: "email.reportDaily",
    monthly: "email.reportMonthly",
    weekly: "email.reportWeekly",
  } as const satisfies Record<(typeof SUMMARY_FREQUENCIES)[number], MessageKey>;
  const ALERT_LABELS = {
    decrease: "notifications.alertDecrease",
    either: "notifications.alertEither",
    increase: "notifications.alertIncrease",
  } as const satisfies Record<string, MessageKey>;
  const MAX_CHANNELS = 10;

  let type = $state<(typeof TYPES)[number]>("slack");
  let alerts = $state(true);
  let summaries = $state(false);
  let pending = $state(false);
  // Remounting the add form restores its defaults; a native form reset
  // would blank the number inputs and leave the checkboxes as they were.
  let addFormVersion = $state(0);

  const preferences = $derived(displayPreferences());
  const siteName = $derived(data.site.cname || data.site.code);
  const full = $derived(data.channels.length >= MAX_CHANNELS);
  const failed = $derived(page.status >= 400 ? form : null);
  const addError = $derived(failed?.action === "add" ? failed.message : null);
  const rowError = $derived(
    failed?.action && failed.action !== "add" ? failed.message : null
  );

  function dateOf(iso: string): string {
    return formatDate(
      wallClockNow(preferences.timezone, new Date(iso)),
      preferences.dateFormat,
      "full",
      preferences.locale
    );
  }

  // Toast successes; failures land in `form` and render inline.
  const notify: SubmitFunction = () => {
    pending = true;
    return async ({ result, update }) => {
      try {
        await update({ reset: false });
        if (result.type !== "success") return;
        if (result.data?.action === "add") {
          type = "slack";
          alerts = true;
          summaries = false;
          addFormVersion++;
        }
        if (typeof result.data?.message === "string") {
          showToast(result.data.message, "success");
        }
      } finally {
        pending = false;
      }
    };
  };
</script>

<SEO
  description={t("notifications.description")}
  noindex
  title={t("notifications.title")}
/>

<PageHeader
  description={t("notifications.description")}
  title={t("notifications.title")}
>
  {#snippet eyebrow()}
    <a
      class="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      href={dashboardHref(resolve("/dashboard/settings"))}
    >
      <ArrowLeft aria-hidden="true" class="size-4" />
      {t("notifications.back")}
    </a>
  {/snippet}
</PageHeader>

{#if data.unavailable}
  <ErrorAlert
    class="mb-4"
    message={t("notifications.unavailable")}
    title={t("notifications.unavailableTitle")}
  />
{/if}
{#if rowError}
  <Alert class="mb-4" variant="destructive">
    <CircleAlert />
    <AlertTitle class="line-clamp-none">{rowError}</AlertTitle>
  </Alert>
{/if}

<div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
  <Frame>
    <FrameHeader>
      <FrameTitle id="channels-heading"
        >{t("notifications.listTitle")}</FrameTitle
      >
      <FrameDescription>
        {t("notifications.listDescription", { site: siteName })}
      </FrameDescription>
    </FrameHeader>
    <FramePanel
      aria-labelledby="channels-heading"
      class={data.channels.length ? "p-0" : undefined}
      role="region"
    >
      {#if data.channels.length}
        <ul class="divide-y divide-border">
          {#each data.channels as channel (channel.id)}
            <li class="grid min-w-0 gap-2 p-4">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-sm font-medium break-words">{channel.label}</h3>
                <Badge variant="outline">{t(TYPE_LABELS[channel.type])}</Badge>
              </div>
              <p class="font-mono text-xs break-all text-muted-foreground">
                {channel.target}{channel.chatId ? ` · ${channel.chatId}` : ""}
              </p>
              <ul class="grid gap-0.5 text-xs text-muted-foreground">
                {#if channel.alert}
                  <li>
                    {t(ALERT_LABELS[channel.alert.direction], {
                      threshold: channel.alert.threshold,
                    })}
                  </li>
                {/if}
                {#if channel.summary}
                  <li>{t(SUMMARY_LABELS[channel.summary])}</li>
                {/if}
              </ul>
              {#if channel.lastFailureAt}
                <p class="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="destructive-light"
                    >{t("notifications.failedBadge")}</Badge
                  >
                  {t("notifications.lastFailed", {
                    date: dateOf(channel.lastFailureAt),
                  })}
                </p>
              {:else}
                <p class="text-xs text-muted-foreground">
                  {channel.lastSentAt
                    ? t("notifications.lastSent", {
                        date: dateOf(channel.lastSentAt),
                      })
                    : t("notifications.nothingSent")}
                </p>
              {/if}
              <div class="flex flex-wrap gap-2 pt-1">
                <form
                  action={dashboardHref("?/test")}
                  method="POST"
                  use:enhance={notify}
                >
                  <input name="id" type="hidden" value={channel.id} />
                  <Button
                    disabled={pending}
                    size="sm"
                    type="submit"
                    variant="outline"
                  >
                    <Send />
                    {t("notifications.sendTest")}
                    <span class="sr-only">({channel.label})</span>
                  </Button>
                </form>
                <form
                  action={dashboardHref("?/delete")}
                  method="POST"
                  use:enhance={notify}
                >
                  <input name="id" type="hidden" value={channel.id} />
                  <Button
                    disabled={pending}
                    size="sm"
                    type="submit"
                    variant="destructive"
                  >
                    <Trash2 />
                    {t("notifications.delete")}
                    <span class="sr-only">({channel.label})</span>
                  </Button>
                </form>
              </div>
            </li>
          {/each}
        </ul>
      {:else if !data.unavailable}
        <EmptyState
          desc={t("notifications.emptyDescription")}
          icon={BellRing}
          title={t("notifications.empty")}
        />
      {/if}
    </FramePanel>
  </Frame>

  <Frame>
    <FrameHeader>
      <FrameTitle id="add-channel-heading"
        >{t("notifications.addTitle")}</FrameTitle
      >
      <FrameDescription>{t("notifications.addDescription")}</FrameDescription>
    </FrameHeader>
    {#key addFormVersion}
      <form action={dashboardHref("?/add")} method="POST" use:enhance={notify}>
        <FramePanel
          aria-labelledby="add-channel-heading"
          class="grid gap-5"
          role="region"
        >
          {#if addError}
            <Alert variant="destructive">
              <CircleAlert />
              <AlertTitle class="line-clamp-none">{addError}</AlertTitle>
            </Alert>
          {/if}
          {#if full}
            <p class="text-sm text-muted-foreground">
              {t("notifications.limit")}
            </p>
          {/if}
          <fieldset
            class="grid gap-5"
            disabled={data.unavailable || full || pending}
          >
            <div class="grid items-start gap-4 sm:grid-cols-2">
              <div class="grid gap-2">
                <Label for="channel-type">{t("notifications.type")}</Label>
                <NativeSelect
                  bind:value={type}
                  class="w-full"
                  id="channel-type"
                  name="type"
                >
                  {#each TYPES as option (option)}
                    <NativeSelectOption value={option}
                      >{t(TYPE_LABELS[option])}</NativeSelectOption
                    >
                  {/each}
                </NativeSelect>
              </div>
              <div class="grid gap-2">
                <Label for="channel-label">{t("notifications.name")}</Label>
                <Input
                  aria-describedby="channel-label-help"
                  id="channel-label"
                  maxlength={80}
                  name="label"
                  required
                />
                <p
                  class="text-xs text-muted-foreground"
                  id="channel-label-help"
                >
                  {t("notifications.nameHelp")}
                </p>
              </div>
            </div>
            {#if type === "telegram"}
              <div class="grid items-start gap-4 sm:grid-cols-2">
                <div class="grid gap-2">
                  <Label for="channel-token"
                    >{t("notifications.botToken")}</Label
                  >
                  <Input
                    aria-describedby="telegram-help"
                    autocomplete="off"
                    id="channel-token"
                    name="botToken"
                    required
                    spellcheck={false}
                  />
                </div>
                <div class="grid gap-2">
                  <Label for="channel-chat">{t("notifications.chatId")}</Label>
                  <Input
                    aria-describedby="telegram-help"
                    autocomplete="off"
                    id="channel-chat"
                    name="chatId"
                    required
                    spellcheck={false}
                  />
                </div>
              </div>
              <p class="text-xs text-muted-foreground" id="telegram-help">
                {t("notifications.telegramHelp")}
              </p>
            {:else}
              <div class="grid gap-2">
                <Label for="channel-url">{t("notifications.url")}</Label>
                <Input
                  aria-describedby="channel-url-help"
                  autocomplete="off"
                  id="channel-url"
                  inputmode="url"
                  name="url"
                  placeholder="https://"
                  required
                  spellcheck={false}
                  type="url"
                />
                <p class="text-xs text-muted-foreground" id="channel-url-help">
                  {t(URL_HELP[type])}
                </p>
              </div>
            {/if}
            <fieldset class="grid gap-3">
              <legend class="mb-1 text-sm font-medium">
                {t("notifications.receives")}
              </legend>
              <Label class="leading-normal" for="channel-alerts">
                <Checkbox
                  bind:checked={alerts}
                  id="channel-alerts"
                  name="alerts"
                />
                {t("notifications.alerts")}
              </Label>
              {#if alerts}
                <div class="grid gap-4 sm:grid-cols-2 sm:items-end">
                  <div class="grid gap-2 sm:col-span-2">
                    <Label for="channel-direction"
                      >{t("customize.alertDirection")}</Label
                    >
                    <NativeSelect
                      class="w-full"
                      id="channel-direction"
                      name="direction"
                      value="either"
                    >
                      <NativeSelectOption value="either"
                        >{t("customize.alertEither")}</NativeSelectOption
                      >
                      <NativeSelectOption value="increase"
                        >{t("customize.alertIncrease")}</NativeSelectOption
                      >
                      <NativeSelectOption value="decrease"
                        >{t("customize.alertDecrease")}</NativeSelectOption
                      >
                    </NativeSelect>
                  </div>
                  <div class="grid gap-2">
                    <Label for="channel-threshold"
                      >{t("customize.alertThreshold")}</Label
                    >
                    <Input
                      id="channel-threshold"
                      max={10000}
                      min={1}
                      name="threshold"
                      required
                      step={1}
                      type="number"
                      value={50}
                    />
                  </div>
                  <div class="grid gap-2">
                    <Label for="channel-minimum"
                      >{t("customize.alertMinimum")}</Label
                    >
                    <Input
                      id="channel-minimum"
                      max={1000000000}
                      min={1}
                      name="minimum"
                      required
                      step={1}
                      type="number"
                      value={100}
                    />
                  </div>
                </div>
              {/if}
              <Label class="leading-normal" for="channel-summaries">
                <Checkbox
                  bind:checked={summaries}
                  id="channel-summaries"
                  name="summaries"
                />
                {t("notifications.summaries")}
              </Label>
              {#if summaries}
                <div class="grid gap-2 sm:max-w-60">
                  <Label for="channel-frequency"
                    >{t("customize.frequency")}</Label
                  >
                  <NativeSelect
                    class="w-full"
                    id="channel-frequency"
                    name="frequency"
                    value="weekly"
                  >
                    {#each SUMMARY_FREQUENCIES as frequency (frequency)}
                      <NativeSelectOption value={frequency}
                        >{t(SUMMARY_LABELS[frequency])}</NativeSelectOption
                      >
                    {/each}
                  </NativeSelect>
                </div>
              {/if}
              <p class="text-xs text-muted-foreground">
                {t("notifications.receivesHelp")}
              </p>
            </fieldset>
          </fieldset>
        </FramePanel>
        <FrameFooter class="flex-row justify-end gap-2">
          <Button disabled={data.unavailable || full || pending} type="submit">
            <Plus />
            {t("notifications.add")}
          </Button>
        </FrameFooter>
      </form>
    {/key}
  </Frame>
</div>
