<script lang="ts">
	let {
		label,
		value,
		subtext,
		icon,
		trend
	}: {
		label: string;
		value: string | number;
		subtext?: string;
		icon?: string;
		trend?: { value: string; direction: 'up' | 'down' };
	} = $props();
</script>

<div class="stat-card">
	<div class="flex items-start justify-between mb-3">
		<p class="stat-label">{label}</p>
		{#if icon}
			<div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
				{@html icon}
			</div>
		{/if}
	</div>
	<div class="flex items-end gap-3">
		<p class="stat-value">{value}</p>
		{#if trend}
			<span class="stat-change {trend.direction === 'up' ? 'positive' : 'negative'} mb-1">
				{trend.direction === 'up' ? '↑' : '↓'} {trend.value}
			</span>
		{/if}
	</div>
	{#if subtext}
		<p class="text-muted-foreground text-xs mt-2">{subtext}</p>
	{/if}
</div>
