// src/lib/session-storage.ts
// Session persistence with localStorage

import { SessionState, createInitialState } from './types';

const STORAGE_KEY = 'pitch-pack-session';
const EXPIRY_HOURS = 24;

export interface StoredSession {
  state: SessionState;
  savedAt: string;
  expiresAt: string;
}

/**
 * Save session state to localStorage with 24-hour expiry
 */
export function saveSession(state: SessionState): void {
  if (typeof window === 'undefined') return;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + EXPIRY_HOURS * 60 * 60 * 1000);

  const storedSession: StoredSession = {
    state,
    savedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedSession));
  } catch (error) {
    // localStorage might be full or disabled
    console.warn('Failed to save session:', error);
  }
}

/**
 * Load session from localStorage if not expired
 * Returns null if no valid session exists
 */
export function loadSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const session: StoredSession = JSON.parse(stored);

    // Check expiry
    if (new Date(session.expiresAt) <= new Date()) {
      clearSession();
      return null;
    }

    return session;
  } catch (error) {
    // Corrupted data
    console.warn('Failed to load session:', error);
    clearSession();
    return null;
  }
}

/**
 * Remove session from localStorage
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear session:', error);
  }
}

/**
 * Check if a valid (non-expired) session exists
 */
export function hasStoredSession(): boolean {
  return loadSession() !== null;
}

/**
 * Get time remaining on session in a human-readable format
 */
export function getSessionTimeRemaining(): string | null {
  const session = loadSession();
  if (!session) return null;

  const expiresAt = new Date(session.expiresAt);
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();

  if (diffMs <= 0) return null;

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Get a display-friendly timestamp for when session was saved
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
