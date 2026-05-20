import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveSession, loadSession, clearSession, listSessions, getSessionByBriefId, MIGRATED_FROM_LEGACY_KEY } from '../session-storage';
import { createInitialState } from '../types';

describe('session-storage per-briefId migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves under a per-briefId key', () => {
    const state = createInitialState();
    state.briefId = 'brief-123';
    saveSession(state);
    expect(localStorage.getItem('pitch-pack-session:brief-123')).toBeTruthy();
  });

  it('loads by briefId', () => {
    const state = createInitialState();
    state.briefId = 'brief-abc';
    state.brief = 'hello';
    saveSession(state);
    const loaded = getSessionByBriefId('brief-abc');
    expect(loaded?.state.brief).toBe('hello');
  });

  it('lists all session briefIds', () => {
    const a = createInitialState(); a.briefId = 'a'; saveSession(a);
    const b = createInitialState(); b.briefId = 'b'; saveSession(b);
    const briefs = listSessions();
    expect(briefs.map(s => s.briefId).sort()).toEqual(['a', 'b']);
  });

  it('respects the 30-day expiry on load', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-21T00:00:00Z'));
    const state = createInitialState();
    state.briefId = 'expires';
    saveSession(state);
    vi.setSystemTime(new Date('2026-06-21T00:00:01Z')); // 31 days later
    const loaded = getSessionByBriefId('expires');
    expect(loaded).toBeNull();
    vi.useRealTimers();
  });

  it('migrates the legacy single-key session on first load', () => {
    // Set up legacy format
    const legacyState = createInitialState();
    legacyState.briefId = ''; // legacy sessions may lack briefId
    legacyState.brief = 'legacy brief';
    localStorage.setItem('pitch-pack-session', JSON.stringify({
      state: legacyState,
      savedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    }));

    const loaded = loadSession();
    expect(loaded).not.toBeNull();
    expect(loaded?.state.brief).toBe('legacy brief');
    expect(loaded?.state.briefId).toBeTruthy(); // migration assigns one
    expect(localStorage.getItem('pitch-pack-session')).toBeNull(); // legacy cleared
    expect(localStorage.getItem(MIGRATED_FROM_LEGACY_KEY)).toBeTruthy();
  });

  it('clearSession clears only the named briefId', () => {
    const a = createInitialState(); a.briefId = 'keep'; saveSession(a);
    const b = createInitialState(); b.briefId = 'delete'; saveSession(b);
    clearSession('delete');
    expect(getSessionByBriefId('keep')).not.toBeNull();
    expect(getSessionByBriefId('delete')).toBeNull();
  });
});
