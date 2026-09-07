<script lang="ts">
  import SEO from "$lib/components/SEO.svelte";
  import { ExternalLink, Save, Settings, TriangleAlert } from "@lucide/svelte";

  let { data } = $props();
  const adminUrl = $derived(data.goatCounterAdminUrl);
</script>

<SEO
  title="Site settings — gtcd"
  description="Manage GoatCounter site settings."
  noindex
/>

<header class="flex flex-col gap-3 mb-8">
  <p class="eyebrow">Manage</p>
  <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
    Site settings
  </h1>
  <p class="text-sm text-muted-foreground">
    Configuration is applied directly to the selected GoatCounter site.
  </p>
</header>

{#if data.updated}
  <div class="alert alert-success mb-6" role="status">Site settings saved.</div>
{/if}

<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
  <form method="POST" action="?/update" class="panel space-y-6">
    <input type="hidden" name="siteId" value={data.site.id} />
    <div class="flex items-center gap-2">
      <Settings class="h-5 w-5 text-primary" />
      <h2 class="section-title">{data.site.cname || data.site.code}</h2>
    </div>
    <label class="form-control">
      <span class="label-text">Linked website URL</span>
      <input
        class="input input-bordered w-full"
        name="linkDomain"
        type="url"
        value={data.site.link_domain || ""}
        placeholder="https://www.example.com"
      />
    </label>
    <label class="form-control">
      <span class="label-text">Data retention (days)</span>
      <input
        class="input input-bordered w-full"
        name="dataRetention"
        type="number"
        min="0"
        value={data.site.settings.data_retention}
      />
    </label>
    <label class="form-control">
      <span class="label-text">Ignored IP addresses</span>
      <textarea
        class="textarea textarea-bordered min-h-24"
        name="ignoreIps"
        placeholder="One IP or CIDR per line"
        >{data.site.settings.ignore_ips.join("\n")}</textarea
      >
    </label>
    <label class="form-control">
      <span class="label-text">Countries with regional reporting</span>
      <textarea
        class="textarea textarea-bordered min-h-20"
        name="collectRegions"
        placeholder="US, ID"
        >{data.site.settings.collect_regions.join(", ")}</textarea
      >
    </label>
    <label class="form-control">
      <span class="label-text">Allowed embed origins</span>
      <textarea
        class="textarea textarea-bordered min-h-20"
        name="allowEmbed"
        placeholder="https://dashboard.example.com"
        >{data.site.settings.allow_embed.join("\n")}</textarea
      >
    </label>
    <div class="flex flex-wrap gap-6">
      <label class="label cursor-pointer justify-start gap-3"
        ><input
          class="toggle toggle-primary"
          name="allowCounter"
          type="checkbox"
          checked={data.site.settings.allow_counter}
        /><span class="label-text">Enable visitor counter</span></label
      >
      <label class="label cursor-pointer justify-start gap-3"
        ><input
          class="toggle toggle-primary"
          name="allowBosmang"
          type="checkbox"
          checked={data.site.settings.allow_bosmang}
        /><span class="label-text">Enable Bosmang</span></label
      >
    </div>
    <button class="btn btn-primary" type="submit"
      ><Save class="h-4 w-4" /> Save settings</button
    >
  </form>
  <aside class="panel h-fit space-y-4">
    <h2 class="section-title">Native administration</h2>
    <p class="text-sm text-muted-foreground">
      Users, API tokens, TOTP, imports, page management, dashboard preferences,
      and email reports stay in GoatCounter.
    </p>
    {#if adminUrl}
      <form action={adminUrl} method="GET">
        <button class="btn btn-outline w-full" type="submit"
          ><ExternalLink class="h-4 w-4" /> Open GoatCounter</button
        >
      </form>
    {:else}
      <div class="alert alert-warning text-sm">
        <TriangleAlert class="h-4 w-4" /> Set <code>GOATCOUNTER_ADMIN_URL</code> to
        enable this handoff.
      </div>
    {/if}
    {#if data.sites.length > 1}
      <div class="border-t border-border pt-4">
        <h3 class="text-sm font-medium mb-2">Available sites</h3>
        <ul class="list-none m-0 p-0 space-y-1 text-sm text-muted-foreground">
          {#each data.sites as site (site.id)}
            <li
              class={site.id === data.site.id
                ? "text-foreground font-medium"
                : ""}
            >
              {site.cname || site.code}
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </aside>
</div>
