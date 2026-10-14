// No imports: src/lib/server/rocket-loader.check.ts runs this file directly
// with node --experimental-strip-types.

const TAG = "<script";
const MARKED = '<script data-cfasync="false"';

/**
 * Add data-cfasync="false" to every <script> in an HTML stream, including the
 * chunks SvelteKit streams after the page for unresolved load promises.
 * Cloudflare Rocket Loader skips marked scripts; otherwise it re-injects them
 * without their CSP nonce and the browser blocks them.
 */
export function markScriptsForRocketLoader(): TransformStream<
  Uint8Array,
  Uint8Array
> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let carry = "";

  return new TransformStream({
    transform(chunk, controller) {
      const text = carry + decoder.decode(chunk, { stream: true });
      // A chunk can end inside "<script"; hold that tail for the next one.
      const lt = text.lastIndexOf("<");
      const cut = lt !== -1 && text.length - lt < TAG.length ? lt : text.length;

      carry = text.slice(cut);
      controller.enqueue(
        encoder.encode(text.slice(0, cut).replaceAll(TAG, MARKED))
      );
    },
    flush(controller) {
      const text = carry + decoder.decode();
      if (text)
        controller.enqueue(encoder.encode(text.replaceAll(TAG, MARKED)));
    },
  });
}
