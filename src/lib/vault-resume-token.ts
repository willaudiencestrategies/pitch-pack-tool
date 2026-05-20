import { SessionState } from './types';

/**
 * Selects the subset of SessionState worth carrying through a resume token.
 * Keeps anything the CP needs to resume the brief after a client rejection.
 * Omits ephemeral UI state (loading, error, history).
 */
type ResumeSlice = Pick<SessionState,
  | 'briefId'
  | 'brief'
  | 'briefFilename'
  | 'additionalContext'
  | 'triageResult'
  | 'sections'
  | 'brandAlignment'
  | 'budgetDetails'
  | 'audienceMenu'
  | 'selectedAudienceSegment'
  | 'personification'
  | 'audiencePrioritisation'
  | 'audienceBranches'
  | 'currentBranchIndex'
  | 'insightOptions'
  | 'selectedInsights'
  | 'productionBudgetUsd'
  | 'partnerType'
  | 'vaultAudienceBranchIndex'
  | 'vaultMatchPreview'
  | 'vaultResult'
>;

const SLICE_KEYS: (keyof ResumeSlice)[] = [
  'briefId',
  'brief',
  'briefFilename',
  'additionalContext',
  'triageResult',
  'sections',
  'brandAlignment',
  'budgetDetails',
  'audienceMenu',
  'selectedAudienceSegment',
  'personification',
  'audiencePrioritisation',
  'audienceBranches',
  'currentBranchIndex',
  'insightOptions',
  'selectedInsights',
  'productionBudgetUsd',
  'partnerType',
  'vaultAudienceBranchIndex',
  'vaultMatchPreview',
  'vaultResult',
];

function toBase64(input: string): string {
  if (typeof window !== 'undefined' && window.btoa) {
    // URL-safe base64
    return window.btoa(unescape(encodeURIComponent(input)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return Buffer.from(input, 'utf8').toString('base64url');
}

function fromBase64(input: string): string {
  const restored = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = restored + '='.repeat((4 - restored.length % 4) % 4);
  if (typeof window !== 'undefined' && window.atob) {
    return decodeURIComponent(escape(window.atob(padded)));
  }
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function encodeResumeToken(state: SessionState): string {
  const slice: Partial<ResumeSlice> = {};
  for (const key of SLICE_KEYS) {
    (slice as any)[key] = state[key];
  }
  const json = JSON.stringify(slice);
  return toBase64(json);
}

export function decodeResumeToken(token: string): ResumeSlice | null {
  try {
    if (!token) return null;
    const json = fromBase64(token);
    return JSON.parse(json) as ResumeSlice;
  } catch {
    return null;
  }
}

export function buildResumeUrl(baseUrl: string, state: SessionState): string {
  const token = encodeResumeToken(state);
  try {
    const parsed = new URL(baseUrl);
    parsed.searchParams.set('resume', token);
    return parsed.toString();
  } catch {
    const sep = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${sep}resume=${token}`;
  }
}

export function extractResumeToken(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('resume');
  } catch {
    return null;
  }
}
