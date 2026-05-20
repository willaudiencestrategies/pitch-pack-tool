import { describe, it, expect } from 'vitest';
import { encodeResumeToken, decodeResumeToken, buildResumeUrl, extractResumeToken } from '../vault-resume-token';
import { createInitialState } from '../types';

describe('vault-resume-token', () => {
  it('encodes and decodes a state slice roundtrip', () => {
    const state = createInitialState();
    state.brief = 'Test brief content';
    state.briefId = 'b-1';
    const token = encodeResumeToken(state);
    const decoded = decodeResumeToken(token);
    expect(decoded?.brief).toBe('Test brief content');
    expect(decoded?.briefId).toBe('b-1');
  });

  it('rejects malformed tokens', () => {
    expect(decodeResumeToken('not-base64-json')).toBeNull();
    expect(decodeResumeToken('')).toBeNull();
  });

  it('builds a resume URL with the token attached', () => {
    const state = createInitialState();
    state.brief = 'hi';
    const url = buildResumeUrl('https://pitch-pack-tool-production.up.railway.app', state);
    expect(url).toMatch(/^https:\/\/pitch-pack-tool-production\.up\.railway\.app\/\?resume=/);
  });

  it('extracts the token from a resume URL', () => {
    const state = createInitialState();
    state.brief = 'roundtrip';
    const url = buildResumeUrl('https://example.com', state);
    const token = extractResumeToken(url);
    expect(token).not.toBeNull();
    const decoded = decodeResumeToken(token!);
    expect(decoded?.brief).toBe('roundtrip');
  });

  it('returns null when no token in URL', () => {
    expect(extractResumeToken('https://example.com/')).toBeNull();
    expect(extractResumeToken('https://example.com/?other=foo')).toBeNull();
  });
});
