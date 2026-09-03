import { getDateRange } from '$lib/server/helpers.js';
import * as stats from '$lib/server/goatcounter/stats.js';

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export const load = async ({ url }) => {
	const preset = url.searchParams.get('range') || '7d';
	const { start, end } = getDateRange(preset);

	try {
		const total = await stats.getTotal(start, end);
		await delay(100);
		const hits = await stats.getHits(start, end, 20);
		await delay(100);
		const browsers = await stats.getStats('browsers', start, end, 15);
		await delay(100);
		const systems = await stats.getStats('systems', start, end, 15);
		await delay(100);
		const locations = await stats.getStats('locations', start, end, 15);
		await delay(100);
		const languages = await stats.getStats('languages', start, end, 15);
		await delay(100);
		const sizes = await stats.getStats('sizes', start, end, 15);

		return {
			range: preset,
			total,
			hits,
			browsers,
			systems,
			locations,
			languages,
			sizes
		};
	} catch (e: unknown) {
		return {
			range: preset,
			error: e instanceof Error ? e.message : 'Failed to load data',
			total: null,
			hits: null,
			browsers: null,
			systems: null,
			locations: null,
			languages: null,
			sizes: null
		};
	}
};
