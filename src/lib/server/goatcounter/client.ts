import { GOATCOUNTER_API_KEY, GOATCOUNTER_URL } from "$env/static/private";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getBaseUrl(): string {
  return GOATCOUNTER_URL.replace(/\/+$/, "");
}

export async function gcFetch<T>(
  path: string,
  init: RequestInit = {},
  params?: Record<string, string | undefined>
): Promise<T> {
  const url = new URL(`${getBaseUrl()}${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GOATCOUNTER_API_KEY}`,
          ...init.headers,
        },
      });

      if (response.status === 429) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        const retryAfter = response.headers.get("Retry-After");
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
        await sleep(waitMs);
        continue;
      }

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: response.statusText }));
        throw new Error(error.error || `API error: ${response.status}`);
      }

      return await response.json();
    } catch (e) {
      if (e instanceof Error) {
        lastError = e;
        if (
          e.message.includes("401") ||
          e.message.includes("Not authenticated")
        ) {
          throw e;
        }
      }
      if (attempt < MAX_RETRIES) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
      }
    }
  }

  throw lastError || new Error("Request failed after retries");
}

export async function gcFetchRaw(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const url = `${getBaseUrl()}${path}`;

  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GOATCOUNTER_API_KEY}`,
      ...init.headers,
    },
  });
}
