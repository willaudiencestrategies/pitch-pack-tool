// src/lib/analytics.ts

import { BriefScore, SessionState, GATE1_SECTION_KEYS, Status, Gate1SectionKey } from './types';

/**
 * Generate a unique session ID for analytics tracking
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Capture the current brief score from session state
 */
export function captureBriefScore(state: SessionState): BriefScore {
  const gate1Scores: Record<string, Status> = {};

  for (const key of GATE1_SECTION_KEYS) {
    const section = state.sections.find(s => s.key === key);
    if (section) {
      gate1Scores[key] = section.status;
    }
  }

  return {
    sessionId: generateSessionId(),
    sellerName: state.briefScore?.sellerName,
    briefFilename: state.briefScore?.briefFilename,
    timestamp: new Date().toISOString(),
    gate1Scores: gate1Scores as Record<Gate1SectionKey, Status>,
    gate1OverallHealth: state.triageResult?.overallBriefHealth || '',
    completedSteps: [],
    timeSpentSeconds: state.briefScore?.timeSpentSeconds,
  };
}

/**
 * Log analytics data to console and localStorage
 * Keeps the last 100 sessions to prevent unbounded growth
 */
export function logAnalytics(score: BriefScore): void {
  console.log('[Analytics]', score);

  try {
    const existing = JSON.parse(localStorage.getItem('pitch_pack_analytics') || '[]');
    existing.push(score);
    // Keep only the last 100 sessions
    localStorage.setItem('pitch_pack_analytics', JSON.stringify(existing.slice(-100)));
  } catch (e) {
    console.warn('Failed to store analytics:', e);
  }
}
