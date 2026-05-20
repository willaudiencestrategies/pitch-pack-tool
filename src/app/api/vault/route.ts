import { NextRequest, NextResponse } from 'next/server';
import vaultContent from '@/lib/vault-content.json';
import { filterVaultCandidates } from '@/lib/vault-filter';
import { VaultConcept, VaultConceptMatch, VaultCategory, VaultContent, NarrativeDraft } from '@/lib/types';

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
 * Stub narrative draft generator. Replaced by the Claude call in Task 32.
 */
function stubNarrativeDraft(conceptId: string, concept: VaultConcept, partnerName: string): NarrativeDraft {
  return {
    conceptId,
    slides: {
      keyBriefPoints: `[stub] Key brief points for ${partnerName}. Strategic inputs would restate here, plus triage traffic lights.`,
      creativeProblemWeAreSolving: `[stub] Creative problem framing showing why ${concept.name} fits.`,
      narrativePitch: `[stub] Narrative pitch for ${concept.name}. ${concept.ideaSummary}`,
      conceptDescriptionFull: `[stub] ${concept.creativeMechanism}\n\nCore message: ${concept.coreMessage}\n\nDeployment examples to embed here.`,
      tailoringTo: `[stub] Tailoring ${concept.name} to ${partnerName}. Allowed: destination, culture, atmosphere, local characters. Forbidden: speculative bespoke executions.`,
      strategicFitAndBudget: `[stub] Strategic fit + ${concept.watchouts.join('; ')}. Production timeline: ${concept.productionTimelineRaw || 'TBD'}. Production budget: ${concept.productionBudget.map(b => b.label).join(', ') || 'TBD'}.`,
    },
    creativeLabFlag: false,
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
    const draft = stubNarrativeDraft(body.selectedConceptId, concept, body.partnerName || 'the partner');
    return NextResponse.json({ draft } as NarrativeDraftResponse);
  } catch (err) {
    console.error('Vault narrative-draft error:', err);
    return NextResponse.json({ error: 'Narrative draft generation failed' }, { status: 500 });
  }
}
