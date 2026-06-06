// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock claude so the Anthropic SDK is never instantiated in tests (no API key needed).
vi.mock('@/lib/claude', () => ({ callClaudeJSON: vi.fn(), callClaude: vi.fn() }));

vi.mock('@/lib/vault-match/fingerprint', () => ({
  buildBriefFingerprint: vi.fn().mockResolvedValue({
    strategicProblem: 'p', audience: 'a', creativeJob: 'j', format: 'f', tone: 't',
  }),
}));
vi.mock('@/lib/vault-match/score', () => ({
  scoreAllConcepts: vi.fn().mockResolvedValue([]),
}));

import { POST } from '../vault/route';
import { scoreAllConcepts } from '@/lib/vault-match/score';
import vaultContent from '@/lib/vault-content.json';

afterEach(() => vi.clearAllMocks());

function req(body: unknown) {
  return new Request('http://x/api/vault', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/vault (match)', () => {
  it('returns ranked concepts from the scoring pipeline', async () => {
    const firstId = (vaultContent as { concepts: { id: string }[] }).concepts[0].id;
    (scoreAllConcepts as ReturnType<typeof vi.fn>).mockResolvedValue([
      { conceptId: firstId, scores: { problemScore: 90, audienceScore: 90, mechanismScore: 90, problemReason: 'r', audienceReason: 'r', mechanismReason: 'r' } },
    ]);
    const res = await POST(req({ mode: 'match', brief: 'b', briefSections: {}, insights: [], partnerType: 'destination', productionBudgetUsd: 100000 }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.rankedConcepts[0].conceptId).toBe(firstId);
    expect(data.rankedConcepts[0].confidence).toBe('strong');
  });

  it('still 400s on an invalid budget', async () => {
    const res = await POST(req({ mode: 'match', brief: 'b', briefSections: {}, insights: [], partnerType: 'destination', productionBudgetUsd: 10 }));
    expect(res.status).toBe(400);
  });
});
