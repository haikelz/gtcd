<script lang="ts">
	import { goto } from '$app/navigation';
	import SEO from '$lib/components/SEO.svelte';
	import DateRangePicker from '$lib/components/DateRangePicker.svelte';

	let { data } = $props();
	let datePreset = $state('7d');

	$effect(() => { datePreset = data.range || '7d'; });

	function handleDateChange(preset: string) {
		datePreset = preset;
		goto(`/dashboard/pages?range=${preset}`, { replaceState: true });
	}
</script>

<SEO title="Pages — gtcd" description="Top pages for your GoatCounter site." />

<header class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8 animate-fade-in">
	<div>
		<p class="eyebrow mb-1.5">Breakdown</p>
		<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">Pages</h1>
		<p class="text-sm mt-1.5" style="color: var(--color-muted-foreground);">Which pages your visitors view.</p>
	</div>
	<DateRangePicker value={datePreset} onchange={handleDateChange} />
</header>

{#if data.error}
	<div class="rounded-2xl border p-5 animate-fade-in" style="border-color: oklch(58% 0.24 25 / 0.2); background: oklch(58% 0.24 25 / 0.04);">
		<p class="text-sm font-medium" style="color: var(--color-error);">{data.error}</p>
	</div>
{:else if data.hits?.hits && data.hits.hits.length > 0}
	<div class="card animate-fade-in">
		<ul class="list-none p-0 m-0" style="border-top: 1px solid var(--color-border);">
			{#each data.hits.hits as hit, i}
				<li style="border-bottom: 1px solid var(--color-border);">
					<a href="/dashboard/pages/{hit.path_id}" class="list-row no-underline group">
						<div class="flex items-center gap-2.5 min-w-0 flex-1">
							<span class="list-index">{i + 1}</span>
							<span class="list-name font-mono group-hover:text-primary transition-colors">{hit.path}</span>
						</div>
						<span class="list-count">{hit.count.toLocaleString()}</span>
					</a>
				</li>
			{/each}
		</ul>
	</div>
{:else}
	<p class="text-sm py-10 text-center" style="color: var(--color-muted-foreground);">No page data available.</p>
{/if}
