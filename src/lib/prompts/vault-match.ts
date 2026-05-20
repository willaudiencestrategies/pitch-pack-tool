/**
 * Vault matching prompt.
 *
 * The actual Role/Task/Logic/Output content is drafted by Tim and Richard.
 * This file ships with a placeholder that returns the deterministic stub via
 * the API route until Tim's v1 prompt lands.
 *
 * When Tim's prompt arrives, replace VAULT_MATCH_PROMPT below with the real text.
 */

export const VAULT_MATCH_PROMPT_VERSION = 'stub-v0';

export const VAULT_MATCH_PROMPT = `
[STUB PROMPT — Tim's v1 prompt replaces this. The API route currently bypasses
the LLM call and returns a deterministic mock for end-to-end UI testing.]

Role: Strategic Planner, Creative Director, Production Realist, Audience Anthropologist.

Task: Rank the candidate Vault concepts against the brief's Objective, Creative
Task, Audience (selected branch), Human Truths, partner type, and confirmed
production budget. Return 3-5 ranked matches in Top Match A-E format. Always
surface what the Vault has; no hidden threshold.

Logic:
- Partner type is a soft preference. Same-category concepts weight up; cross-category
  concepts can surface if they're a strong fit, with the reach called out honestly.
- Concepts annotated 'close-to-edge' on budget should have the headroom flag
  surfaced in the reason text.
- Confidence labels: Strong (genuine fit, no major reservations), Plausible (clear
  fit, gaps), Stretch (closest available, material gaps).
- Flag too-destination-specific or overly-generic in qualityFlags.
- If everything is a Stretch, open with the top-line note recommending Creative Lab
  while still surfacing the matches.

Output: JSON matching VaultConceptMatch[] from src/lib/types.ts, plus an optional
topLineNote string.
`;
