<script lang="ts">
	import { goto } from '$app/navigation';
	import SEO from '$lib/components/SEO.svelte';
	import BarChart from '$lib/components/BarChart.svelte';
	import DateRangePicker from '$lib/components/DateRangePicker.svelte';

	let { data } = $props();
	let datePreset = $state('7d');

	$effect(() => { datePreset = data.range || '7d'; });

	function handleDateChange(preset: string) {
		datePreset = preset;
		goto(`/dashboard/campaigns?range=${preset}`, { replaceState: true });
	}
</script>

<SEO title="Campaigns — gtcd" description="Campaign breakdown for your GoatCounter site." />

<header class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8 animate-fade-in">
	<div>
		<p class="eyebrow mb-1.5">Breakdown</p>
		<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">Campaigns</h1>
		<p class="text-sm mt-1.5" style="color: var(--color-muted-foreground);">Which campaigns drive traffic.</p>
	</div>
	<DateRangePicker value={datePreset} onchange={handleDateChange} />
</header>

{#if data.error}
	<div class="rounded-2xl border p-5 animate-fade-in" style="border-color: oklch(58% 0.24 25 / 0.2); background: oklch(58% 0.24 25 / 0.04);">
		<p class="text-sm font-medium" style="color: var(--color-error);">{data.error}</p>
	</div>
{:else if data.stats?.stats}
	<div class="card animate-fade-in">
		<BarChart data={data.stats.stats} maxItems={50} />
	</div>
{:else}
	<p class="text-sm py-10 text-center" style="color: var(--color-muted-foreground);">No campaign data available.</p>
{/if}
