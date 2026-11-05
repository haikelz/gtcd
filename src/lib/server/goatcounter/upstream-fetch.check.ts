// Run: node --experimental-strip-types src/lib/server/goatcounter/upstream-fetch.check.ts
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { upstreamFetch } from "./upstream-fetch.ts";

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    if (req.url === "/slow") return; // never answers
    res.setHeader("Set-Cookie", ["a=1; Path=/", "b=2; Path=/"]);
    res.statusCode = req.url === "/login" ? 303 : 200;
    if (res.statusCode === 303) res.setHeader("Location", "/");
    res.end(
      JSON.stringify({
        body,
        contentType: req.headers["content-type"] ?? null,
        host: req.headers.host,
        method: req.method,
      })
    );
  });
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

// The vhost reaches the server; Node's fetch alone would send 127.0.0.1:port.
const get = await upstreamFetch(`${base}/api`, {
  headers: { Authorization: "Bearer k", Host: "stats.example.com" },
});
assert.equal(get.status, 200);
assert.equal((await get.json()).host, "stats.example.com");
assert.deepEqual(get.headers.getSetCookie(), ["a=1; Path=/", "b=2; Path=/"]);

// Form posts keep their body and content type; redirects stay manual.
const post = await upstreamFetch(`${base}/login`, {
  body: new URLSearchParams({ email: "a@b.co", password: "x" }),
  headers: { Host: "stats.example.com" },
  method: "POST",
  redirect: "manual",
});
assert.equal(post.status, 303);
assert.equal(post.headers.get("location"), "/");
const echoed = await post.json();
assert.equal(echoed.body, "email=a%40b.co&password=x");
assert.match(echoed.contentType, /^application\/x-www-form-urlencoded/);

// A timeout rejects the way fetch does, so callers can skip retrying it.
await assert.rejects(
  upstreamFetch(`${base}/slow`, {
    headers: { Host: "stats.example.com" },
    signal: AbortSignal.timeout(100),
  }),
  { name: "TimeoutError" }
);

// A refused connection rejects like fetch, without the internal address.
await assert.rejects(
  upstreamFetch("http://127.0.0.1:1/api", {
    headers: { Host: "stats.example.com" },
  }),
  (error: unknown) =>
    error instanceof TypeError &&
    error.message === "fetch failed" &&
    (error.cause as NodeJS.ErrnoException).code === "ECONNREFUSED"
);

// Without a different Host it is plain fetch.
const plain = await upstreamFetch(`${base}/api`);
assert.equal((await plain.json()).host, new URL(base).host);

server.closeAllConnections();
server.close();
console.log("upstream-fetch: ok");
