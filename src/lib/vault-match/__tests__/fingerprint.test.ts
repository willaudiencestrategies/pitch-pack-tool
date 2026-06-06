import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../../claude', () => ({ callClaudeJSON: vi.fn() }));

import { buildBriefFingerprint } from '../fingerprint';
import { callClaudeJSON } from '../../claude';

afterEach(() => vi.restoreAllMocks());

const sections = { objective: 'grow off-peak bookings', audience: 'culture-first travellers', creative_task: 'a film series' };
const insights = [{ id: 1, text: 'they travel to feel changed', level: 'sharper' as const }];

describe('buildBriefFingerprint', () => {
  it('returns the LLM fingerprint when the call succeeds', async () => {
    (callClaudeJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      strategicProblem: 'make off-peak desirable', audience: 'culture-first; change-seekers',
      creativeJob: 'inspire shoulder-season trips', format: 'film series', tone: 'warm, cinematic',
    });
    const fp = await buildBriefFingerprint('brief text', sections, insights);
    expect(fp.strategicProblem).toBe('make off-peak desirable');
    expect(fp.audience).toContain('change-seekers');
  });

  it('falls back to triage sections when the LLM call throws', async () => {
    (callClaudeJSON as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    const fp = await buildBriefFingerprint('brief text', sections, insights);
    expect(fp.strategicProblem).toContain('grow off-peak bookings');
    expect(fp.audience).toContain('culture-first travellers');
    expect(fp.audience).toContain('they travel to feel changed'); // insight folded in
    expect(fp.creativeJob).toContain('a film series');
  });
});
