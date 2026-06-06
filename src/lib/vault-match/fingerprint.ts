import { callClaudeJSON } from '../claude';
import { BRIEF_FINGERPRINT_PROMPT } from '../prompts/brief-fingerprint';
import type { BriefFingerprint } from './types';

interface Insight { id: number; text: string; level: 'safer' | 'sharper' | 'bolder' }

/** Deterministic fingerprint from the triage sections + insights — used as the fallback. */
function fallbackFingerprint(
  sections: Record<string, string>,
  insights: Insight[],
): BriefFingerprint {
  const insightText = insights.map((i) => i.text).join('; ');
  return {
    strategicProblem: sections.objective || 'Not stated',
    audience: [sections.audience, insightText].filter(Boolean).join(' — ') || 'Not stated',
    creativeJob: sections.creative_task || sections.objective || 'Not stated',
    format: 'Not stated',
    tone: 'Not stated',
  };
}

export async function buildBriefFingerprint(
  brief: string,
  sections: Record<string, string>,
  insights: Insight[],
): Promise<BriefFingerprint> {
  const userMessage = `Brief:\n${brief}\n\nTriage sections:\n${JSON.stringify(sections, null, 2)}\n\nSelected insights:\n${JSON.stringify(insights, null, 2)}`;
  try {
    const fp = await callClaudeJSON<Partial<BriefFingerprint>>(
      BRIEF_FINGERPRINT_PROMPT, userMessage, { endpoint: 'brief-fingerprint' },
    );
    const fallback = fallbackFingerprint(sections, insights);
    return {
      strategicProblem: fp.strategicProblem || fallback.strategicProblem,
      audience: fp.audience || fallback.audience,
      creativeJob: fp.creativeJob || fallback.creativeJob,
      format: fp.format || fallback.format,
      tone: fp.tone || fallback.tone,
    };
  } catch {
    return fallbackFingerprint(sections, insights);
  }
}
