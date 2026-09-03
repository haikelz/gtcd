<script lang="ts">
	import type { HitStat } from '$lib/types';

	let {
		data,
		maxItems = 15,
		onItemClick
	}: {
		data: HitStat[];
		maxItems?: number;
		onItemClick?: (id: string, name: string) => void;
	} = $props();

	const items = $derived(data.slice(0, maxItems));
	const maxCount = $derived(Math.max(...items.map((d) => d.count), 1));
	const total = $derived(data.reduce((sum, d) => sum + d.count, 0));
</script>

<ul class="list-none p-0 m-0 space-y-1">
	{#each items as item, i}
		{@const pct = (item.count / maxCount) * 100}
		{@const share = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0'}
		<li class="group">
			<button
				class="w-full cursor-pointer text-left rounded-xl px-3 py-2.5 transition-all duration-200"
				style="background: transparent;"
				onmouseenter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--color-base-200)'}
				onmouseleave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
				onclick={() => onItemClick?.(item.id, item.name)}
			>
				<div class="flex items-center justify-between mb-1.5">
					<span class="text-sm font-medium truncate pr-3" style="color: var(--color-foreground);">{item.name}</span>
					<div class="flex items-center gap-2 shrink-0">
						<span class="text-sm font-semibold tabular-nums" style="color: var(--color-foreground);">{item.count.toLocaleString()}</span>
						<span class="text-xs tabular-nums w-10 text-right" style="color: var(--color-muted-foreground);">{share}%</span>
					</div>
				</div>
				<div class="w-full h-1.5 rounded-full overflow-hidden" style="background: var(--color-base-200);">
					<div
						class="h-full rounded-full animate-slide-in-bar"
						style="width: {pct}%; background: linear-gradient(90deg, var(--color-primary), color-mix(in oklch, var(--color-primary) 70%, oklch(70% 0.18 155))); animation-delay: {i * 30}ms;"
					></div>
				</div>
			</button>
		</li>
	{/each}

	{#if data.length > maxItems}
		<li class="pt-2">
			<p class="text-xs text-center font-medium" style="color: var(--color-muted-foreground);">+{data.length - maxItems} more</p>
		</li>
	{/if}
</ul>
