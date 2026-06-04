/**
 * fetch wrapper that retries on a NETWORK-LAYER failure — the fetch promise
 * rejecting (a TypeError such as "Failed to fetch"), which happens when the
 * connection is dropped mid-flight before any response arrives (a proxy/edge
 * timeout on a long silent request, or a deploy restarting the container).
 *
 * It deliberately does NOT retry on an HTTP error response (4xx/5xx): those mean
 * the server actually ran and replied, so retrying just burns another long call.
 * The caller still inspects `response.ok` as before.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  opts: { retries?: number; retryDelayMs?: number } = {},
): Promise<Response> {
  const retries = opts.retries ?? 1;
  const retryDelayMs = opts.retryDelayMs ?? 1500;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err) {
      // fetch only rejects on a network-layer failure; an HTTP error still resolves.
      lastError = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }
  throw lastError;
}

/** A failed fetch (connection dropped) surfaces as a TypeError in the browser. */
export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError;
}

/** User-facing copy for a dropped connection, in place of the raw "Failed to fetch". */
export const CONNECTION_DROPPED_MESSAGE =
  'The connection dropped before the assessment finished. Longer briefs can take a few minutes, so please hit Retry to try again.';
