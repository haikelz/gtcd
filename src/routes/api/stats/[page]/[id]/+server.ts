import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDashboardSession } from '$lib/server/auth/session.js';
import { getStatsDetail } from '$lib/server/goatcounter/stats.js';
import { getDateRange } from '$lib/server/helpers.js';
import type { StatsPage } from '$lib/server/goatcounter/types.js';

export const GET: RequestHandler = async ({ params, cookies, url }) => {
	try {
		const session = await getDashboardSession(cookies);
		if (!session) {
			return json({ error: 'Not authenticated' }, { status: 401 });
		}

		const preset = url.searchParams.get('range') || '7d';
		const { start, end } = getDateRange(preset);
		const page = params.page as StatsPage;
		const id = params.id;

		const detail = await getStatsDetail(page, id, start, end, 20);
		return json(detail);
	} catch (e: unknown) {
		const status = e instanceof Error && e.message === 'Not authenticated' ? 401 : 500;
		return json({ error: e instanceof Error ? e.message : 'Internal error' }, { status });
	}
};
