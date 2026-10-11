<script lang="ts">
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import CopyField from "$lib/components/CopyField.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import SEO from "$lib/components/SEO.svelte";
  import { showToast } from "$lib/components/toast.js";
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
  import { ExternalLink, RefreshCw, Save, TriangleAlert } from "@lucide/svelte";

  const collectionOptions = [
    {
      description: "Store pageviews for CSV exports.",
      flag: 256,
      label: "Individual pageviews",
      name: "collectHits",
    },
    {
      description: "Estimate unique visitors for up to eight hours.",
      flag: 128,
      label: "Sessions",
      name: "collectSessions",
    },
    {
      description: "Record referrer headers and campaign parameters.",
      flag: 2,
      label: "Referrers and campaigns",
      name: "collectReferrer",
    },
    {
      description:
        "Derive names from the User-Agent without storing the header.",
      flag: 4,
      label: "Browser and system",
      name: "collectUserAgent",
    },
    {
      description: "Record viewport dimensions.",
      flag: 8,
      label: "Screen size",
      name: "collectScreenSize",
    },
    {
      description: "Record visitor country.",
      flag: 16,
      label: "Country",
      name: "collectLocation",
    },
    {
      description: "Record regional detail for selected countries.",
      flag: 32,
      label: "Region",
      name: "collectRegion",
    },
    {
      description: "Record supported browser languages.",
      flag: 64,
      label: "Language",
      name: "collectLanguage",
    },
  ] as const;

  const PUBLIC_OPTIONS = [
    {
      description: "Only signed-in GoatCounter users can see the dashboard.",
      label: "Private",
      value: "private",
    },
    {
      description: "Anyone with the share link can view the dashboard.",
      label: "Secret link",
      value: "secret",
    },
    {
      description: "Anyone can view the GoatCounter dashboard.",
      label: "Public",
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
      showToast("Site created.", "success");
      lastUpdateId = data.created;
    } else if (data.updated && data.updated !== lastUpdateId) {
      showToast("Site settings saved.", "success");
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

  function hasCollection(flag: number): boolean {
    return (data.site.settings.collect & flag) === flag;
  }
</script>

<SEO
  description="Manage GoatCounter site settings."
  noindex
  title="Site settings — gtcd"
/>

<PageHeader
  description="Control the data GoatCounter keeps and where your analytics can appear."
  title="Site settings"
>
  {#snippet actions()}
    <Button form="site-settings" type="submit">
      <Save />
      Save changes
    </Button>
  {/snippet}
</PageHeader>

{#if form?.message && !createSiteValues}
  <Alert class="mb-4" variant="destructive">
    <TriangleAlert />
    <AlertTitle>Settings not saved</AlertTitle>
    <AlertDescription>
      {form.field
        ? "GoatCounter could not save your settings. Review the highlighted field."
        : form.message}
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
          Connect this analytics site to the website people visit.
        </FrameDescription>
      </FrameHeader>
      <FramePanel
        aria-labelledby="site-identity-heading"
        class="grid gap-5"
        role="region"
      >
        <div class="grid gap-2">
          <Label for="settings-cname">Analytics hostname</Label>
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
          <Label for="settings-link-domain">Linked website URL</Label>
          <Input
            aria-describedby="link-domain-help"
            id="settings-link-domain"
            name="linkDomain"
            placeholder="https://www.example.com"
            type="url"
            value={settingsValues?.linkDomain ?? data.site.link_domain ?? ""}
          />
          <p class="text-xs text-muted-foreground" id="link-domain-help">
            Use the canonical URL for the website this site measures.
          </p>
        </div>
      </FramePanel>
    </Frame>
    <Frame>
      <FrameHeader>
        <FrameTitle id="data-controls-heading">Data controls</FrameTitle>
        <FrameDescription>
          Choose how long analytics data is kept and which traffic to ignore.
        </FrameDescription>
      </FrameHeader>
      <FramePanel
        aria-labelledby="data-controls-heading"
        class="grid gap-5"
        role="region"
      >
        <div class="grid gap-5 md:grid-cols-2">
          <div class="grid content-start gap-2">
            <Label for="settings-data-retention">Data retention</Label>
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
                days
              </span>
            </div>
            <p class="text-xs text-muted-foreground" id="data-retention-help">
              Use 0 to retain data indefinitely.
            </p>
          </div>
          <div class="grid content-start gap-2">
            <Label for="settings-collect-regions">
              Countries with regional reporting
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
              Comma-separated country codes, only where regional detail is
              needed.
            </p>
            {#if form?.field === "collectRegions"}
              <p class="text-xs text-destructive" id="collect-regions-error">
                {form.message}
              </p>
            {/if}
          </div>
        </div>
        <div class="grid gap-2">
          <Label for="settings-ignore-ips">Ignored IP addresses</Label>
          <Textarea
            aria-describedby={form?.field === "ignoreIps"
              ? "ignore-ips-help ignore-ips-error"
              : "ignore-ips-help"}
            aria-invalid={form?.field === "ignoreIps" ? "true" : undefined}
            class="min-h-28"
            id="settings-ignore-ips"
            name="ignoreIps"
            placeholder="One IP or CIDR per line"
            value={settingsValues?.ignoreIps ??
              data.site.settings.ignore_ips.join("\n")}
          />
          <p class="text-xs text-muted-foreground" id="ignore-ips-help">
            Exclude internal traffic using one IP address or CIDR range per
            line.
          </p>
          {#if form?.field === "ignoreIps"}
            <p class="text-xs text-destructive" id="ignore-ips-error">
              {form.message}
            </p>
          {/if}
        </div>
        <fieldset aria-describedby="collection-help" class="grid gap-2">
          <legend class="text-sm font-medium">Data to collect</legend>
          <p class="text-xs text-muted-foreground" id="collection-help">
            Changes apply to future visits. Existing analytics data is not
            removed.
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
                  <span class="text-sm font-medium">{option.label}</span>
                  <span class="text-xs text-muted-foreground">
                    {option.description}
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
        <FrameTitle id="sharing-heading">Sharing and counters</FrameTitle>
        <FrameDescription>
          Set where analytics can be embedded and which public counters are
          available.
        </FrameDescription>
      </FrameHeader>
      <FramePanel
        aria-labelledby="sharing-heading"
        class="grid gap-5"
        role="region"
      >
        <fieldset class="grid gap-2">
          <legend class="mb-2 text-sm font-medium">Dashboard visibility</legend>
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
                  <span class="text-sm font-medium">{option.label}</span>
                  <span class="text-xs text-muted-foreground">
                    {option.description}
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
            <Label for="settings-secret">Access token</Label>
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
                placeholder="Generated on save"
              />
              <Button onclick={generateSecret} type="button" variant="outline">
                <RefreshCw />
                Generate
              </Button>
            </div>
            <p class="text-xs text-muted-foreground" id="secret-help">
              8 to 40 letters and digits. A new token stops old share links from
              working.
            </p>
            {#if form?.field === "secret"}
              <p class="text-xs text-destructive" id="secret-error">
                {form.message}
              </p>
            {/if}
            {#if data.sharing.shareUrl && secret === data.sharing.secret}
              <Label class="mt-2" for="settings-share-url">Share link</Label>
              <CopyField
                id="settings-share-url"
                label="Share link"
                value={data.sharing.shareUrl}
              />
            {:else if !adminUrl}
              <p class="text-xs text-muted-foreground">
                Set <code class="font-mono">GOATCOUNTER_ADMIN_URL</code> to get a
                ready-made share link.
              </p>
            {:else}
              <p class="text-xs text-muted-foreground">
                Save to get the share link for this token.
              </p>
            {/if}
          </div>
        {/if}
        <div class="grid gap-2">
          <Label for="settings-allow-embed">Allowed embed origins</Label>
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
            Allow one trusted origin per line.
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
              <span class="text-sm font-medium">Visitor counter</span>
              <span class="text-xs text-muted-foreground">
                Allow the public visitor counter.
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
                Allow GoatCounter's Bosmang interface.
              </span>
            </span>
          </Label>
        </div>
        {#if allowCounter && data.sharing.counterOrigin}
          <div class="grid gap-3 rounded-lg border border-border p-3">
            <div class="grid gap-2">
              <Label for="counter-path">Counter path</Label>
              <Input
                aria-describedby="counter-path-help"
                class="font-mono text-xs"
                id="counter-path"
                bind:value={counterPath}
              />
              <p class="text-xs text-muted-foreground" id="counter-path-help">
                A page path such as <code class="font-mono">/blog</code>, or
                <code class="font-mono">TOTAL</code> for the whole site.
                {#if !data.site.settings.allow_counter}
                  Save to turn the counter on.
                {/if}
              </p>
            </div>
            <div class="grid gap-2">
              <Label for="counter-snippet">Embed snippet</Label>
              <CopyField
                id="counter-snippet"
                label="Embed snippet"
                mono
                value={`<img src="${counterUrl("svg")}" alt="Visitor count">`}
              />
            </div>
            <div class="grid gap-2 sm:grid-cols-2">
              {#each COUNTER_FORMATS as format (format)}
                <div class="grid min-w-0 gap-1.5">
                  <Label class="text-xs" for="counter-url-{format}">
                    {format.toUpperCase()} URL
                  </Label>
                  <CopyField
                    id="counter-url-{format}"
                    label="{format.toUpperCase()} counter URL"
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
          Save changes
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
          <Badge variant="success-light">Receiving data</Badge>
        {:else}
          <Badge variant="outline">Awaiting data</Badge>
        {/if}
      </FrameHeader>
      <FramePanel aria-labelledby="settings-site-heading" role="region">
        <dl class="flex items-center justify-between gap-4 text-sm">
          <dt class="text-muted-foreground">Retention</dt>
          <dd class="font-medium tabular-nums">
            {data.site.settings.data_retention
              ? `${data.site.settings.data_retention} days`
              : "Unlimited"}
          </dd>
        </dl>
      </FramePanel>
    </Frame>
    <Frame>
      <FrameHeader>
        <FrameTitle id="native-admin-heading">Native administration</FrameTitle>
        <FrameDescription>
          Manage users, API tokens, TOTP, imports, pages, preferences, and email
          reports in GoatCounter.
        </FrameDescription>
      </FrameHeader>
      <FramePanel aria-labelledby="native-admin-heading" role="region">
        {#if adminUrl}
          <Button
            class="w-full"
            href={adminUrl}
            rel="noreferrer"
            target="_blank"
            variant="outline"
          >
            <ExternalLink />
            Open GoatCounter
          </Button>
        {:else}
          <Alert role="status" variant="warning">
            <TriangleAlert />
            <AlertTitle>Handoff unavailable</AlertTitle>
            <AlertDescription class="min-w-0">
              <p>
                Set <code class="font-mono text-xs break-all"
                  >GOATCOUNTER_ADMIN_URL</code
                > to enable it.
              </p>
            </AlertDescription>
          </Alert>
        {/if}
      </FramePanel>
    </Frame>
    {#if data.sites.length > 1}
      <Frame>
        <FrameHeader>
          <FrameTitle id="available-sites-heading">Available sites</FrameTitle>
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
            <FrameTitle id="add-site-heading">Add a site</FrameTitle>
            <FrameDescription>
              Create a child site for another analytics hostname. Configure its
              host in your GoatCounter reverse proxy before it can receive data.
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
                <AlertTitle>Site not created</AlertTitle>
                <AlertDescription>{form.message}</AlertDescription>
              </Alert>
            {/if}
            <div class="grid gap-2">
              <Label for="create-site-cname">Analytics hostname</Label>
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
                Linked website URL
                <span class="font-normal text-muted-foreground">(optional)</span
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
            <Button type="submit" variant="outline">Create site</Button>
          </FrameFooter>
        </Frame>
      </form>
    {/if}
  </aside>
</div>
