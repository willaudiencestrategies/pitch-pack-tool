# Vault Match Redesign — Design Spec

**Date:** 2026-06-04
**Status:** Design approved; updated 2026-06-06 with Tim's feedback (Sonnet scoring, non-endemic soft-gate, insight-carriage as explicit axis, generation handled by sequencing not forking)
**Author:** Will + Claude

## Problem

Tim and Richard report the Vault step "won't return anything Vault-relevant from the briefs." Investigation found the match step is not a matching system at all: a single `claude-sonnet-4-6` call (`src/lib/claude.ts`) receives the full brief plus all ~26 full concept objects (~17k tokens) dumped as JSON and is asked to subjectively sort them into a top 3–5 (`src/lib/prompts/vault-match.ts`). There is no embedding, no similarity scoring, no shortlisting, no structured comparison anywhere in the codebase.

This structurally produces poor comparables:
1. **No shared comparison axis** — brief and concepts are described in different vocabularies, so "comparable" is never defined; the model eyeballs two differently-shaped things.
2. **One-shot ranking over the whole list** rewards surface/thematic resemblance over genuine strategic fit, and gives the tail of the list shallow reads.
3. **"Refuse-to-match is forbidden"** means when nothing genuinely fits, it still manufactures stretches with confident reasons — which reads to the user as irrelevant results.

A separate, already-fixed issue (2026-06-04): the budget pre-filter hard-excluded any concept outside ±20% of the brief budget, gutting the candidate list before the model saw it. Budget is now advisory (see `vault-filter.ts`, `parse-budget.ts`). This redesign addresses the remaining, deeper issue: match quality.

## Goal

Replace the single subjective sort with a scoring pipeline that compares brief and concepts on shared axes, scores each concept independently, ranks deterministically, and can honestly return "no genuine comparable — go to Creative Lab."

## Matching basis (decided)

A **weighted blend** across three shared axes:
- **Strategic/creative problem** — does the concept solve the same underlying creative problem the brief poses.
- **Audience + insight fit** — does its audience and the human truth it plays on overlap with the brief's target audience and selected insights. This axis explicitly includes **insight-carriage**: would the concept still carry the brief's chosen insight when executed (absorbs Richard's central criterion — see "Relationship to generation").
- **Creative mechanism/format** — is its device/format the right shape for what the brief must produce.

**Weights (problem-led):** problem `0.45`, audience `0.35`, mechanism `0.20`. Defined as a single tunable constant.

## Architecture — five stages

1. **Pre-filter (kept, cheap)** — `vault-filter.ts`: apply must-have channels, attach advisory budget flag. **Non-endemic is no longer hard-dropped** (it was the same gut-the-list-before-scoring anti-pattern as budget). Non-endemic concepts now flow into scoring and rank low naturally on partner/audience fit for an endemic brief; the category is carried as a soft signal, not a hard exclusion. (Pending one confirmation from Tim: if non-endemic was excluded for a *commercial* reason rather than as a crutch for the old matcher, it becomes an explicit opt-in toggle rather than always-on — still not a silent hard gate.) No brief reasoning happens here.

2. **Brief fingerprint (once per match)** — one light LLM call distils the brief onto the shared axes (`strategicProblem`, `audience` incl. selected insights, `creativeJob`, `format`/`tone`). Reuses existing triage section output (objective / audience / creative_task) as input so the call only normalises onto the canonical axes.

3. **Concept fingerprints (pre-computed offline)** — every concept carries a `fingerprint` field, generated once at ingest by `scripts/enrich-vault-fingerprints.ts` (one LLM call per concept), written into `vault-content.json`. Auditable JSON, reviewable by Will/Tim before going live.

4. **Independent scoring (parallel)** — each candidate scored on its own against the brief fingerprint, returning `{ problemScore, audienceScore, mechanismScore }` (0–100 each) plus a one-line reason per axis. The audience score must account for insight-carriage. Independent calls eliminate anchoring. Runs on **Sonnet 4.6**, in parallel.

5. **Deterministic rank & label (pure code, no LLM)** — combine axis scores with the weights, sort, map to confidence bands, apply the no-comparable bar, emit the existing `VaultConceptMatch[]` shape unchanged.

## Scoring & ranking detail

- **Total:** `total = 0.45·problem + 0.35·audience + 0.20·mechanism`.
- **Confidence bands (tunable):** `≥70` → strong, `45–69` → plausible, `<45` → stretch.
- **No-comparable bar (tunable):** if the top concept's total is `<35`, still surface the closest 3–5 as stretch but fire `topLineNote` recommending Creative Lab in parallel — reusing existing copy/behaviour.
- **confidenceReason:** assembled from the per-axis reasons returned by the scoring call (no extra synthesis call).
- **Pass-through unchanged:** conceptId, conceptName, conceptDescription, estimatedProductionTimeline, estimatedProductionBudget, budgetFlag, partnerTypeMatch, referenceLinks all carry through from the candidate.

## Cost control (first-class)

- Concept fingerprints computed **once offline**, not per match.
- Scoring on **Sonnet 4.6** (Tim's call: the failure mode was weak judgement, so we do not economise on the judgement core). Model is a single config constant, so testing whether Haiku holds up later is a one-line switch.
- Each scoring call carries a **tiny payload** (one ~300-token fingerprint, not the whole vault), run **in parallel**.
- **Prompt caching:** the system prompt + brief fingerprint are identical across all scoring calls in a match; cache the shared prefix so only the concept fingerprint varies per call — this is what keeps Sonnet-per-concept affordable.
- **Batching dial (documented lever, off by default):** score N concepts per call (e.g. 5 → ~8 calls) to cut call volume at a small quality cost. Default 1-per-call for quality.

Estimated low tens of cents per brief on Sonnet with caching; Tim has explicitly accepted the extra cost for the judgement gain.

## Error handling (degrade, never crash)

- Single concept scoring call fails → it scores 0, logged, the rest of the match returns.
- Brief-fingerprint call fails → fall back to assembling the fingerprint deterministically from existing triage sections; matching still runs.
- All scoring calls fail → return empty `rankedConcepts` with an explanatory `topLineNote`, same as today's empty path.
- Route-level try/catch in `src/app/api/vault/route.ts` retained.

## Code shape

- New `src/lib/vault-match/` — `fingerprint.ts` (brief fingerprint), `score.ts` (per-concept scoring call), `rank.ts` (combine / weight / confidence / no-comparable).
- New prompts under `src/lib/prompts/` — `brief-fingerprint.ts`, `concept-score.ts`.
- New `scripts/enrich-vault-fingerprints.ts` — offline concept-fingerprint generation.
- `src/app/api/vault/route.ts` — `generateMatcherRanking` internals replaced to call the new pipeline; same return shape.
- `vault-filter.ts` and the narrative-draft path are **untouched**.
- The old `VAULT_MATCH_PROMPT` is retired once the pipeline lands.

## Types

- Add `fingerprint` to `VaultConcept` (`src/lib/types.ts`): `{ strategicProblem: string; audience: string; creativeJob: string; mechanism: string; format: string }`.
- Internal scoring types live in `vault-match/`; the public `VaultConceptMatch` shape is unchanged.

## Testing

- **Ranking (pure, deterministic, mocked scores):** weights, confidence thresholds, no-comparable bar, tie-handling.
- **Fingerprint assembly** and **score→label mapping** unit tests.
- **Golden test:** two real briefs end-to-end with mocked LLM responses, locking the `VaultConceptMatch[]` contract shape.

## Relationship to generation (the matching-vs-generating fork)

Richard's instinct is to generate: express the brief's idea through each Vault template and rank the executions, rather than score existing concepts. We reconcile this by **sequencing, not forking**, and the pipeline already contains both moves:

- **Match (this spec)** decides *which* proven concept is the honest comparable, via independent scoring. "Proven" is the Vault's commercial value and what James needs (pitch-ready proven content at short notice), so selection stays a matching problem.
- **Express** happens in the existing **narrative-draft step** (`generateNarrativeDraft`), which tailors the chosen concept to the brief and partner. That is Richard's "express through the template", applied to the winner rather than used as the selection mechanism.
- **Generate fresh** is the **Creative Lab** lane, already reached via the no-comparable bar when nothing scores well enough.
- Richard's ranking criterion ("does it still carry the original insight") is absorbed directly into the audience axis as insight-carriage, so his concern shapes scoring even though we don't flip the step.

Making the Vault *step* a generator would collapse Vault into Creative Lab and destroy the honest "no genuine comparable" signal (anything generated looks like it fits). **Pending final settle at the Will/Tim/Richard 20-minute call before build.**

## Relationship to the v3 vault ingest

The offline fingerprint step folds into the pending Final v3 ingest: parse (38 concepts, adjusted for the new quoted-title format) → enrich-with-fingerprints → write `vault-content.json`. The v3 ingest is tracked separately but shares this pipeline's enrichment stage.

## Out of scope

- Re-ingesting the v3 vault content itself (separate task; this spec covers the matching engine and the enrichment step it depends on).
- Allowing matches with no stated budget ("TBC") — noted follow-up, not in this spec.

(Non-endemic handling moved IN scope as a soft signal — see Architecture stage 1.)
