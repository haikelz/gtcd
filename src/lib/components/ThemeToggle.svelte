<script lang="ts">
	import { onMount } from 'svelte';

	type Theme = 'light' | 'dark' | 'system';

	let currentTheme = $state<Theme>('system');
	let mounted = $state(false);

	function getSystemTheme(): 'light' | 'dark' {
		if (typeof window === 'undefined') return 'light';
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	function applyTheme(theme: Theme) {
		const resolved = theme === 'system' ? getSystemTheme() : theme;
		document.documentElement.setAttribute('data-theme', resolved === 'dark' ? 'gtcd-dark' : 'gtcd-light');
	}

	function setTheme(theme: Theme) {
		currentTheme = theme;
		localStorage.setItem('gtcd_theme', theme);
		applyTheme(theme);
	}

	const themes: { value: Theme; label: string; icon: string }[] = [
		{
			value: 'light',
			label: 'Light',
			icon: `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>`
		},
		{
			value: 'dark',
			label: 'Dark',
			icon: `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>`
		},
		{
			value: 'system',
			label: 'Auto',
			icon: `<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" /></svg>`
		}
	];

	onMount(() => {
		const saved = localStorage.getItem('gtcd_theme') as Theme | null;
		currentTheme = saved || 'system';
		applyTheme(currentTheme);
		mounted = true;

		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const handler = () => {
			if (currentTheme === 'system') applyTheme('system');
		};
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	});
</script>

{#if mounted}
	<div class="inline-flex items-center bg-base-200 rounded-lg p-0.5 gap-0.5">
		{#each themes as theme}
			<button
				class="relative flex items-center justify-center w-7 h-7 sm:w-auto sm:h-auto sm:items-center sm:gap-1.5 sm:px-2.5 sm:py-1.5 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer {currentTheme === theme.value ? 'bg-base-100 text-base-content shadow-sm' : 'text-base-content/50 hover:text-base-content'}"
				onclick={() => setTheme(theme.value)}
				aria-label="{theme.label} theme"
			>
				{@html theme.icon}
				<span class="hidden sm:inline">{theme.label}</span>
			</button>
		{/each}
	</div>
{/if}
