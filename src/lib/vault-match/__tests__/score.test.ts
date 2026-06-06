import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../../claude', () => ({ callClaudeJSON: vi.fn() }));

import { scoreConcept, scoreAllConcepts } from '../score';
import { callClaudeJSON } from '../../claude';
import type { BriefFingerprint, ConceptFingerprint } from '../types';

afterEach(() => vi.restoreAllMocks());

const brief: BriefFingerprint = { strategicProblem: 'p', audience: 'a', creativeJob: 'j', format: 'f', tone: 't' };
const cfp: ConceptFingerprint = { strategicProblem: 'p', audience: 'a', creativeJob: 'j', mechanism: 'm', format: 'f' };

describe('scoreConcept', () => {
  it('returns clamped axis scores from the model', async () => {
    (callClaudeJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      problemScore: 120, problemReason: 'pr', audienceScore: -5, audienceReason: 'ar', mechanismScore: 60, mechanismReason: 'mr',
    });
    const s = await scoreConcept(brief, 'c1', cfp);
    expect(s.conceptId).toBe('c1');
    expect(s.scores.problemScore).toBe(100); // clamped
    expect(s.scores.audienceScore).toBe(0);  // clamped
    expect(s.scores.mechanismScore).toBe(60);
  });

  it('scores 0 with a logged reason when the call fails', async () => {
    (callClaudeJSON as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    const s = await scoreConcept(brief, 'c2', cfp);
    expect(s.scores.problemScore).toBe(0);
    expect(s.scores.audienceScore).toBe(0);
    expect(s.scores.mechanismScore).toBe(0);
  });
});

describe('scoreAllConcepts', () => {
  it('scores every concept and preserves ids', async () => {
    (callClaudeJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      problemScore: 50, problemReason: 'p', audienceScore: 50, audienceReason: 'a', mechanismScore: 50, mechanismReason: 'm',
    });
    const out = await scoreAllConcepts(brief, [
      { conceptId: 'a', fingerprint: cfp },
      { conceptId: 'b', fingerprint: cfp },
    ]);
    expect(out.map((o) => o.conceptId).sort()).toEqual(['a', 'b']);
  });
});
