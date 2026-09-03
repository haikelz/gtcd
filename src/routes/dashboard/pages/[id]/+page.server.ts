import { getDateRange } from '$lib/server/helpers.js';
import * as stats from '$lib/server/goatcounter/stats.js';

export const load = async ({ params, url }) => {
	const preset = url.searchParams.get('range') || '7d';
	const { start, end } = getDateRange(preset);
	const pathId = Number(params.id);

	try {
		const [refs, hits] = await Promise.all([
			stats.getReferrals(pathId, start, end, 30),
			stats.getHits(start, end, 100)
		]);
		return { range: preset, refs, hits, pathId };
	} catch (e: unknown) {
		return { range: preset, error: e instanceof Error ? e.message : 'Failed', refs: null, hits: null, pathId };
	}
};
