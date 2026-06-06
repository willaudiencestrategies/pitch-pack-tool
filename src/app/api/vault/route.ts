import { NextRequest, NextResponse } from 'next/server';
import vaultContent from '@/lib/vault-content.json';
import { filterVaultCandidates } from '@/lib/vault-filter';
import { callClaudeJSON } from '@/lib/claude';
import { VAULT_NARRATIVE_DRAFT_PROMPT } from '@/lib/prompts/vault-narrative-draft';
import { buildBriefFingerprint } from '@/lib/vault-match/fingerprint';
import { scoreAllConcepts } from '@/lib/vault-match/score';
import { rankAndLabel } from '@/lib/vault-match/rank';
import type { ConceptFingerprint } from '@/lib/vault-match/types';
import { VaultConcept, VaultConceptMatch, VaultCategory, VaultContent, NarrativeDraft, VaultConfidence } from '@/lib/types';

interface TriageTrafficLight {
  status: 'green' | 'amber' | 'red';
  rationale: string;
}

interface CoherenceTensionInput {
  title: string;
  description: string;
  severity: 'critical' | 'notable';
}

interface VaultMatchRequest {
  mode: 'match' | 'narrative-draft';
  brief: string;
  briefSections: Record<string, string>;
  insights: { id: number; text: string; level: 'safer' | 'sharper' | 'bolder' }[];
  partnerType: VaultCategory;
  productionBudgetUsd: number;
  mustHaveChannels?: string[];
  // For narrative-draft mode only:
  selectedConceptId?: string;
  partnerName?: string;
  triageTrafficLights?: Record<string, TriageTrafficLight>;
  triageCoherenceTensions?: CoherenceTensionInput[];
  matchConfidence?: VaultConfidence;
  matchQualityFlags?: ('too-destination-specific' | 'overly-generic')[];
  budgetFlag?: 'within-range' | 'close-to-edge';
}

interface VaultMatchResponse {
  rankedConcepts: VaultConceptMatch[];
  topLineNote: string | null;
}

interface NarrativeDraftResponse {
  draft: NarrativeDraft;
}

const VALID_CATEGORIES: VaultCategory[] = ['destination', 'lodging', 'airline', 'car', 'non-endemic'];

/**
 * Validate match-mode request body. Returns an error message string if invalid, or null if valid.
 */
function validateMatchRequest(body: Partial<VaultMatchRequest>): string | null {
  if (!body.partnerType) return 'partnerType is required';
  if (!VALID_CATEGORIES.includes(body.partnerType)) {
    return `partnerType must be one of: ${VALID_CATEGORIES.join(', ')}`;
  }
  if (typeof body.productionBudgetUsd !== 'number') return 'productionBudgetUsd must be a number';
  if (!Number.isFinite(body.productionBudgetUsd)) return 'productionBudgetUsd must be finite';
  if (body.productionBudgetUsd < 1000) {
    return 'productionBudgetUsd must be at least 1000 (the matcher needs a realistic figure to filter against)';
  }
  if (body.productionBudgetUsd > 50_000_000) {
    return 'productionBudgetUsd exceeds realistic ceiling ($50M)';
  }
  return null;
}

/**
 * Generate ranked Vault matches via the scoring pipeline:
 * filter → brief fingerprint → independent per-concept scoring → deterministic rank.
 */
async function generateMatcherRanking(
  candidates: ReturnType<typeof filterVaultCandidates>,
  brief: string,
  briefSections: Record<string, string>,
  insights: VaultMatchRequest['insights'],
): Promise<VaultMatchResponse> {
  if (candidates.length === 0) {
    return {
      rankedConcepts: [],
      topLineNote:
        'No Vault candidates survived the filter for this brief - must-have channels excluded the available concepts.',
    };
  }

  const briefFingerprint = await buildBriefFingerprint(brief, briefSections, insights);

  const scorable = candidates
    .filter(c => c.concept.fingerprint)
    .map(c => ({ conceptId: c.concept.id, fingerprint: c.concept.fingerprint as ConceptFingerprint }));

  const scored = await scoreAllConcepts(briefFingerprint, scorable);
  const candidatesById = new Map(candidates.map(c => [c.concept.id, c]));
  return rankAndLabel(scored, candidatesById);
}

/**
 * Generate narrative draft via Claude using Tim's v1.0 prompt.
 * Injects conceptId server-side after the response.
 */
async function generateNarrativeDraft(
  concept: VaultConcept,
  partnerName: string,
  brief: string,
  briefSections: Record<string, string>,
  insights: VaultMatchRequest['insights'],
  triageTrafficLights: Record<string, TriageTrafficLight>,
  triageCoherenceTensions: CoherenceTensionInput[],
  matchConfidence: VaultConfidence,
  matchQualityFlags: ('too-destination-specific' | 'overly-generic')[],
  budgetFlag: 'within-range' | 'close-to-edge',
): Promise<NarrativeDraft> {
  const userPayload = {
    brief,
    briefSections,
    triageTrafficLights,
    triageCoherenceTensions,
    insights,
    concept,
    partnerName,
    matchConfidence,
    matchQualityFlags,
    budgetFlag,
  };

  const userMessage = `Generate the six-slide narrative draft for the selected Vault concept using the following inputs:\n\n${JSON.stringify(userPayload, null, 2)}`;

  const response = await callClaudeJSON<{
    slides?: Partial<NarrativeDraft['slides']>;
    creativeLabFlag?: boolean;
  }>(VAULT_NARRATIVE_DRAFT_PROMPT, userMessage, { endpoint: 'vault-narrative-draft' });

  return {
    conceptId: concept.id,
    slides: {
      keyBriefPoints: response.slides?.keyBriefPoints || '',
      creativeProblemWeAreSolving: response.slides?.creativeProblemWeAreSolving || '',
      narrativePitch: response.slides?.narrativePitch || '',
      conceptDescriptionFull: response.slides?.conceptDescriptionFull || '',
      tailoringTo: response.slides?.tailoringTo || '',
      strategicFitAndBudget: response.slides?.strategicFitAndBudget || '',
    },
    creativeLabFlag: Boolean(response.creativeLabFlag),
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Partial<VaultMatchRequest>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Malformed JSON body' },
      { status: 400 }
    );
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 });
  }

  if (body.mode !== 'match' && body.mode !== 'narrative-draft') {
    return NextResponse.json(
      { error: 'mode must be "match" or "narrative-draft"' },
      { status: 400 }
    );
  }

  const vault = vaultContent as VaultContent;

  if (body.mode === 'match') {
    const validationError = validateMatchRequest(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    try {
      const candidates = filterVaultCandidates(vault.concepts, {
        productionBudgetUsd: body.productionBudgetUsd!,
        partnerType: body.partnerType!,
        mustHaveChannels: body.mustHaveChannels || [],
      });
      const response = await generateMatcherRanking(
        candidates,
        body.brief || '',
        body.briefSections || {},
        body.insights || [],
      );
      return NextResponse.json(response);
    } catch (err) {
      console.error('Vault match error:', err);
      return NextResponse.json({ error: 'Match failed' }, { status: 500 });
    }
  }

  // mode === 'narrative-draft'
  if (!body.selectedConceptId) {
    return NextResponse.json({ error: 'selectedConceptId is required for narrative-draft mode' }, { status: 400 });
  }
  const concept = vault.concepts.find(c => c.id === body.selectedConceptId);
  if (!concept) {
    return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
  }
  try {
    const draft = await generateNarrativeDraft(
      concept,
      body.partnerName || 'the partner',
      body.brief || '',
      body.briefSections || {},
      body.insights || [],
      body.triageTrafficLights || {},
      body.triageCoherenceTensions || [],
      body.matchConfidence || 'plausible',
      body.matchQualityFlags || [],
      body.budgetFlag || 'within-range',
    );
    return NextResponse.json({ draft } as NarrativeDraftResponse);
  } catch (err) {
    console.error('Vault narrative-draft error:', err);
    return NextResponse.json({ error: 'Narrative draft generation failed' }, { status: 500 });
  }
}
