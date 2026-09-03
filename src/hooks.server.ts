import type { Handle } from '@sveltejs/kit';
import { getDashboardSession } from '$lib/server/auth/session.js';

export const handle: Handle = async ({ event, resolve }) => {
	// Validate session on every request
	event.locals.user = await getDashboardSession(event.cookies);

	return resolve(event);
};
