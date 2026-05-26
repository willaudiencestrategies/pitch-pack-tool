import { NextRequest, NextResponse } from 'next/server';
import vaultContent from '@/lib/vault-content.json';
import { filterVaultCandidates } from '@/lib/vault-filter';
import { callClaudeJSON } from '@/lib/claude';
import { VAULT_NARRATIVE_DRAFT_PROMPT } from '@/lib/prompts/vault-narrative-draft';
import { VAULT_MATCH_PROMPT } from '@/lib/prompts/vault-match';
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

const SLOTS: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
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

const VALID_SLOTS = new Set(['A', 'B', 'C', 'D', 'E']);
const VALID_CONFIDENCE = new Set<VaultConfidence>(['strong', 'plausible', 'stretch']);
const VALID_QUALITY_FLAGS = new Set(['too-destination-specific', 'overly-generic']);

/**
 * Generate ranked Vault matches via Claude using Tim's v1.0 prompt.
 * Normalises the response against the candidate set so downstream code
 * always sees well-formed VaultConceptMatch[] (clamps slot/confidence/flags,
 * recovers pass-through fields from the candidate when the model omits them).
 */
async function generateMatcherRanking(
  candidates: ReturnType<typeof filterVaultCandidates>,
  brief: string,
  briefSections: Record<string, string>,
  insights: VaultMatchRequest['insights'],
  partnerType: VaultCategory,
  productionBudgetUsd: number,
): Promise<VaultMatchResponse> {
  if (candidates.length === 0) {
    return {
      rankedConcepts: [],
      topLineNote:
        'No Vault candidates survived the filter for this brief - budget, partner type, or must-have channels excluded the available concepts.',
    };
  }

  const userPayload = {
    brief,
    briefSections,
    insights,
    partnerType,
    productionBudgetUsd,
    candidates: candidates.map(c => ({
      concept: c.concept,
      partnerTypeMatch: c.partnerTypeMatch,
      budgetFlag: c.budgetFlag,
    })),
  };

  const userMessage = `Rank the candidates against the brief using the following inputs:\n\n${JSON.stringify(userPayload, null, 2)}`;

  const response = await callClaudeJSON<{
    rankedConcepts?: Partial<VaultConceptMatch>[];
    topLineNote?: string | null;
  }>(VAULT_MATCH_PROMPT, userMessage, { endpoint: 'vault-match' });

  const candidatesById = new Map(candidates.map(c => [c.concept.id, c]));
  const rawRanked = Array.isArray(response.rankedConcepts) ? response.rankedConcepts : [];

  const rankedConcepts: VaultConceptMatch[] = rawRanked
    .map((m, idx): VaultConceptMatch | null => {
      const conceptId = m.conceptId;
      if (!conceptId || !candidatesById.has(conceptId)) return null;
      const candidate = candidatesById.get(conceptId)!;
      const fallbackSlot = SLOTS[idx] || 'E';
      const slot = m.slot && VALID_SLOTS.has(m.slot) ? m.slot : fallbackSlot;
      const confidence = m.confidence && VALID_CONFIDENCE.has(m.confidence) ? m.confidence : 'plausible';
      const qualityFlags = Array.isArray(m.qualityFlags)
        ? m.qualityFlags.filter(f => VALID_QUALITY_FLAGS.has(f))
        : [];
      return {
        conceptId,
        conceptName: m.conceptName || candidate.concept.name,
        slot,
        confidence,
        confidenceReason: m.confidenceReason || '',
        partnerTypeMatch: candidate.partnerTypeMatch,
        budgetFlag: candidate.budgetFlag,
        conceptDescription: m.conceptDescription || candidate.concept.ideaSummary.slice(0, 240),
        estimatedProductionTimeline: m.estimatedProductionTimeline || candidate.concept.productionTimelineRaw || 'Timeline TBC',
        estimatedProductionBudget: m.estimatedProductionBudget || (candidate.concept.productionBudget.length
          ? candidate.concept.productionBudget.map(b => `$${b.minUsd.toLocaleString()}-$${b.maxUsd.toLocaleString()} (${b.label})`).join(', ')
          : 'Budget TBC'),
        qualityFlags: qualityFlags as ('too-destination-specific' | 'overly-generic')[],
        referenceLinks: Array.isArray(m.referenceLinks) ? m.referenceLinks : candidate.concept.referenceLinks,
      };
    })
    .filter((m): m is VaultConceptMatch => m !== null)
    .slice(0, 5);

  return {
    rankedConcepts,
    topLineNote: typeof response.topLineNote === 'string' ? response.topLineNote : null,
  };
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
        body.partnerType!,
        body.productionBudgetUsd!,
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
