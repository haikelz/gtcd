<script lang="ts">
  import { enhance } from "$app/forms";
  import SEO from "$lib/components/SEO.svelte";
  import { showToast } from "$lib/components/toast.js";
  import {
    BadgeCheck,
    Database,
    ExternalLink,
    Save,
    Settings,
    ShieldCheck,
    TriangleAlert,
  } from "@lucide/svelte";

  let { data, form } = $props();
  const adminUrl = $derived(data.goatCounterAdminUrl);
  let lastUpdateId = $state<string | null>(null);

  $effect(() => {
    if (data.updated && data.updated !== lastUpdateId) {
      showToast("Site settings saved.", "success");
      lastUpdateId = data.updated;
    }
  });
</script>

<SEO
  title="Site settings — gtcd"
  description="Manage GoatCounter site settings."
  noindex
/>

<header
  class="flex flex-col gap-4 mb-6 sm:flex-row sm:items-end sm:justify-between"
>
  <div class="max-w-2xl">
    <p class="eyebrow mb-2">Site administration</p>
    <h1
      class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground"
    >
      Site settings
    </h1>
    <p class="text-sm leading-6 text-muted-foreground mt-2">
      Control the data GoatCounter keeps and where your analytics can appear.
    </p>
  </div>
  <button class="btn btn-primary shrink-0" type="submit" form="site-settings">
    <Save class="h-4 w-4" /> Save changes
  </button>
</header>

{#if form?.message}
  <div class="alert alert-error mb-5" role="alert">
    <TriangleAlert class="h-5 w-5 shrink-0" />
    <span
      >{form.field
        ? "GoatCounter could not save your settings. Review the highlighted field."
        : form.message}</span
    >
  </div>
{/if}

<div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
  <form
    id="site-settings"
    method="POST"
    action="?/update"
    use:enhance
    class="panel !p-0 overflow-hidden"
  >
    <input type="hidden" name="siteId" value={data.site.id} />

    <section class="p-5 sm:p-6" aria-labelledby="site-identity-heading">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <span class="metric-icon shrink-0" aria-hidden="true"
          ><Settings class="h-5 w-5" /></span
        >
        <div>
          <h2 id="site-identity-heading" class="section-title">
            {data.site.cname || data.site.code}
          </h2>
          <p class="text-sm leading-6 text-muted-foreground mt-1">
            Connect this analytics site to the website people visit.
          </p>
        </div>
      </div>
      <label class="grid gap-2 mt-6">
        <span class="label-text font-medium">Linked website URL</span>
        <input
          class="input input-bordered h-11 w-full px-3"
          name="linkDomain"
          type="url"
          value={form?.values?.linkDomain ?? data.site.link_domain ?? ""}
          placeholder="https://www.example.com"
          aria-describedby="link-domain-help"
        />
        <span
          id="link-domain-help"
          class="block text-xs leading-5 text-muted-foreground"
          >Use the canonical URL for the website this site measures.</span
        >
      </label>
    </section>

    <section
      class="border-t border-border p-5 sm:p-6"
      aria-labelledby="data-controls-heading"
    >
      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <span class="metric-icon shrink-0" aria-hidden="true"
          ><Database class="h-5 w-5" /></span
        >
        <div>
          <h2 id="data-controls-heading" class="section-title">
            Data controls
          </h2>
          <p class="text-sm leading-6 text-muted-foreground mt-1">
            Choose how long analytics data is kept and which traffic to ignore.
          </p>
        </div>
      </div>
      <div
        class="grid gap-6 mt-6 md:grid-cols-[minmax(15rem,0.75fr)_minmax(0,1.25fr)]"
      >
        <label class="grid content-start gap-2">
          <span class="label-text font-medium">Data retention</span>
          <div class="join w-full">
            <input
              class="input input-bordered join-item h-11 w-full px-3"
              name="dataRetention"
              type="number"
              min="0"
              value={form?.values?.dataRetention ??
                data.site.settings.data_retention}
              aria-label="Data retention in days"
              aria-describedby="data-retention-help"
            />
            <span class="btn btn-disabled join-item h-11 pointer-events-none"
              >days</span
            >
          </div>
          <span
            id="data-retention-help"
            class="block text-xs leading-5 text-muted-foreground"
            >Use 0 to retain data indefinitely.</span
          >
        </label>
        <label class="grid gap-2">
          <span class="label-text font-medium">Ignored IP addresses</span>
          <textarea
            class="textarea textarea-bordered min-h-32 w-full p-3 leading-6"
            name="ignoreIps"
            placeholder="One IP or CIDR per line"
            aria-describedby={form?.field === "ignoreIps"
              ? "ignore-ips-help ignore-ips-error"
              : "ignore-ips-help"}
            aria-invalid={form?.field === "ignoreIps" ? "true" : undefined}
            >{form?.values?.ignoreIps ??
              data.site.settings.ignore_ips.join("\n")}</textarea
          >
          <span
            id="ignore-ips-help"
            class="block text-xs leading-5 text-muted-foreground"
            >Exclude internal traffic using one IP address or CIDR range per
            line.</span
          >
          {#if form?.field === "ignoreIps"}
            <span
              id="ignore-ips-error"
              class="block text-xs leading-5 text-error">{form.message}</span
            >
          {/if}
        </label>
      </div>
      <label class="grid gap-2 mt-6">
        <span class="label-text font-medium"
          >Countries with regional reporting</span
        >
        <input
          class="input input-bordered h-11 w-full px-3"
          name="collectRegions"
          type="text"
          placeholder="US, ID"
          aria-describedby={form?.field === "collectRegions"
            ? "collect-regions-help collect-regions-error"
            : "collect-regions-help"}
          aria-invalid={form?.field === "collectRegions" ? "true" : undefined}
          value={form?.values?.collectRegions ??
            data.site.settings.collect_regions.join(", ")}
        />
        <span
          id="collect-regions-help"
          class="block text-xs leading-5 text-muted-foreground"
          >Enter comma-separated country codes only where regional detail is
          needed.</span
        >
        {#if form?.field === "collectRegions"}
          <span
            id="collect-regions-error"
            class="block text-xs leading-5 text-error">{form.message}</span
          >
        {/if}
      </label>
    </section>

    <section
      class="border-t border-border p-5 sm:p-6"
      aria-labelledby="sharing-heading"
    >
      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <span class="metric-icon shrink-0" aria-hidden="true"
          ><ShieldCheck class="h-5 w-5" /></span
        >
        <div>
          <h2 id="sharing-heading" class="section-title">
            Sharing and counters
          </h2>
          <p class="text-sm leading-6 text-muted-foreground mt-1">
            Set where analytics can be embedded and which public counters are
            available.
          </p>
        </div>
      </div>
      <label class="grid gap-2 mt-6">
        <span class="label-text font-medium">Allowed embed origins</span>
        <textarea
          class="textarea textarea-bordered min-h-32 w-full p-3 leading-6"
          name="allowEmbed"
          placeholder="https://dashboard.example.com"
          aria-describedby={form?.field === "allowEmbed"
            ? "allow-embed-help allow-embed-error"
            : "allow-embed-help"}
          aria-invalid={form?.field === "allowEmbed" ? "true" : undefined}
          >{form?.values?.allowEmbed ??
            data.site.settings.allow_embed.join("\n")}</textarea
        >
        <span
          id="allow-embed-help"
          class="block text-xs leading-5 text-muted-foreground"
          >Allow one trusted origin per line.</span
        >
        {#if form?.field === "allowEmbed"}
          <span
            id="allow-embed-error"
            class="block text-xs leading-5 text-error">{form.message}</span
          >
        {/if}
      </label>
      <div class="grid gap-3 mt-6 sm:grid-cols-2">
        <label
          class="flex min-h-22 cursor-pointer items-center gap-3 rounded-box border border-border p-4"
        >
          <input
            class="toggle toggle-primary shrink-0"
            name="allowCounter"
            type="checkbox"
            checked={form?.values?.allowCounter ??
              data.site.settings.allow_counter}
          />
          <span
            ><span class="block text-sm font-medium">Visitor counter</span><span
              class="block text-xs leading-5 text-muted-foreground mt-0.5"
              >Allow the public visitor counter.</span
            ></span
          >
        </label>
        <label
          class="flex min-h-22 cursor-pointer items-center gap-3 rounded-box border border-border p-4"
        >
          <input
            class="toggle toggle-primary shrink-0"
            name="allowBosmang"
            type="checkbox"
            checked={form?.values?.allowBosmang ??
              data.site.settings.allow_bosmang}
          />
          <span
            ><span class="block text-sm font-medium">Bosmang</span><span
              class="block text-xs leading-5 text-muted-foreground mt-0.5"
              >Allow GoatCounter's Bosmang interface.</span
            ></span
          >
        </label>
      </div>
    </section>
  </form>

  <aside class="h-fit space-y-4 lg:sticky lg:top-24">
    <section class="panel" aria-labelledby="settings-site-heading">
      <p class="eyebrow mb-3">Current site</p>
      <h2 id="settings-site-heading" class="section-title">
        {data.site.cname || data.site.code}
      </h2>
      <dl class="mt-5 space-y-3 text-sm">
        <div class="flex items-center justify-between gap-4">
          <dt class="text-muted-foreground">Status</dt>
          <dd class="font-medium flex items-center gap-1.5">
            <BadgeCheck class="h-4 w-4 text-success" />
            {data.site.received_data ? "Receiving data" : "Awaiting data"}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4">
          <dt class="text-muted-foreground">Retention</dt>
          <dd class="font-medium">
            {data.site.settings.data_retention || "Unlimited"}
          </dd>
        </div>
      </dl>
    </section>
    <section class="panel" aria-labelledby="native-admin-heading">
      <h2 id="native-admin-heading" class="section-title">
        Native administration
      </h2>
      <p class="text-sm leading-6 text-muted-foreground mt-2">
        Manage users, API tokens, TOTP, imports, pages, preferences, and email
        reports in GoatCounter.
      </p>
      {#if adminUrl}
        <svelte:element
          this={"a"}
          class="btn btn-outline w-full mt-5"
          href={adminUrl}
          target="_blank"
          rel="noreferrer"
          ><ExternalLink class="h-4 w-4" /> Open GoatCounter</svelte:element
        >
      {:else}
        <div class="alert alert-warning items-start text-sm mt-5 min-w-0">
          <TriangleAlert class="h-4 w-4 shrink-0" />
          <span class="min-w-0">
            Set <code class="break-words">GOATCOUNTER_ADMIN_URL</code> to enable this
            handoff.
          </span>
        </div>
      {/if}
    </section>
    {#if data.sites.length > 1}
      <section class="panel" aria-labelledby="available-sites-heading">
        <h2 id="available-sites-heading" class="section-title">
          Available sites
        </h2>
        <ul class="list-none m-0 mt-3 p-0 space-y-1 text-sm">
          {#each data.sites as site (site.id)}
            <li
              class="flex items-center gap-2 rounded-field px-2 py-2 {site.id ===
              data.site.id
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground'}"
            >
              <span
                class="h-1.5 w-1.5 rounded-full bg-current"
                aria-hidden="true"
              ></span>
              <span class="truncate">{site.cname || site.code}</span>
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </aside>
</div>
