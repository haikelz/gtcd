import { getDateRange } from '$lib/server/helpers.js';
import * as stats from '$lib/server/goatcounter/stats.js';

export const load = async ({ url }) => {
	const preset = url.searchParams.get('range') || '7d';
	const { start, end } = getDateRange(preset);

	try {
		const hits = await stats.getHits(start, end, 100);
		return { range: preset, hits };
	} catch (e: unknown) {
		return { range: preset, error: e instanceof Error ? e.message : 'Failed', hits: null };
	}
};
