import { callClaudeJSON } from '../claude';
import { CONCEPT_SCORE_PROMPT } from '../prompts/concept-score';
import type { AxisScores, BriefFingerprint, ConceptFingerprint, ScoredConcept } from './types';

const clamp = (n: unknown): number => {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(100, v));
};

const ZERO: AxisScores = {
  problemScore: 0, audienceScore: 0, mechanismScore: 0,
  problemReason: 'Not scored (scoring call failed).',
  audienceReason: 'Not scored (scoring call failed).',
  mechanismReason: 'Not scored (scoring call failed).',
};

export async function scoreConcept(
  brief: BriefFingerprint,
  conceptId: string,
  fingerprint: ConceptFingerprint,
): Promise<ScoredConcept> {
  const userMessage = `Brief fingerprint:\n${JSON.stringify(brief, null, 2)}\n\nConcept fingerprint:\n${JSON.stringify(fingerprint, null, 2)}`;
  try {
    const r = await callClaudeJSON<Partial<AxisScores>>(
      CONCEPT_SCORE_PROMPT, userMessage, { endpoint: 'concept-score' },
    );
    return {
      conceptId,
      scores: {
        problemScore: clamp(r.problemScore),
        audienceScore: clamp(r.audienceScore),
        mechanismScore: clamp(r.mechanismScore),
        problemReason: r.problemReason || '',
        audienceReason: r.audienceReason || '',
        mechanismReason: r.mechanismReason || '',
      },
    };
  } catch (err) {
    console.error(`concept-score failed for ${conceptId}:`, err);
    return { conceptId, scores: ZERO };
  }
}

export async function scoreAllConcepts(
  brief: BriefFingerprint,
  concepts: { conceptId: string; fingerprint: ConceptFingerprint }[],
): Promise<ScoredConcept[]> {
  return Promise.all(concepts.map((c) => scoreConcept(brief, c.conceptId, c.fingerprint)));
}
