import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { destroyDashboardSession } from '$lib/server/auth/session.js';

export const POST: RequestHandler = async ({ cookies }) => {
	await destroyDashboardSession(cookies);
	throw redirect(302, '/login');
};
