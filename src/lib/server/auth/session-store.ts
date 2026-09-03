import Redis from 'ioredis';
import { building } from '$app/environment';

let redis: Redis | null = null;

export function getRedis(): Redis {
	if (redis) return redis;

	if (building) {
		throw new Error('Redis should not be accessed during build');
	}

	const url = process.env.REDIS_URL || 'redis://localhost:6379';
	redis = new Redis(url);
	return redis;
}

const SESSION_PREFIX = 'session:';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export async function createSession(
	sessionId: string,
	email: string
): Promise<void> {
	const client = getRedis();
	const data = JSON.stringify({ email });
	await client.setex(`${SESSION_PREFIX}${sessionId}`, SESSION_MAX_AGE, data);
}

export async function getSession(
	sessionId: string
): Promise<{ email: string } | null> {
	const client = getRedis();
	const data = await client.get(`${SESSION_PREFIX}${sessionId}`);
	if (!data) return null;
	return JSON.parse(data) as { email: string };
}

export async function deleteSession(sessionId: string): Promise<void> {
	const client = getRedis();
	await client.del(`${SESSION_PREFIX}${sessionId}`);
}
