// src/lib/read-json-stream.ts

import { CONNECTION_DROPPED_MESSAGE } from './fetch-with-retry';

type Settled<T> = { ok: true; data: T } | { ok: false; message: string };

/**
 * Read an NDJSON stream produced by streamJsonResponse() on the server.
 *
 * Heartbeat lines keep the connection alive (and optionally ping `onHeartbeat`);
 * the terminal line is either a result (returned) or an error (thrown with the
 * server's REAL message). If the stream drops before a terminal line arrives, it
 * throws a TypeError so the caller's isNetworkError() check maps it to the
 * "connection dropped, hit Retry" copy — matching the pre-streaming behaviour.
 */
export async function readJsonStream<T>(
  response: Response,
  onHeartbeat?: () => void,
): Promise<T> {
  if (!response.body) throw new TypeError(CONNECTION_DROPPED_MESSAGE);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let settled: Settled<T> | null = null;

  // Returns the terminal payload for this line, or null for heartbeats / blanks.
  const parseLine = (line: string): Settled<T> | null => {
    const trimmed = line.trim();
    if (!trimmed) return null;
    const msg = JSON.parse(trimmed);
    if (msg.type === 'result') return { ok: true, data: msg.data as T };
    if (msg.type === 'error') return { ok: false, message: String(msg.message) };
    if (msg.type === 'heartbeat') onHeartbeat?.();
    return null;
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        settled = parseLine(buffer.slice(0, nl)) ?? settled;
        buffer = buffer.slice(nl + 1);
      }
      if (done) break;
    }
    // Flush any trailing line with no newline terminator.
    settled = parseLine(buffer) ?? settled;
  } catch {
    // reader.read() rejecting means the connection dropped mid-stream. If we already
    // have a terminal result/error, use it; otherwise treat it as a dropped connection.
    if (settled === null) throw new TypeError(CONNECTION_DROPPED_MESSAGE);
  }

  if (settled === null) throw new TypeError(CONNECTION_DROPPED_MESSAGE);
  if (!settled.ok) throw new Error(settled.message);
  return settled.data;
}
