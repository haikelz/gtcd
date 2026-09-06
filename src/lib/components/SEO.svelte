<script lang="ts">
	import { page } from '$app/state';

	let {
		title,
		description,
		canonical,
		ogImage = '/og.png',
		ogType = 'website',
		noindex = false,
		structuredData
	}: {
		title: string;
		description: string;
		canonical?: string;
		ogImage?: string;
		ogType?: string;
		noindex?: boolean;
		structuredData?: Record<string, any>;
	} = $props();

	const siteName = 'gtcd — Custom GoatCounter Dashboard';
	const fullTitle = $derived(title === siteName ? title : `${title} — gtcd`);

	// Derive the canonical URL from the request origin so self-hosted
	// deployments under any domain emit correct URLs without configuration.
	const currentUrl = $derived(canonical || page.url.origin + page.url.pathname);

	// Open Graph requires absolute image URLs; resolve relative paths
	// (like the bundled /og.png banner) against the request origin.
	const ogImageUrl = $derived(
		ogImage.startsWith('http') ? ogImage : page.url.origin + ogImage
	);

	const defaultStructuredData = $derived({
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: 'gtcd',
		description,
		url: currentUrl,
		applicationCategory: 'AnalyticsApplication',
		operatingSystem: 'Web',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'USD'
		},
		author: {
			'@type': 'Person',
			name: 'gtcd contributors'
		},
		...structuredData
	});
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	<meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
	<link rel="canonical" href={currentUrl} />

	<!-- Open Graph -->
	<meta property="og:type" content={ogType} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={currentUrl} />
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

	<!-- JSON-LD -->
	{@html `<script type="application/ld+json">${JSON.stringify(defaultStructuredData)}</script>`}
</svelte:head>
