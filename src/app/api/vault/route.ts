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

/**
 * Stub matcher: ranks candidates deterministically based on simple heuristics
 * so the UI can be built and demoed before Tim's prompt lands. Replaced by the
 * Claude call in Task 31.
 */
function stubMatcher(candidates: ReturnType<typeof filterVaultCandidates>, partnerType: VaultCategory): VaultMatchResponse {
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
    estimatedProductionTimeline: c.concept.productionTimelineRaw || '',
    estimatedProductionBudget: c.concept.productionBudget.map(b => `$${b.minUsd.toLocaleString()}-$${b.maxUsd.toLocaleString()} (${b.label})`).join(', '),
    qualityFlags: [],
    referenceLinks: c.concept.referenceLinks,
  }));

  const allStretch = matches.every(m => m.confidence === 'stretch');
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
      strategicFitAndBudget: `[stub] Strategic fit + ${concept.watchouts.join('; ')}. Production timeline: ${concept.productionTimelineRaw || 'TBD'}. Production budget: ${concept.productionBudget.map(b => b.label).join(', ')}.`,
    },
    creativeLabFlag: false,
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: VaultMatchRequest = await req.json();
    const vault = vaultContent as VaultContent;

    if (body.mode === 'match') {
      const candidates = filterVaultCandidates(vault.concepts, {
        productionBudgetUsd: body.productionBudgetUsd,
        partnerType: body.partnerType,
        mustHaveChannels: body.mustHaveChannels || [],
      });
      const response = stubMatcher(candidates, body.partnerType);
      return NextResponse.json(response);
    }

    if (body.mode === 'narrative-draft') {
      const concept = vault.concepts.find(c => c.id === body.selectedConceptId);
      if (!concept) {
        return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
      }
      const draft = stubNarrativeDraft(body.selectedConceptId!, concept, body.partnerName || 'the partner');
      return NextResponse.json({ draft } as NarrativeDraftResponse);
    }

    return NextResponse.json({ error: 'Unknown mode' }, { status: 400 });
  } catch (err) {
    console.error('Vault API error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
