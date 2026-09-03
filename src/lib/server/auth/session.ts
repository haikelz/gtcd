import { randomBytes } from 'crypto';
import type { Cookies } from '@sveltejs/kit';
import {
	createSession,
	getSession,
	deleteSession
} from './session-store.js';

const COOKIE_NAME = 'dashboard_session';

export interface SessionUser {
	email: string;
}

export function generateSessionId(): string {
	return randomBytes(32).toString('hex');
}

export async function createDashboardSession(
	cookies: Cookies,
	email: string
): Promise<void> {
	const sessionId = generateSessionId();

	await createSession(sessionId, email);

	cookies.set(COOKIE_NAME, sessionId, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 7 // 7 days
	});
}

export async function getDashboardSession(
	cookies: Cookies
): Promise<SessionUser | null> {
	const sessionId = cookies.get(COOKIE_NAME);
	if (!sessionId) return null;

	const session = await getSession(sessionId);
	if (!session) {
		cookies.delete(COOKIE_NAME, { path: '/' });
		return null;
	}

	return { email: session.email };
}

export async function destroyDashboardSession(
	cookies: Cookies
): Promise<void> {
	const sessionId = cookies.get(COOKIE_NAME);
	if (sessionId) {
		await deleteSession(sessionId);
	}
	cookies.delete(COOKIE_NAME, { path: '/' });
}
