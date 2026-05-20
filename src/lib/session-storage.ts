// src/lib/session-storage.ts
// Per-briefId session persistence with localStorage, 30-day expiry.

import { SessionState } from './types';

const STORAGE_PREFIX = 'pitch-pack-session:';
const LEGACY_KEY = 'pitch-pack-session';
export const MIGRATED_FROM_LEGACY_KEY = 'pitch-pack-legacy-migrated-at';
const EXPIRY_DAYS = 30;

export interface StoredSession {
  state: SessionState;
  savedAt: string;
  expiresAt: string;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function expiry(): Date {
  return new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

function keyFor(briefId: string): string {
  return `${STORAGE_PREFIX}${briefId}`;
}

export function saveSession(state: SessionState): void {
  if (!isBrowser()) return;
  if (!state.briefId) {
    state.briefId = crypto.randomUUID();
  }
  const stored: StoredSession = {
    state,
    savedAt: new Date().toISOString(),
    expiresAt: expiry().toISOString(),
  };
  try {
    localStorage.setItem(keyFor(state.briefId), JSON.stringify(stored));
  } catch (err) {
    console.warn('Failed to save session:', err);
  }
}

export function getSessionByBriefId(briefId: string): StoredSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(keyFor(briefId));
    if (!raw) return null;
    const stored: StoredSession = JSON.parse(raw);
    if (new Date(stored.expiresAt) <= new Date()) {
      clearSession(briefId);
      return null;
    }
    return stored;
  } catch (err) {
    console.warn('Failed to load session:', err);
    clearSession(briefId);
    return null;
  }
}

export function listSessions(): { briefId: string; savedAt: string; expiresAt: string }[] {
  if (!isBrowser()) return [];
  const out: { briefId: string; savedAt: string; expiresAt: string }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const stored: StoredSession = JSON.parse(raw);
      if (new Date(stored.expiresAt) <= new Date()) continue;
      out.push({
        briefId: key.slice(STORAGE_PREFIX.length),
        savedAt: stored.savedAt,
        expiresAt: stored.expiresAt,
      });
    } catch { /* skip corrupted */ }
  }
  return out;
}

export function clearSession(briefId: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(keyFor(briefId));
  } catch { /* no-op */ }
}

/**
 * Migrates the legacy single-key session (pitch-pack-session) to a per-briefId entry.
 * Idempotent: only runs once, tracks completion with MIGRATED_FROM_LEGACY_KEY.
 * Returns the migrated session if found, null if no legacy data.
 */
export function migrateLegacySession(): StoredSession | null {
  if (!isBrowser()) return null;
  if (localStorage.getItem(MIGRATED_FROM_LEGACY_KEY)) return null;
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) {
    localStorage.setItem(MIGRATED_FROM_LEGACY_KEY, new Date().toISOString());
    return null;
  }
  try {
    const legacy: StoredSession = JSON.parse(raw);
    if (!legacy.state.briefId) {
      legacy.state.briefId = crypto.randomUUID();
    }
    saveSession(legacy.state);
    localStorage.removeItem(LEGACY_KEY);
    localStorage.setItem(MIGRATED_FROM_LEGACY_KEY, new Date().toISOString());
    return getSessionByBriefId(legacy.state.briefId);
  } catch {
    localStorage.removeItem(LEGACY_KEY);
    localStorage.setItem(MIGRATED_FROM_LEGACY_KEY, new Date().toISOString());
    return null;
  }
}

/**
 * Loads the most recently saved session, performing one-shot legacy migration if needed.
 * Used by the page on first mount to restore in-progress work.
 */
export function loadSession(): StoredSession | null {
  if (!isBrowser()) return null;
  // First-time migration
  const migrated = migrateLegacySession();
  if (migrated) return migrated;
  // Find the most recently saved valid session
  const sessions = listSessions();
  if (!sessions.length) return null;
  sessions.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  return getSessionByBriefId(sessions[0].briefId);
}

export function hasStoredSession(): boolean {
  return loadSession() !== null;
}

/**
 * Get time remaining on the most-recently-saved session in a human-readable format.
 */
export function getSessionTimeRemaining(): string | null {
  const session = loadSession();
  if (!session) return null;

  const expiresAt = new Date(session.expiresAt);
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();

  if (diffMs <= 0) return null;

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Get a display-friendly timestamp for when the most-recently-saved session was saved.
 */
export function getSessionSavedAt(): string | null {
  const session = loadSession();
  if (!session) return null;

  const savedAt = new Date(session.savedAt);
  const now = new Date();
  const diffMs = now.getTime() - savedAt.getTime();

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));

  if (minutes < 1) {
    return 'just now';
  } else if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  return savedAt.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
