import { pathToFileURL } from "node:url";

/** Read-only delivery probe. Cookie and HTML contents never enter its output. */
export async function measureDelivery(input, cookie = "") {
  const url = new URL(input);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Use an HTTP(S) URL");
  const start = performance.now();
  const response = await fetch(url, {
    headers: {
      "Accept-Encoding": "gzip, br",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok || !response.body)
    throw new Error(`HTML request failed (${response.status})`);
  const reader = response.body.getReader();
  const chunks = [];
  let firstChunkMs = null;
  let decodedBytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    firstChunkMs ??= Math.round(performance.now() - start);
    decodedBytes += value.byteLength;
    if (decodedBytes > 5_000_000) {
      await reader.cancel();
      throw new Error("HTML exceeds the 5 MB delivery probe limit");
    }
    chunks.push(Buffer.from(value));
  }
  const totalMs = Math.round(performance.now() - start);
  const html = Buffer.concat(chunks).toString("utf8");
  const script =
    html.match(/(?:href|src)="([^"]+\.js)"/) ??
    html.match(/\bimport\(["']([^"']+\.js)["']\)/);
  let asset = null;
  if (script) {
    const assetUrl = new URL(script[1], url);
    if (assetUrl.origin !== url.origin)
      throw new Error("Expected a same-origin script asset");
    const result = await fetch(assetUrl, {
      headers: { "Accept-Encoding": "br, gzip" },
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    await result.arrayBuffer();
    asset = {
      status: result.status,
      encoding: result.headers.get("content-encoding"),
      cacheControl: result.headers.get("cache-control"),
    };
  }
  return {
    html: {
      status: response.status,
      encoding: response.headers.get("content-encoding"),
      firstChunkMs,
      totalMs,
      decodedBytes,
    },
    asset,
  };
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  try {
    if (!process.argv[2])
      throw new Error("Usage: node scripts/check-delivery.mjs <URL>");
    console.log(
      JSON.stringify(
        await measureDelivery(process.argv[2], process.env.GTCD_AUDIT_COOKIE),
        null,
        2
      )
    );
  } catch {
    console.error(
      "Delivery probe failed. Check the URL, authentication, redirects, and connectivity."
    );
    process.exitCode = 1;
  }
}
