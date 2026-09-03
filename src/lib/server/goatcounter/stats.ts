import { gcFetch } from './client.js';
import type {
	GoatCounterUser,
	CountTotalResponse,
	HitsResponse,
	StatsResponse,
	RefsResponse,
	StatsPage
} from './types.js';

export async function getMe(): Promise<GoatCounterUser> {
	return gcFetch<GoatCounterUser>('/api/v0/me');
}

export async function getTotal(
	start?: string,
	end?: string
): Promise<CountTotalResponse> {
	return gcFetch<CountTotalResponse>('/api/v0/stats/total', {}, { start, end });
}

export async function getHits(
	start?: string,
	end?: string,
	limit?: number,
	excludePaths?: string,
	pathByName?: boolean
): Promise<HitsResponse> {
	return gcFetch<HitsResponse>('/api/v0/stats/hits', {}, {
		start,
		end,
		limit: limit?.toString(),
		exclude_paths: excludePaths,
		path_by_name: pathByName ? 'true' : undefined
	});
}

export async function getReferrals(
	pathId: number,
	start?: string,
	end?: string,
	limit?: number
): Promise<RefsResponse> {
	return gcFetch<RefsResponse>(`/api/v0/stats/hits/${pathId}`, {}, {
		start,
		end,
		limit: limit?.toString()
	});
}

export async function getStats(
	page: StatsPage,
	start?: string,
	end?: string,
	limit?: number,
	offset?: number
): Promise<StatsResponse> {
	return gcFetch<StatsResponse>(`/api/v0/stats/${page}`, {}, {
		start,
		end,
		limit: limit?.toString(),
		offset: offset?.toString()
	});
}

export async function getStatsDetail(
	page: StatsPage,
	id: string,
	start?: string,
	end?: string,
	limit?: number
): Promise<StatsResponse> {
	return gcFetch<StatsResponse>(`/api/v0/stats/${page}/${id}`, {}, {
		start,
		end,
		limit: limit?.toString()
	});
}

export async function getPaths(
	limit?: number,
	after?: number
): Promise<{ paths: { id: number; path: string; title: string; event: boolean }[]; more: boolean }> {
	return gcFetch('/api/v0/paths', {}, {
		limit: limit?.toString(),
		after: after?.toString()
	});
}
