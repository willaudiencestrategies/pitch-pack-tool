// src/lib/stream-response.ts

/**
 * Run a long async task behind a streamed NDJSON response.
 *
 * The problem this solves: a single blocking ~60-90s call returns nothing until it
 * finishes, so a proxy/edge sitting between the browser and the app sees a silent
 * connection and kills it with a 502/504 — surfacing to the user as "fail to load".
 *
 * This streams a heartbeat line immediately and then every `heartbeatMs`, so bytes
 * are always flowing and the connection reads as alive. When the work resolves it
 * emits a single terminal line:
 *   {"type":"result","data":<payload>}   on success
 *   {"type":"error","message":<string>}  on failure (the REAL error, not a generic one)
 *
 * Pair with readJsonStream() on the client.
 */
export function streamJsonResponse<T>(
  work: () => Promise<T>,
  opts: { heartbeatMs?: number; onError?: (error: unknown) => void } = {},
): Response {
  const heartbeatMs = opts.heartbeatMs ?? 10000;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (obj: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      };

      // First byte right away: flushes headers and marks the socket active.
      send({ type: 'heartbeat', t: 0 });
      const heartbeat = setInterval(() => send({ type: 'heartbeat' }), heartbeatMs);

      try {
        const result = await work();
        send({ type: 'result', data: result });
      } catch (error) {
        opts.onError?.(error);
        send({
          type: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        clearInterval(heartbeat);
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      // Defeat proxy/CDN buffering so heartbeats actually reach the client.
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  });
}
