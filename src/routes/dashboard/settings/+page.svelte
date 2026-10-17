<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import CopyField from "$lib/components/CopyField.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import { showToast } from "$lib/components/toast.js";
  import { t } from "$lib/display";
  import type { MessageKey } from "$lib/i18n";
  import {
    Alert,
    AlertDescription,
    AlertTitle,
  } from "$lib/components/ui/alert";
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
  import { RadioGroup, RadioGroupItem } from "$lib/components/ui/radio-group";
  import { Switch } from "$lib/components/ui/switch";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Link2, RefreshCw, Save, Send, TriangleAlert } from "@lucide/svelte";

  const collectionOptions = [
    {
      description: "settings.collectHitsDescription",
      flag: 256,
      label: "settings.collectHitsLabel",
      name: "collectHits",
    },
    {
      description: "settings.collectSessionsDescription",
      flag: 128,
      label: "settings.collectSessionsLabel",
      name: "collectSessions",
    },
    {
      description: "settings.collectReferrerDescription",
      flag: 2,
      label: "settings.collectReferrerLabel",
      name: "collectReferrer",
    },
    {
      description: "settings.collectUserAgentDescription",
      flag: 4,
      label: "settings.collectUserAgentLabel",
      name: "collectUserAgent",
    },
    {
      description: "settings.collectScreenSizeDescription",
      flag: 8,
      label: "settings.collectScreenSizeLabel",
      name: "collectScreenSize",
    },
    {
      description: "settings.collectLocationDescription",
      flag: 16,
      label: "settings.collectLocationLabel",
      name: "collectLocation",
    },
    {
      description: "settings.collectRegionDescription",
      flag: 32,
      label: "settings.collectRegionLabel",
      name: "collectRegion",
    },
    {
      description: "settings.collectLanguageDescription",
      flag: 64,
      label: "settings.collectLanguageLabel",
      name: "collectLanguage",
    },
  ] as const;

  const PUBLIC_OPTIONS = [
    {
      description: "settings.visibilityPrivateDescription",
      label: "settings.visibilityPrivate",
      value: "private",
    },
    {
      description: "settings.visibilitySecretDescription",
      label: "settings.visibilitySecret",
      value: "secret",
    },
    {
      description: "settings.visibilityPublicDescription",
      label: "settings.visibilityPublic",
      value: "public",
    },
  ] as const;

  const COUNTER_FORMATS = ["html", "svg", "png", "json"] as const;

  let { data, form } = $props();

  let lastUpdateId = $state<string | null>(null);

  const adminUrl = $derived(data.goatCounterAdminUrl);
  const settingsValues = $derived(
    form?.values && "dataRetention" in form.values ? form.values : undefined
  );
  const createSiteValues = $derived(
    form?.values && "cname" in form.values && !("dataRetention" in form.values)
      ? form.values
      : undefined
  );

  $effect(() => {
    if (data.created && data.created !== lastUpdateId) {
      showToast(t("settings.siteCreated"), "success");
      lastUpdateId = data.created;
    } else if (data.updated && data.updated !== lastUpdateId) {
      showToast(t("settings.saved"), "success");
      lastUpdateId = data.updated;
    }
  });

  let publicMode = $derived(
    settingsValues?.public ?? data.site.settings.public ?? "private"
  );
  let secret = $derived(settingsValues?.secret ?? data.sharing.secret ?? "");
  let allowCounter = $derived(
    settingsValues?.allowCounter ?? data.site.settings.allow_counter
  );
  let counterPath = $state("TOTAL");

  const counterPathSegment = $derived(
    counterPath.trim() === "TOTAL" || !counterPath.trim()
      ? "TOTAL"
      : encodeURIComponent(
          counterPath.trim().startsWith("/")
            ? counterPath.trim()
            : `/${counterPath.trim()}`
        )
  );

  function counterUrl(format: (typeof COUNTER_FORMATS)[number]): string {
    return `${data.sharing.counterOrigin}/counter/${counterPathSegment}.${format}`;
  }

  /** 32 alphanumeric characters, within GoatCounter's 8–40 limit. */
  function generateSecret() {
    const alphabet =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = crypto.getRandomValues(new Uint8Array(32));

    // ponytail: modulo bias over 62 symbols is ~3%, negligible for a view token.
    secret = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join(
      ""
    );
  }

  /**
   * A message split around its {placeholders}, so markup such as <code> can
   * sit between the parts.
   * ponytail: assumes both locales keep placeholders in the same order.
   */
  function messageParts(key: MessageKey): string[] {
    return t(key).split(/\{\w+\}/);
  }

  const counterPathHelp = $derived(messageParts("settings.counterPathHelp"));

  function hasCollection(flag: number): boolean {
    return (data.site.settings.collect & flag) === flag;
  }
</script>

<SEO
  description={t("settings.seoDescription")}
  noindex
  title={t("settings.seoTitle")}
/>

<PageHeader description={t("settings.description")} title={t("settings.title")}>
  {#snippet actions()}
    <Button form="site-settings" type="submit">
      <Save />
      {t("settings.saveChanges")}
    </Button>
  {/snippet}
</PageHeader>

{#if form?.message && !createSiteValues}
  <Alert class="mb-4" variant="destructive">
    <TriangleAlert />
    <AlertTitle>{t("settings.notSaved")}</AlertTitle>
    <AlertDescription>
      {form.field ? t("settings.reviewField") : form.message}
    </AlertDescription>
  </Alert>
{/if}

<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
  <form
    action="?/update"
    class="min-w-0 space-y-4"
    id="site-settings"
    method="POST"
    use:enhance
  >
    <input name="siteId" type="hidden" value={data.site.id} />
    <Frame>
      <FrameHeader>
        <FrameTitle id="site-identity-heading">
          {data.site.cname || data.site.code}
        </FrameTitle>
        <FrameDescription>
          {t("settings.identityDescription")}
        </FrameDescription>
      </FrameHeader>
      <FramePanel
        aria-labelledby="site-identity-heading"
        class="grid gap-5"
        role="region"
      >
        <div class="grid gap-2">
          <Label for="settings-cname">{t("settings.analyticsHostname")}</Label>
          <Input
            aria-invalid={form?.field === "cname" ? "true" : undefined}
            id="settings-cname"
            name="cname"
            required
            type="text"
            value={settingsValues?.cname ?? data.site.cname ?? ""}
          />
        </div>
        <div class="grid gap-2">
          <Label for="settings-link-domain"
            >{t("settings.linkedWebsiteUrl")}</Label
          >
          <Input
            aria-describedby="link-domain-help"
            id="settings-link-domain"
            name="linkDomain"
            placeholder="https://www.example.com"
            type="url"
            value={settingsValues?.linkDomain ?? data.site.link_domain ?? ""}
          />
          <p class="text-xs text-muted-foreground" id="link-domain-help">
            {t("settings.linkDomainHelp")}
          </p>
        </div>
      </FramePanel>
    </Frame>
    <Frame>
      <FrameHeader>
        <FrameTitle id="data-controls-heading"
          >{t("settings.dataControls")}</FrameTitle
        >
        <FrameDescription>
          {t("settings.dataControlsDescription")}
        </FrameDescription>
      </FrameHeader>
      <FramePanel
        aria-labelledby="data-controls-heading"
        class="grid gap-5"
        role="region"
      >
        <div class="grid gap-5 md:grid-cols-2">
          <div class="grid content-start gap-2">
            <Label for="settings-data-retention"
              >{t("settings.dataRetention")}</Label
            >
            <div class="flex">
              <Input
                aria-describedby="data-retention-help"
                class="rounded-r-none"
                id="settings-data-retention"
                min="0"
                name="dataRetention"
                type="number"
                value={settingsValues?.dataRetention ??
                  data.site.settings.data_retention}
              />
              <span
                class="inline-flex h-8 items-center rounded-r-lg border border-l-0 border-input bg-muted px-2.5 text-sm text-muted-foreground"
              >
                {t("settings.days")}
              </span>
            </div>
            <p class="text-xs text-muted-foreground" id="data-retention-help">
              {t("settings.dataRetentionHelp")}
            </p>
          </div>
          <div class="grid content-start gap-2">
            <Label for="settings-collect-regions">
              {t("settings.collectRegions")}
            </Label>
            <Input
              aria-describedby={form?.field === "collectRegions"
                ? "collect-regions-help collect-regions-error"
                : "collect-regions-help"}
              aria-invalid={form?.field === "collectRegions"
                ? "true"
                : undefined}
              id="settings-collect-regions"
              name="collectRegions"
              placeholder="US, ID"
              type="text"
              value={settingsValues?.collectRegions ??
                data.site.settings.collect_regions.join(", ")}
            />
            <p class="text-xs text-muted-foreground" id="collect-regions-help">
              {t("settings.collectRegionsHelp")}
            </p>
            {#if form?.field === "collectRegions"}
              <p class="text-xs text-destructive" id="collect-regions-error">
                {form.message}
              </p>
            {/if}
          </div>
        </div>
        <div class="grid gap-2">
          <Label for="settings-ignore-ips">{t("settings.ignoreIps")}</Label>
          <Textarea
            aria-describedby={form?.field === "ignoreIps"
              ? "ignore-ips-help ignore-ips-error"
              : "ignore-ips-help"}
            aria-invalid={form?.field === "ignoreIps" ? "true" : undefined}
            class="min-h-28"
            id="settings-ignore-ips"
            name="ignoreIps"
            placeholder={t("settings.ignoreIpsPlaceholder")}
            value={settingsValues?.ignoreIps ??
              data.site.settings.ignore_ips.join("\n")}
          />
          <p class="text-xs text-muted-foreground" id="ignore-ips-help">
            {t("settings.ignoreIpsHelp")}
          </p>
          {#if form?.field === "ignoreIps"}
            <p class="text-xs text-destructive" id="ignore-ips-error">
              {form.message}
            </p>
          {/if}
        </div>
        <fieldset aria-describedby="collection-help" class="grid gap-2">
          <legend class="text-sm font-medium"
            >{t("settings.collectLegend")}</legend
          >
          <p class="text-xs text-muted-foreground" id="collection-help">
            {t("settings.collectHelp")}
          </p>
          <div class="mt-1 grid gap-2 sm:grid-cols-2">
            {#each collectionOptions as option (option.name)}
              <Label
                class="cursor-pointer items-start gap-3 rounded-lg border border-border p-3 leading-normal font-normal has-data-checked:bg-muted/50"
                for="settings-{option.name}"
              >
                <Checkbox
                  checked={settingsValues?.[option.name] ??
                    hasCollection(option.flag)}
                  class="mt-0.5"
                  id="settings-{option.name}"
                  name={option.name}
                  value="on"
                />
                <span class="grid gap-0.5">
                  <span class="text-sm font-medium">{t(option.label)}</span>
                  <span class="text-xs text-muted-foreground">
                    {t(option.description)}
                  </span>
                </span>
              </Label>
            {/each}
          </div>
        </fieldset>
      </FramePanel>
    </Frame>
    <Frame>
      <FrameHeader>
        <FrameTitle id="sharing-heading">{t("settings.sharing")}</FrameTitle>
        <FrameDescription>
          {t("settings.sharingDescription")}
        </FrameDescription>
      </FrameHeader>
      <FramePanel
        aria-labelledby="sharing-heading"
        class="grid gap-5"
        role="region"
      >
        <fieldset class="grid gap-2">
          <legend class="mb-2 text-sm font-medium"
            >{t("settings.visibility")}</legend
          >
          <RadioGroup
            aria-describedby={form?.field === "public"
              ? "public-error"
              : undefined}
            bind:value={publicMode}
            class="gap-2 sm:grid-cols-3"
            name="public"
          >
            {#each PUBLIC_OPTIONS as option (option.value)}
              <Label
                class="cursor-pointer items-start gap-3 rounded-lg border border-border p-3 leading-normal font-normal has-data-checked:bg-muted/50"
                for="settings-public-{option.value}"
              >
                <RadioGroupItem
                  class="mt-0.5"
                  id="settings-public-{option.value}"
                  value={option.value}
                />
                <span class="grid gap-0.5">
                  <span class="text-sm font-medium">{t(option.label)}</span>
                  <span class="text-xs text-muted-foreground">
                    {t(option.description)}
                  </span>
                </span>
              </Label>
            {/each}
          </RadioGroup>
          {#if form?.field === "public"}
            <p class="text-xs text-destructive" id="public-error">
              {form.message}
            </p>
          {/if}
        </fieldset>
        {#if publicMode === "secret"}
          <div class="grid gap-2">
            <Label for="settings-secret">{t("settings.accessToken")}</Label>
            <div class="flex items-center gap-1.5">
              <Input
                aria-describedby={form?.field === "secret"
                  ? "secret-help secret-error"
                  : "secret-help"}
                aria-invalid={form?.field === "secret" ? "true" : undefined}
                autocomplete="off"
                bind:value={secret}
                class="font-mono text-xs"
                id="settings-secret"
                maxlength={40}
                name="secret"
                placeholder={t("settings.secretPlaceholder")}
              />
              <Button onclick={generateSecret} type="button" variant="outline">
                <RefreshCw />
                {t("settings.generate")}
              </Button>
            </div>
            <p class="text-xs text-muted-foreground" id="secret-help">
              {t("settings.secretHelp")}
            </p>
            {#if form?.field === "secret"}
              <p class="text-xs text-destructive" id="secret-error">
                {form.message}
              </p>
            {/if}
            {#if data.sharing.shareUrl && secret === data.sharing.secret}
              <Label class="mt-2" for="settings-share-url"
                >{t("settings.shareLink")}</Label
              >
              <CopyField
                id="settings-share-url"
                label={t("settings.shareLink")}
                value={data.sharing.shareUrl}
              />
            {:else if !adminUrl}
              {@const parts = messageParts("settings.shareLinkNeedsAdminUrl")}
              <p class="text-xs text-muted-foreground">
                {parts[0]}<code class="font-mono">GOATCOUNTER_ADMIN_URL</code
                >{parts[1]}
              </p>
            {:else}
              <p class="text-xs text-muted-foreground">
                {t("settings.saveForShareLink")}
              </p>
            {/if}
          </div>
        {/if}
        <div class="grid gap-2">
          <Label for="settings-allow-embed">{t("settings.allowEmbed")}</Label>
          <Textarea
            aria-describedby={form?.field === "allowEmbed"
              ? "allow-embed-help allow-embed-error"
              : "allow-embed-help"}
            aria-invalid={form?.field === "allowEmbed" ? "true" : undefined}
            class="min-h-28"
            id="settings-allow-embed"
            name="allowEmbed"
            placeholder="https://dashboard.example.com"
            value={settingsValues?.allowEmbed ??
              data.site.settings.allow_embed.join("\n")}
          />
          <p class="text-xs text-muted-foreground" id="allow-embed-help">
            {t("settings.allowEmbedHelp")}
          </p>
          {#if form?.field === "allowEmbed"}
            <p class="text-xs text-destructive" id="allow-embed-error">
              {form.message}
            </p>
          {/if}
        </div>
        <div class="grid gap-2 sm:grid-cols-2">
          <Label
            class="cursor-pointer items-start gap-3 rounded-lg border border-border p-3 leading-normal font-normal"
            for="settings-allow-counter"
          >
            <Switch
              bind:checked={allowCounter}
              class="mt-0.5"
              id="settings-allow-counter"
              name="allowCounter"
              value="on"
            />
            <span class="grid gap-0.5">
              <span class="text-sm font-medium"
                >{t("settings.visitorCounter")}</span
              >
              <span class="text-xs text-muted-foreground">
                {t("settings.visitorCounterDescription")}
              </span>
            </span>
          </Label>
          <Label
            class="cursor-pointer items-start gap-3 rounded-lg border border-border p-3 leading-normal font-normal"
            for="settings-allow-bosmang"
          >
            <Switch
              checked={settingsValues?.allowBosmang ??
                data.site.settings.allow_bosmang}
              class="mt-0.5"
              id="settings-allow-bosmang"
              name="allowBosmang"
              value="on"
            />
            <span class="grid gap-0.5">
              <span class="text-sm font-medium">Bosmang</span>
              <span class="text-xs text-muted-foreground">
                {t("settings.bosmangDescription")}
              </span>
            </span>
          </Label>
        </div>
        {#if allowCounter && data.sharing.counterOrigin}
          <div class="grid gap-3 rounded-lg border border-border p-3">
            <div class="grid gap-2">
              <Label for="counter-path">{t("settings.counterPath")}</Label>
              <Input
                aria-describedby="counter-path-help"
                class="font-mono text-xs"
                id="counter-path"
                bind:value={counterPath}
              />
              <p class="text-xs text-muted-foreground" id="counter-path-help">
                {counterPathHelp[0]}<code class="font-mono">/blog</code
                >{counterPathHelp[1]}<code class="font-mono">TOTAL</code
                >{counterPathHelp[2]}
                {#if !data.site.settings.allow_counter}
                  {t("settings.saveToEnableCounter")}
                {/if}
              </p>
            </div>
            <div class="grid gap-2">
              <Label for="counter-snippet">{t("settings.embedSnippet")}</Label>
              <CopyField
                id="counter-snippet"
                label={t("settings.embedSnippet")}
                mono
                value={`<img src="${counterUrl("svg")}" alt="${t("settings.counterImageAlt")}">`}
              />
            </div>
            <div class="grid gap-2 sm:grid-cols-2">
              {#each COUNTER_FORMATS as format (format)}
                <div class="grid min-w-0 gap-1.5">
                  <Label class="text-xs" for="counter-url-{format}">
                    {t("settings.counterUrl", { format: format.toUpperCase() })}
                  </Label>
                  <CopyField
                    id="counter-url-{format}"
                    label={t("settings.counterUrlLabel", {
                      format: format.toUpperCase(),
                    })}
                    mono
                    value={counterUrl(format)}
                  />
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </FramePanel>
      <FrameFooter class="flex-row justify-end gap-2">
        <Button type="submit">
          <Save />
          {t("settings.saveChanges")}
        </Button>
      </FrameFooter>
    </Frame>
  </form>
  <aside class="space-y-4 lg:sticky lg:top-24">
    <Frame>
      <FrameHeader class="flex-row items-center justify-between gap-3">
        <FrameTitle class="truncate" id="settings-site-heading">
          {data.site.cname || data.site.code}
        </FrameTitle>
        {#if data.site.received_data}
          <Badge variant="success-light">{t("settings.receivingData")}</Badge>
        {:else}
          <Badge variant="outline">{t("settings.awaitingData")}</Badge>
        {/if}
      </FrameHeader>
      <FramePanel aria-labelledby="settings-site-heading" role="region">
        <dl class="flex items-center justify-between gap-4 text-sm">
          <dt class="text-muted-foreground">{t("settings.retention")}</dt>
          <dd class="font-medium tabular-nums">
            {data.site.settings.data_retention
              ? t("settings.retentionDays", {
                  count: data.site.settings.data_retention,
                })
              : t("settings.unlimited")}
          </dd>
        </dl>
      </FramePanel>
      <FrameFooter class="gap-2">
        <form
          action="?/sendTestVisit"
          method="POST"
          use:enhance={() =>
            async ({ result }) => {
              if (result.type === "success") {
                showToast(t("settings.testVisitSent"), "success");
              } else if (result.type === "failure") {
                showToast(
                  String(result.data?.message ?? t("settings.testVisitFailed")),
                  "error"
                );
              }
            }}
        >
          <Button class="w-full" type="submit" variant="outline">
            <Send />
            {t("settings.sendTestVisit")}
          </Button>
        </form>
        <p class="text-xs text-muted-foreground">
          {t("settings.testVisitHelp")}
        </p>
      </FrameFooter>
    </Frame>
    <Frame>
      <FrameHeader>
        <FrameTitle id="public-link-heading"
          >{t("settings.publicDashboard")}</FrameTitle
        >
        <FrameDescription>
          {t("settings.publicDashboardDescription")}
        </FrameDescription>
      </FrameHeader>
      <FramePanel aria-labelledby="public-link-heading" class="grid gap-3">
        {#if data.shareUnavailable || form?.field === "share"}
          <p role="alert" class="text-sm">
            {data.shareUnavailable ? t("share.unavailable") : form?.message}
          </p>
          <Button href="?site={data.site.id}" size="sm" variant="outline"
            >{t("share.retry")}</Button
          >
        {/if}
        <fieldset class="grid gap-2">
          <legend class="mb-2 text-sm font-medium">{t("share.expiry")}</legend>
          <div class="flex flex-wrap gap-4">
            {#each [1, 7, 30] as days (days)}
              <label class="flex min-h-9 items-center gap-2 text-sm">
                <input
                  checked={days === 7}
                  form="share-create"
                  name="expiryDays"
                  type="radio"
                  value={days}
                />
                {t(
                  days === 1
                    ? "share.oneDay"
                    : days === 7
                      ? "share.sevenDays"
                      : "share.thirtyDays"
                )}
              </label>
            {/each}
            <label class="flex min-h-9 items-center gap-2 text-sm">
              <input
                form="share-create"
                name="expiryDays"
                type="radio"
                value="never"
              />
              {t("share.neverExpires")}
            </label>
          </div>
          <p class="text-xs text-muted-foreground">{t("share.expiryHelp")}</p>
          {#if form?.field === "expiryDays"}
            <p class="text-sm text-destructive" role="alert">{form.message}</p>
          {/if}
        </fieldset>
        {#if data.publicLink}
          <CopyField
            id="public-link"
            label={t("settings.publicDashboardLink")}
            value={data.publicLink}
          />
          {#if data.publicLinkExpiresAt}
            <p class="text-xs text-muted-foreground">
              {t("share.expiresAt", {
                date: data.publicLinkExpiresAt
                  .replace("T", " ")
                  .replace(/\.\d+Z$/, " UTC"),
              })}
            </p>
          {:else}
            <p class="text-xs text-muted-foreground">
              {t("share.noExpiryHelp")}
            </p>
          {/if}
          <div class="flex flex-wrap gap-2">
            <form
              id="share-create"
              action="?/createShareLink&site={data.site.id}"
              method="POST"
              use:enhance
            >
              <Button size="sm" type="submit" variant="outline">
                <RefreshCw />
                {t("settings.newLink")}
              </Button>
            </form>
            <form
              action="?/revokeShareLink&site={data.site.id}"
              method="POST"
              use:enhance
            >
              <Button size="sm" type="submit" variant="destructive">
                {t("settings.revoke")}
              </Button>
            </form>
          </div>
          <p class="text-xs text-muted-foreground">
            {t("settings.publicLinkHelp")}
          </p>
        {:else}
          <form
            id="share-create"
            action="?/createShareLink&site={data.site.id}"
            method="POST"
            use:enhance
          >
            <Button
              disabled={data.shareUnavailable}
              class="w-full"
              type="submit"
              variant="outline"
            >
              <Link2 />
              {t("settings.createPublicLink")}
            </Button>
          </form>
        {/if}
      </FramePanel>
    </Frame>
    <Frame>
      <FrameHeader>
        <FrameTitle id="audience-heading">{t("share.audiences")}</FrameTitle>
        <FrameDescription>{t("share.audienceHelp")}</FrameDescription>
      </FrameHeader>
      <FramePanel aria-labelledby="audience-heading" class="grid gap-4">
        <form
          action="?/createShareLink&site={data.site.id}"
          method="POST"
          use:enhance
          class="grid gap-3"
        >
          <Label for="audience-label">{t("share.name")}</Label>
          <Input id="audience-label" name="label" maxlength={80} required />
          <fieldset class="grid gap-2" disabled={data.shareUnavailable}>
            <legend class="text-sm font-medium">{t("share.maxRange")}</legend>
            <RadioGroup
              name="maxRange"
              value="week"
              class="flex flex-wrap gap-4"
            >
              {#each ["week", "month", "quarter", "year"] as range (range)}
                <div class="flex items-center gap-2">
                  <RadioGroupItem
                    id="audience-range-{range}"
                    value={range}
                  /><Label for="audience-range-{range}"
                    >{t(
                      range === "week"
                        ? "share.rangeWeek"
                        : range === "month"
                          ? "share.rangeMonth"
                          : range === "quarter"
                            ? "share.rangeQuarter"
                            : "share.rangeYear"
                    )}</Label
                  >
                </div>
              {/each}
            </RadioGroup>
          </fieldset>
          <fieldset class="grid gap-2" disabled={data.shareUnavailable}>
            <legend class="text-sm font-medium">{t("share.categories")}</legend>
            <div class="flex flex-wrap gap-4">
              {#each [{ value: "total", key: "share.visits" }, { value: "hits", key: "share.pages" }, { value: "browsers", key: "share.browsers" }, { value: "referrers", key: "share.referrers" }, { value: "locations", key: "share.locations" }] as metric (metric.value)}
                <div class="flex items-center gap-2">
                  <Checkbox
                    id="audience-metric-{metric.value}"
                    name="metrics"
                    value={metric.value}
                    checked={metric.value === "total"}
                  /><Label for="audience-metric-{metric.value}"
                    >{t(metric.key as MessageKey)}</Label
                  >
                </div>
              {/each}
            </div>
          </fieldset>
          <fieldset class="grid gap-2" disabled={data.shareUnavailable}>
            <legend class="text-sm font-medium">{t("share.expiry")}</legend>
            <RadioGroup
              name="expiryDays"
              value="7"
              class="flex flex-wrap gap-4"
            >
              {#each [{ value: "1", key: "share.oneDay" }, { value: "7", key: "share.sevenDays" }, { value: "30", key: "share.thirtyDays" }, { value: "never", key: "share.neverExpires" }] as expiry (expiry.value)}
                <div class="flex items-center gap-2">
                  <RadioGroupItem
                    id="audience-expiry-{expiry.value}"
                    value={expiry.value}
                  /><Label for="audience-expiry-{expiry.value}"
                    >{t(expiry.key as MessageKey)}</Label
                  >
                </div>
              {/each}
            </RadioGroup>
          </fieldset>
          <Button
            size="sm"
            type="submit"
            disabled={data.shareUnavailable || data.shareLinks.length >= 20}
            >{t("share.createAudience")}</Button
          >
        </form>
        {#each data.shareLinks as link (link.id)}
          <div class="grid min-w-0 gap-3 border-t pt-4" aria-label={link.label}>
            <p class="text-sm font-medium break-words">{link.label}</p>
            <p class="text-xs text-muted-foreground">
              {t("share.maxRange")}: {t(
                link.maxRange === "week"
                  ? "share.rangeWeek"
                  : link.maxRange === "month"
                    ? "share.rangeMonth"
                    : link.maxRange === "quarter"
                      ? "share.rangeQuarter"
                      : "share.rangeYear"
              )} · {link.expiresAt
                ? t("share.expiresAt", {
                    date: link.expiresAt
                      .replace("T", " ")
                      .replace(/\.\d+Z$/, " UTC"),
                  })
                : t("share.neverExpires")}
            </p>
            <CopyField
              id="audience-{link.id}"
              label={link.label}
              value={link.url}
            />
            <div class="flex flex-wrap gap-2">
              <form
                action="?/createShareLink&site={data.site.id}"
                method="POST"
                use:enhance
              >
                <input type="hidden" name="id" value={link.id} /><Button
                  size="sm"
                  variant="outline"
                  type="submit">{t("share.rotate")}</Button
                >
              </form>
              <form
                action="?/revokeShareLink&site={data.site.id}"
                method="POST"
                use:enhance
              >
                <input type="hidden" name="id" value={link.id} /><Button
                  size="sm"
                  variant="destructive"
                  type="submit">{t("share.revokeAudience")}</Button
                >
              </form>
            </div>
          </div>
        {:else}
          <p class="text-sm text-muted-foreground">
            {t("share.emptyAudiences")}
          </p>
        {/each}
      </FramePanel>
    </Frame>
    <Frame>
      <FrameHeader>
        <FrameTitle id="native-admin-heading"
          >{t("settings.nativeAdmin")}</FrameTitle
        >
        <FrameDescription>
          {t("settings.nativeAdminDescription")}
        </FrameDescription>
      </FrameHeader>
      <FramePanel aria-labelledby="native-admin-heading" role="region">
        <Button
          class="w-full"
          href={`${resolve("/dashboard/admin/[section]", { section: "users" })}?site=${data.site.id}`}
          variant="outline">Open administration</Button
        >
      </FramePanel>
    </Frame>
    {#if data.sites.length > 1}
      <Frame>
        <FrameHeader>
          <FrameTitle id="available-sites-heading"
            >{t("settings.availableSites")}</FrameTitle
          >
        </FrameHeader>
        <FramePanel
          aria-labelledby="available-sites-heading"
          class="p-1.5"
          role="region"
        >
          <ul class="grid gap-0.5">
            {#each data.sites as site (site.id)}
              <li>
                <form action={resolve("/dashboard/settings")} method="GET">
                  <input name="site" type="hidden" value={site.id} />
                  <Button
                    aria-current={site.id === data.site.id ? "page" : undefined}
                    class="w-full justify-start"
                    type="submit"
                    variant={site.id === data.site.id ? "secondary" : "ghost"}
                  >
                    <span class="truncate">{site.cname || site.code}</span>
                  </Button>
                </form>
              </li>
            {/each}
          </ul>
        </FramePanel>
      </Frame>
    {/if}
    {#if data.canCreateSite}
      <form action="?/createSite" method="POST">
        <Frame>
          <FrameHeader>
            <FrameTitle id="add-site-heading"
              >{t("settings.addSite")}</FrameTitle
            >
            <FrameDescription>
              {t("settings.addSiteDescription")}
            </FrameDescription>
          </FrameHeader>
          <FramePanel
            aria-labelledby="add-site-heading"
            class="grid gap-4"
            role="region"
          >
            {#if createSiteValues && form?.message}
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertTitle>{t("settings.siteCreateFailed")}</AlertTitle>
                <AlertDescription>{form.message}</AlertDescription>
              </Alert>
            {/if}
            <div class="grid gap-2">
              <Label for="create-site-cname"
                >{t("settings.analyticsHostname")}</Label
              >
              <Input
                id="create-site-cname"
                name="cname"
                placeholder="stats.example.com"
                required
                type="text"
                value={createSiteValues?.cname ?? ""}
              />
            </div>
            <div class="grid gap-2">
              <Label for="create-site-link-domain">
                {t("settings.linkedWebsiteUrl")}
                <span class="font-normal text-muted-foreground"
                  >{t("settings.optional")}</span
                >
              </Label>
              <Input
                id="create-site-link-domain"
                name="linkDomain"
                placeholder="https://www.example.com"
                type="url"
                value={createSiteValues?.linkDomain ?? ""}
              />
            </div>
          </FramePanel>
          <FrameFooter class="flex-row justify-end gap-2">
            <Button type="submit" variant="outline"
              >{t("settings.createSite")}</Button
            >
          </FrameFooter>
        </Frame>
      </form>
    {/if}
  </aside>
</div>
