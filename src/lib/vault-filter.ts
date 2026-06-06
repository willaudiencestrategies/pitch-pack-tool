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

// Budget is advisory, never a hard gate. The filter used to hard-exclude any
// concept whose budget fell outside ±20% of the brief, which starved the LLM
// matcher of brief-relevant candidates before it ever read the brief — the
// cause of "the Vault won't return anything relevant". Now every partner- and
// channel-relevant concept reaches the matcher, and budget only sets a flag the
// matcher surfaces as honest headroom/pressure (see VAULT_MATCH_PROMPT).
const COMFORT_BAND_PCT = 0.50;

function assessBudgetFlag(concept: VaultConcept, briefBudget: number): 'within-range' | 'close-to-edge' {
  if (!concept.productionBudget.length) {
    // No budget info → no pressure signal. The LLM can flag the gap itself.
    return 'within-range';
  }
  // Use the widest tier: min of mins, max of maxes
  const minTier = Math.min(...concept.productionBudget.map(t => t.minUsd));
  const maxTier = Math.max(...concept.productionBudget.map(t => t.maxUsd));

  const comfortLow = briefBudget * (1 - COMFORT_BAND_PCT);
  const comfortHigh = briefBudget * (1 + COMFORT_BAND_PCT);

  // Within-range when the concept's budget range overlaps a comfortable band
  // around the brief budget; otherwise flag it so the matcher calls out the gap.
  const overlapsComfortBand = !(maxTier < comfortLow || minTier > comfortHigh);
  return overlapsComfortBand ? 'within-range' : 'close-to-edge';
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
    // Non-endemic is NOT hard-dropped — scoring ranks it low on partner/audience fit
    // for an endemic brief. (If Tim confirms a commercial reason to hide it, gate it
    // behind an explicit opt-in arg here rather than restoring a silent hard filter.)
    .filter(c => hasMustHaveChannels(c, args.mustHaveChannels))
    .map(c => ({
      concept: c,
      budgetFlag: assessBudgetFlag(c, args.productionBudgetUsd),
      partnerTypeMatch: c.category === args.partnerType ? 'same-category' : 'adjacent',
    } as VaultCandidate));
}
