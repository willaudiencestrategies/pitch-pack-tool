import { NextRequest, NextResponse } from 'next/server';
import vaultContent from '@/lib/vault-content.json';
import { filterVaultCandidates } from '@/lib/vault-filter';
import { callClaudeJSON } from '@/lib/claude';
import { VAULT_NARRATIVE_DRAFT_PROMPT } from '@/lib/prompts/vault-narrative-draft';
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

/**
 * Stub matcher: ranks candidates deterministically based on simple heuristics
 * so the UI can be built and demoed before Tim's prompt lands. Replaced by the
 * Claude call in Task 31.
 */
function stubMatcher(candidates: ReturnType<typeof filterVaultCandidates>): VaultMatchResponse {
  // Sort: same-category first, then by name
  const sorted = [...candidates].sort((a, b) => {
    if (a.partnerTypeMatch === b.partnerTypeMatch) return a.concept.name.localeCompare(b.concept.name);
    return a.partnerTypeMatch === 'same-category' ? -1 : 1;
  });
  const top = sorted.slice(0, 5);

  const matches: VaultConceptMatch[] = top.map((c, idx) => ({
    conceptId: c.concept.id,
    conceptName: c.concept.name,
    slot: SLOTS[idx],
    confidence: idx === 0 ? 'strong' : idx <= 2 ? 'plausible' : 'stretch',
    confidenceReason: `[stub] ${c.partnerTypeMatch === 'same-category' ? 'Same partner type.' : 'Cross-category reach.'} ${c.budgetFlag === 'close-to-edge' ? 'Close to budget edge.' : 'Comfortable budget headroom.'}`,
    partnerTypeMatch: c.partnerTypeMatch,
    budgetFlag: c.budgetFlag,
    conceptDescription: c.concept.ideaSummary.slice(0, 240),
    estimatedProductionTimeline: c.concept.productionTimelineRaw || 'Timeline TBC',
    estimatedProductionBudget: c.concept.productionBudget.length
      ? c.concept.productionBudget.map(b => `$${b.minUsd.toLocaleString()}-$${b.maxUsd.toLocaleString()} (${b.label})`).join(', ')
      : 'Budget TBC',
    qualityFlags: [],
    referenceLinks: c.concept.referenceLinks,
  }));

  const allStretch = matches.length > 0 && matches.every(m => m.confidence === 'stretch');
  return {
    rankedConcepts: matches,
    topLineNote: allStretch
      ? 'The Vault found candidates worth a quick scan, but nothing is a strong fit for this brief. Consider Creative Lab for net-new ideation. The matches below show what\'s closest.'
      : null,
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
      const response = stubMatcher(candidates);
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
