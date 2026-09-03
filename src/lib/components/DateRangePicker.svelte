<script lang="ts">
	let {
		value = '7d',
		onchange
	}: {
		value?: string;
		onchange?: (preset: string) => void;
	} = $props();

	const presets = [
		{ label: 'Today', value: 'today' },
		{ label: '7 days', value: '7d' },
		{ label: '30 days', value: '30d' },
		{ label: '90 days', value: '90d' },
		{ label: 'Month', value: 'month' }
	];
</script>

<div class="inline-flex flex-wrap items-center rounded-xl p-0.5 gap-0.5" style="background: var(--color-base-200);">
	{#each presets as preset}
		<button
			class="px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap cursor-pointer"
			style={value === preset.value
				? 'background: var(--color-base-100); color: var(--color-foreground); box-shadow: 0 1px 3px oklch(0% 0 0 / 0.06);'
				: 'background: transparent; color: var(--color-muted-foreground);'}
			onclick={() => {
				value = preset.value;
				onchange?.(preset.value);
			}}
		>
			{preset.label}
		</button>
	{/each}
</div>
