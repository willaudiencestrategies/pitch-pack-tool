/**
 * Vault narrative-draft prompt — six-slide expansion.
 *
 * Drafted by Tim and Richard. Ships as a placeholder; the API stub generates
 * deterministic mock content until the real prompt is integrated in Task 32.
 */

export const VAULT_NARRATIVE_DRAFT_PROMPT_VERSION = 'stub-v0';

export const VAULT_NARRATIVE_DRAFT_PROMPT = `
[STUB PROMPT — Tim and Richard's v1 prompt replaces this.]

Generates a fixed six-slide narrative draft per selected Vault concept:
  Slide 1: Key Brief Points (strategic inputs + CBT triage traffic lights)
  Slide 2: Creative Problem We're Solving (brief reframed)
  Slide 3: Narrative Pitch (presentation-ready story)
  Slide 4: Concept Description (Full) (verbatim from vault + deployment examples)
  Slide 5: Tailoring to [Partner] (allowed: destination, culture, atmosphere,
           local characters; forbidden: bespoke executions, new channels)
  Slide 6: Strategic Fit & Budget (rationale + watchouts + verbatim timeline +
           verbatim budget + close-to-edge flag + era flags + last-validated)

Output: JSON matching NarrativeDraft from src/lib/types.ts.
`;
