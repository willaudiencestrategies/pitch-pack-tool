import { describe, it, expect, vi } from 'vitest';
import { streamJsonResponse } from '../stream-response';
import { readJsonStream } from '../read-json-stream';
import { CONNECTION_DROPPED_MESSAGE } from '../fetch-with-retry';

describe('streamJsonResponse + readJsonStream round-trip', () => {
  it('streams a heartbeat first, then delivers the result payload', async () => {
    const res = streamJsonResponse(async () => ({ hello: 'world', n: 42 }));
    expect(res.headers.get('Content-Type')).toContain('application/x-ndjson');

    const onHeartbeat = vi.fn();
    const data = await readJsonStream<{ hello: string; n: number }>(res, onHeartbeat);

    expect(data).toEqual({ hello: 'world', n: 42 });
    // The immediate t:0 heartbeat flushes before the result — keeps the socket alive.
    expect(onHeartbeat).toHaveBeenCalled();
  });

  it('surfaces the REAL error message instead of a generic one', async () => {
    const res = streamJsonResponse(async () => {
      throw new Error('Claude API error (529): overloaded');
    });

    await expect(readJsonStream(res)).rejects.toThrow('Claude API error (529): overloaded');
  });

  it('calls onError with the thrown error (for server-side logging)', async () => {
    const onError = vi.fn();
    const res = streamJsonResponse(
      async () => { throw new Error('boom'); },
      { onError },
    );
    await expect(readJsonStream(res)).rejects.toThrow('boom');
    expect(onError).toHaveBeenCalledOnce();
  });

  it('treats a stream with no terminal line as a dropped connection', async () => {
    // A body that ends without a result/error line simulates a mid-flight drop.
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(JSON.stringify({ type: 'heartbeat' }) + '\n'));
        controller.close();
      },
    });
    const res = new Response(body);
    await expect(readJsonStream(res)).rejects.toThrow(CONNECTION_DROPPED_MESSAGE);
  });
});
