import type { AxisScores, ScoredConcept } from './types';
import type { VaultCandidate } from '../vault-filter';
import type { VaultConceptMatch, VaultConfidence } from '../types';
import { AXIS_WEIGHTS, CONFIDENCE_THRESHOLDS, MAX_RANKED } from './config';

const SLOTS: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];

export function weightedTotal(s: AxisScores): number {
  return (
    AXIS_WEIGHTS.problem * s.problemScore +
    AXIS_WEIGHTS.audience * s.audienceScore +
    AXIS_WEIGHTS.mechanism * s.mechanismScore
  );
}

export function confidenceBand(total: number): VaultConfidence {
  if (total >= CONFIDENCE_THRESHOLDS.strong) return 'strong';
  if (total >= CONFIDENCE_THRESHOLDS.plausible) return 'plausible';
  return 'stretch';
}

export function buildTopLineNote(topTotal: number): string | null {
  if (topTotal >= CONFIDENCE_THRESHOLDS.plausible) return null;
  return "The Vault hasn't returned a strong fit for this brief. The matches below could still work with adaptation - worth continuing through the Vault flow with them, while running Creative Lab in parallel rather than relying on the Vault path alone.";
}

function confidenceReason(s: AxisScores): string {
  return `${s.problemReason} ${s.audienceReason} ${s.mechanismReason}`.trim();
}

export interface VaultMatchResponse {
  rankedConcepts: VaultConceptMatch[];
  topLineNote: string | null;
}

export function rankAndLabel(
  scored: ScoredConcept[],
  candidatesById: Map<string, VaultCandidate>,
): VaultMatchResponse {
  const ranked = scored
    .filter((s) => candidatesById.has(s.conceptId))
    .map((s) => ({ s, total: weightedTotal(s.scores) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, MAX_RANKED);

  const rankedConcepts: VaultConceptMatch[] = ranked.map(({ s, total }, idx) => {
    const candidate = candidatesById.get(s.conceptId)!;
    const c = candidate.concept;
    return {
      conceptId: s.conceptId,
      conceptName: c.name,
      slot: SLOTS[idx] || 'E',
      confidence: confidenceBand(total),
      confidenceReason: confidenceReason(s.scores),
      partnerTypeMatch: candidate.partnerTypeMatch,
      budgetFlag: candidate.budgetFlag,
      conceptDescription: c.ideaSummary.slice(0, 240),
      estimatedProductionTimeline: c.productionTimelineRaw || 'Timeline TBC',
      estimatedProductionBudget: c.productionBudget.length
        ? c.productionBudget.map((b) => `$${b.minUsd.toLocaleString()}-$${b.maxUsd.toLocaleString()} (${b.label})`).join(', ')
        : 'Budget TBC',
      qualityFlags: [],
      referenceLinks: c.referenceLinks,
    };
  });

  const topTotal = ranked.length ? ranked[0].total : 0;
  return { rankedConcepts, topLineNote: ranked.length ? buildTopLineNote(topTotal) : null };
}
