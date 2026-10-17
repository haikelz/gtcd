<script lang="ts">
  import { page } from "$app/state";
  import { t } from "$lib/display";

  let {
    title,
    description,
    canonical,
    ogImage = "/og.png",
    ogType = "website",
    noindex = true,
    structuredData,
  }: {
    title: string;
    description: string;
    canonical?: string;
    ogImage?: string;
    ogType?: string;
    noindex?: boolean;
    structuredData?: Record<string, unknown>;
  } = $props();

  const siteName = $derived(t("shell.siteName"));
  const fullTitle = $derived(title === siteName ? title : `${title} — gtcd`);

  // Derive the canonical URL from the request origin so self-hosted
  // deployments under any domain emit correct URLs without configuration.
  const sharedReport = $derived(page.url.pathname.startsWith("/share/"));
  const currentUrl = $derived(canonical || page.url.origin + page.url.pathname);

  // Open Graph requires absolute image URLs; resolve relative paths
  // (like the bundled /og.png banner) against the request origin.
  const ogImageUrl = $derived(
    ogImage.startsWith("http") ? ogImage : page.url.origin + ogImage
  );

  // Public product pages may supply their own factual schema explicitly.
  // Never emit schemas for private reports or token-bearing share URLs.
  const structuredDataMarkup = $derived(
    `<script type="application/ld+json">${JSON.stringify(structuredData ?? {}).replaceAll("<", "\\u003c")}</` +
      "script>"
  );
</script>

<svelte:head>
  <title>{fullTitle}</title>
  <meta name="description" content={description} />
  <meta
    name="robots"
    content={noindex || sharedReport ? "noindex, nofollow" : "index, follow"}
  />
  {#if !sharedReport}<link rel="canonical" href={currentUrl} />{/if}

  <!-- Open Graph -->
  <meta property="og:type" content={ogType} />
  <meta property="og:title" content={fullTitle} />
  <meta property="og:description" content={description} />
  {#if !sharedReport}<meta property="og:url" content={currentUrl} />{/if}
  <meta property="og:site_name" content={siteName} />
  <meta property="og:image" content={ogImageUrl} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="gtcd — {description}" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={fullTitle} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={ogImageUrl} />

  {#if structuredData && !noindex && !sharedReport}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html structuredDataMarkup}
  {/if}
</svelte:head>
