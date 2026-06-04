import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchWithRetry, isNetworkError } from '../fetch-with-retry';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('fetchWithRetry', () => {
  it('retries once on a network-layer rejection then succeeds', async () => {
    const ok = new Response('{}', { status: 200 });
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(ok);
    vi.stubGlobal('fetch', fetchMock);

    const res = await fetchWithRetry('/api/triage', {}, { retries: 1, retryDelayMs: 0 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
  });

  it('does NOT retry on an HTTP error response (server ran and replied)', async () => {
    const serverError = new Response('{"error":"x"}', { status: 500 });
    const fetchMock = vi.fn().mockResolvedValue(serverError);
    vi.stubGlobal('fetch', fetchMock);

    const res = await fetchWithRetry('/api/triage', {}, { retries: 1, retryDelayMs: 0 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(500);
  });

  it('throws the last error after exhausting retries', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchWithRetry('/api/triage', {}, { retries: 1, retryDelayMs: 0 }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('isNetworkError distinguishes network drops from thrown app errors', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkError(new Error('Failed to assess brief'))).toBe(false);
  });
});
