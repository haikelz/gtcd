import { getDateRange } from '$lib/server/helpers.js';
import * as stats from '$lib/server/goatcounter/stats.js';
import type { StatsPage } from '$lib/server/goatcounter/types.js';

export const load = async ({ url }) => {
	const preset = url.searchParams.get('range') || '7d';
	const { start, end } = getDateRange(preset);

	try {
		const result = await stats.getStats('systems' as StatsPage, start, end, 50);
		return { range: preset, stats: result };
	} catch (e: unknown) {
		return { range: preset, error: e instanceof Error ? e.message : 'Failed', stats: null };
	}
};
