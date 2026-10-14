// Run: node --experimental-strip-types src/lib/server/rocket-loader.check.ts
import assert from "node:assert/strict";
import { markScriptsForRocketLoader } from "./rocket-loader.ts";

async function run(chunks: string[]): Promise<string> {
  const encoder = new TextEncoder();
  const input = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(input.pipeThrough(markScriptsForRocketLoader())).text();
}

const page =
  '<p>ä</p><script nonce="a">x()</script><script nonce="b">y()</script>';
const marked =
  '<p>ä</p><script data-cfasync="false" nonce="a">x()</script>' +
  '<script data-cfasync="false" nonce="b">y()</script>';

assert.equal(await run([page]), marked);
// Every split point, including inside "<script" and inside the multi-byte ä.
const bytes = new TextEncoder().encode(page);
for (let i = 1; i < bytes.length; i++) {
  const decoder = new TextDecoder();
  const parts = [bytes.slice(0, i), bytes.slice(i)].map((b) =>
    decoder.decode(b, { stream: true })
  );
  assert.equal(await run(parts), marked, `split at byte ${i}`);
}
// A trailing "<" that never becomes a script tag is passed through.
assert.equal(await run(["a <", "b"]), "a <b");

console.log("rocket-loader: ok");
