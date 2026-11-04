/**
 * The Redis the suite writes fixture keys to. There is deliberately no
 * default: 127.0.0.1:6379 is often another project's Redis.
 */
export function testRedisUrl(): string {
  const url = process.env.TEST_REDIS_URL;
  if (!url) {
    throw new Error(
      "TEST_REDIS_URL is not set. Point it at a disposable Redis 7 the e2e " +
        "suite may write to, e.g. TEST_REDIS_URL=redis://127.0.0.1:16379/2."
    );
  }

  return url;
}
