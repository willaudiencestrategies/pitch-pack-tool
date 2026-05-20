import { VaultConcept, VaultCategory } from './types';

export interface VaultFilterArgs {
  productionBudgetUsd: number;
  partnerType: VaultCategory;
  mustHaveChannels: string[];
}

export interface VaultCandidate {
  concept: VaultConcept;
  budgetFlag: 'within-range' | 'close-to-edge';
  partnerTypeMatch: 'same-category' | 'adjacent';
}

const HARD_CUTOFF_PCT = 0.20;
const CLOSE_TO_EDGE_PCT = 0.10;

function isBudgetInRange(concept: VaultConcept, briefBudget: number): { inRange: boolean; closeToEdge: boolean } {
  if (!concept.productionBudget.length) {
    // No budget info → treat as in-range, no flag. The LLM can flag this.
    return { inRange: true, closeToEdge: false };
  }
  // Use the widest tier: min of mins, max of maxes
  const minTier = Math.min(...concept.productionBudget.map(t => t.minUsd));
  const maxTier = Math.max(...concept.productionBudget.map(t => t.maxUsd));

  const hardLow = briefBudget * (1 - HARD_CUTOFF_PCT);
  const hardHigh = briefBudget * (1 + HARD_CUTOFF_PCT);

  // Hard cut: if the entire concept budget range falls outside the brief's ±20% window, exclude.
  if (maxTier < hardLow || minTier > hardHigh) {
    return { inRange: false, closeToEdge: false };
  }

  // Close-to-edge: concept range sits entirely past the ±10% window around the brief budget
  // (i.e. concept is leaning toward one of the hard cutoffs).
  const edgeLow = briefBudget * (1 - CLOSE_TO_EDGE_PCT);
  const edgeHigh = briefBudget * (1 + CLOSE_TO_EDGE_PCT);
  const closeToEdge = minTier > edgeHigh || maxTier < edgeLow;

  return { inRange: true, closeToEdge };
}

function hasMustHaveChannels(concept: VaultConcept, mustHave: string[]): boolean {
  if (!mustHave.length) return true;
  const conceptChannels = concept.channelsFormats.map(c => c.toLowerCase());
  return mustHave.every(needed =>
    conceptChannels.some(c => c.includes(needed.toLowerCase()))
  );
}

export function filterVaultCandidates(
  concepts: VaultConcept[],
  args: VaultFilterArgs,
): VaultCandidate[] {
  return concepts
    .filter(c => c.category !== 'non-endemic')  // v1 hard exclusion
    .filter(c => hasMustHaveChannels(c, args.mustHaveChannels))
    .map(c => {
      const budget = isBudgetInRange(c, args.productionBudgetUsd);
      if (!budget.inRange) return null;
      return {
        concept: c,
        budgetFlag: budget.closeToEdge ? 'close-to-edge' : 'within-range',
        partnerTypeMatch: c.category === args.partnerType ? 'same-category' : 'adjacent',
      } as VaultCandidate;
    })
    .filter((c): c is VaultCandidate => c !== null);
}
