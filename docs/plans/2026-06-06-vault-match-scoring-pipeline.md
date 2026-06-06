# Vault Match Scoring Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single subjective Vault matcher with a scoring pipeline that fingerprints brief and concepts onto shared axes, scores each concept independently on Sonnet, and ranks deterministically with an honest "no comparable" path.

**Architecture:** Pre-filter (channels + advisory budget/non-endemic flags) → one LLM call to build a brief fingerprint → independent Sonnet scoring of each pre-fingerprinted concept on three axes → pure deterministic rank/label emitting the existing `VaultConceptMatch[]` shape. Concept fingerprints are generated once offline into `vault-content.json`.

**Tech Stack:** Next.js 16 / React 19, TypeScript, Anthropic SDK (`claude-sonnet-4-6`), Vitest. Branch: `vault-build`.

**Reference spec:** `docs/specs/2026-06-04-vault-match-redesign-design.md`

---

## File Structure

- `src/lib/vault-match/config.ts` — weights, thresholds, model, MAX_RANKED constants
- `src/lib/vault-match/types.ts` — `BriefFingerprint`, `ConceptFingerprint`, `AxisScores`, `ScoredConcept`
- `src/lib/vault-match/rank.ts` — pure: `weightedTotal`, `confidenceBand`, `buildTopLineNote`, `rankAndLabel`
- `src/lib/vault-match/fingerprint.ts` — `buildBriefFingerprint` (LLM + deterministic fallback)
- `src/lib/vault-match/score.ts` — `scoreConcept`, `scoreAllConcepts` (parallel)
- `src/lib/prompts/brief-fingerprint.ts` — brief fingerprint system prompt
- `src/lib/prompts/concept-score.ts` — per-concept scoring system prompt
- `scripts/enrich-vault-fingerprints.ts` — offline: write `fingerprint` onto each concept
- `src/lib/types.ts` — add `fingerprint?: ConceptFingerprint` to `VaultConcept`
- `src/lib/vault-filter.ts` — non-endemic becomes a soft signal (no hard drop)
- `src/app/api/vault/route.ts` — `generateMatcherRanking` internals replaced with the pipeline

---

## Task 1: Scoring config + internal types

**Files:**
- Create: `src/lib/vault-match/config.ts`
- Create: `src/lib/vault-match/types.ts`
- Modify: `src/lib/types.ts` (add `fingerprint` to `VaultConcept`)
- Test: `src/lib/vault-match/__tests__/config.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/vault-match/__tests__/config.test.ts
import { describe, it, expect } from 'vitest';
import { AXIS_WEIGHTS, CONFIDENCE_THRESHOLDS, NO_COMPARABLE_FLOOR } from '../config';

describe('vault-match config', () => {
  it('axis weights sum to 1', () => {
    const sum = AXIS_WEIGHTS.problem + AXIS_WEIGHTS.audience + AXIS_WEIGHTS.mechanism;
    expect(sum).toBeCloseTo(1, 5);
  });
  it('thresholds are ordered: floor < plausible < strong', () => {
    expect(NO_COMPARABLE_FLOOR).toBeLessThan(CONFIDENCE_THRESHOLDS.plausible);
    expect(CONFIDENCE_THRESHOLDS.plausible).toBeLessThan(CONFIDENCE_THRESHOLDS.strong);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/vault-match/__tests__/config.test.ts`
Expected: FAIL — cannot find module `../config`.

- [ ] **Step 3: Write the config and types**

```ts
// src/lib/vault-match/config.ts
/** Problem-led weighting (Tim's call). Must sum to 1. */
export const AXIS_WEIGHTS = { problem: 0.45, audience: 0.35, mechanism: 0.20 } as const;

/** Total-score cutoffs for confidence labels (tunable). */
export const CONFIDENCE_THRESHOLDS = { strong: 70, plausible: 45 } as const;

/** Below this top score, the Vault has no genuine comparable → recommend Creative Lab. */
export const NO_COMPARABLE_FLOOR = 35;

/** Scoring runs on Sonnet — the failure mode was weak judgement, so we don't economise here. */
export const SCORING_MODEL = 'claude-sonnet-4-6';

/** Max concepts returned to the UI. */
export const MAX_RANKED = 5;
```

```ts
// src/lib/vault-match/types.ts
export interface BriefFingerprint {
  strategicProblem: string;
  audience: string;   // includes the selected insights / human truths
  creativeJob: string;
  format: string;
  tone: string;
}

export interface ConceptFingerprint {
  strategicProblem: string;
  audience: string;
  creativeJob: string;
  mechanism: string;
  format: string;
}

export interface AxisScores {
  problemScore: number;     // 0-100
  audienceScore: number;    // 0-100, includes insight-carriage
  mechanismScore: number;   // 0-100
  problemReason: string;
  audienceReason: string;
  mechanismReason: string;
}

export interface ScoredConcept {
  conceptId: string;
  scores: AxisScores;
}
```

- [ ] **Step 4: Add `fingerprint` to `VaultConcept`**

In `src/lib/types.ts`, add the import at the top of the file and the optional field to the `VaultConcept` interface (the interface that contains `productionBudget: { label: string; minUsd: number; maxUsd: number }[];`):

```ts
import type { ConceptFingerprint } from './vault-match/types';
// ...inside interface VaultConcept, after referenceLinks:
  fingerprint?: ConceptFingerprint;
```

- [ ] **Step 5: Run test + typecheck**

Run: `npx vitest run src/lib/vault-match/__tests__/config.test.ts && npx tsc --noEmit`
Expected: test PASS; tsc shows only the pre-existing `prompts.test.ts` warning and stale `.next` route warnings, nothing in `vault-match/` or `types.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/vault-match/config.ts src/lib/vault-match/types.ts src/lib/vault-match/__tests__/config.test.ts src/lib/types.ts
git commit -m "feat(vault-match): scoring config + fingerprint types"
```

---

## Task 2: Deterministic rank & label (pure core)

**Files:**
- Create: `src/lib/vault-match/rank.ts`
- Test: `src/lib/vault-match/__tests__/rank.test.ts`

This is the deterministic heart — no LLM. It turns `ScoredConcept[]` into the existing `VaultMatchResponse` shape.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/vault-match/__tests__/rank.test.ts
import { describe, it, expect } from 'vitest';
import { weightedTotal, confidenceBand, buildTopLineNote, rankAndLabel } from '../rank';
import type { AxisScores, ScoredConcept } from '../types';
import type { VaultCandidate } from '../../vault-filter';
import type { VaultConcept } from '../../types';

const axes = (p: number, a: number, m: number): AxisScores => ({
  problemScore: p, audienceScore: a, mechanismScore: m,
  problemReason: 'pr', audienceReason: 'ar', mechanismReason: 'mr',
});

const concept = (id: string): VaultConcept => ({
  id, name: `Concept ${id}`, conceptType: 'one-off', category: 'destination', archetype: [],
  ideaSummary: `idea ${id}`, creativeMechanism: '', coreMessage: '', whatItsGoodFor: [],
  audienceFit: [], channelsFormats: [], watchouts: [], previouslyPitchedTo: [],
  productionTimelineRaw: '10 weeks', productionTimeline: { minWeeks: 10, maxWeeks: 10 },
  productionBudgetRaw: '$100k', productionBudget: [{ label: 's', minUsd: 100000, maxUsd: 100000 }],
  referenceLinks: [], lastValidated: null, eraTags: [],
});

const candidate = (id: string): VaultCandidate => ({
  concept: concept(id), budgetFlag: 'within-range', partnerTypeMatch: 'same-category',
});

describe('weightedTotal', () => {
  it('applies the problem-led weights', () => {
    expect(weightedTotal(axes(100, 0, 0))).toBeCloseTo(45, 5);
    expect(weightedTotal(axes(0, 100, 0))).toBeCloseTo(35, 5);
    expect(weightedTotal(axes(0, 0, 100))).toBeCloseTo(20, 5);
    expect(weightedTotal(axes(100, 100, 100))).toBeCloseTo(100, 5);
  });
});

describe('confidenceBand', () => {
  it('maps totals to bands', () => {
    expect(confidenceBand(85)).toBe('strong');
    expect(confidenceBand(70)).toBe('strong');
    expect(confidenceBand(55)).toBe('plausible');
    expect(confidenceBand(45)).toBe('plausible');
    expect(confidenceBand(30)).toBe('stretch');
  });
});

describe('buildTopLineNote', () => {
  it('is null when the top match is plausible or better', () => {
    expect(buildTopLineNote(60)).toBeNull();
  });
  it('recommends Creative Lab when the best match is only a stretch', () => {
    expect(buildTopLineNote(40)).toContain('Creative Lab');
  });
});

describe('rankAndLabel', () => {
  it('sorts by total, assigns slots A.. and caps at 5', () => {
    const scored: ScoredConcept[] = [
      { conceptId: 'low', scores: axes(40, 40, 40) },
      { conceptId: 'high', scores: axes(90, 90, 90) },
      { conceptId: 'mid', scores: axes(70, 60, 60) },
    ];
    const byId = new Map([['low', candidate('low')], ['high', candidate('high')], ['mid', candidate('mid')]]);
    const res = rankAndLabel(scored, byId);
    expect(res.rankedConcepts.map(c => c.conceptId)).toEqual(['high', 'mid', 'low']);
    expect(res.rankedConcepts.map(c => c.slot)).toEqual(['A', 'B', 'C']);
    expect(res.rankedConcepts[0].confidence).toBe('strong');
    expect(res.topLineNote).toBeNull();
  });

  it('fires the Creative Lab note when every match is a stretch', () => {
    const scored: ScoredConcept[] = [{ conceptId: 'a', scores: axes(30, 30, 30) }];
    const byId = new Map([['a', candidate('a')]]);
    const res = rankAndLabel(scored, byId);
    expect(res.rankedConcepts[0].confidence).toBe('stretch');
    expect(res.topLineNote).toContain('Creative Lab');
  });

  it('passes through candidate fields and builds confidenceReason from axis reasons', () => {
    const scored: ScoredConcept[] = [{ conceptId: 'a', scores: axes(80, 75, 60) }];
    const byId = new Map([['a', candidate('a')]]);
    const res = rankAndLabel(scored, byId);
    const m = res.rankedConcepts[0];
    expect(m.conceptName).toBe('Concept a');
    expect(m.budgetFlag).toBe('within-range');
    expect(m.partnerTypeMatch).toBe('same-category');
    expect(m.confidenceReason).toContain('pr');
    expect(m.estimatedProductionTimeline).toBe('10 weeks');
  });

  it('drops scored concepts that are not in the candidate map', () => {
    const scored: ScoredConcept[] = [{ conceptId: 'ghost', scores: axes(90, 90, 90) }];
    const res = rankAndLabel(scored, new Map());
    expect(res.rankedConcepts).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/vault-match/__tests__/rank.test.ts`
Expected: FAIL — cannot find module `../rank`.

- [ ] **Step 3: Write `rank.ts`**

```ts
// src/lib/vault-match/rank.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/vault-match/__tests__/rank.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/vault-match/rank.ts src/lib/vault-match/__tests__/rank.test.ts
git commit -m "feat(vault-match): deterministic rank & label core"
```

---

## Task 3: Non-endemic becomes a soft signal in the filter

**Files:**
- Modify: `src/lib/vault-filter.ts`
- Modify: `src/lib/__tests__/vault-filter.test.ts`

The filter must stop hard-dropping non-endemic (same anti-pattern as budget). Non-endemic concepts flow into scoring and rank low naturally; the category is carried via the existing `partnerTypeMatch` ('adjacent' when it differs from the brief partner type).

- [ ] **Step 1: Update the failing test**

Replace the existing `excludes non-endemic in v1` test in `src/lib/__tests__/vault-filter.test.ts` with:

```ts
  it('no longer hard-excludes non-endemic; it flows through as adjacent', () => {
    const concepts: VaultConcept[] = [
      { ...baseConcept, id: 'klarna', category: 'non-endemic' },
    ];
    const result = filterVaultCandidates(concepts, { productionBudgetUsd: 300_000, partnerType: 'destination', mustHaveChannels: [] });
    expect(result).toHaveLength(1);
    expect(result[0].partnerTypeMatch).toBe('adjacent');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/vault-filter.test.ts`
Expected: FAIL — current filter returns length 0 (still hard-excludes non-endemic).

- [ ] **Step 3: Remove the hard exclusion**

In `src/lib/vault-filter.ts`, delete the line `.filter(c => c.category !== 'non-endemic')  // v1 hard exclusion` from `filterVaultCandidates`, leaving the channels filter and the budget-flag map. Add a comment:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/vault-filter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/vault-filter.ts src/lib/__tests__/vault-filter.test.ts
git commit -m "feat(vault-filter): non-endemic is a soft signal, not a hard drop"
```

---

## Task 4: Brief fingerprint (LLM + deterministic fallback)

**Files:**
- Create: `src/lib/prompts/brief-fingerprint.ts`
- Create: `src/lib/vault-match/fingerprint.ts`
- Test: `src/lib/vault-match/__tests__/fingerprint.test.ts`

`callClaudeJSON(systemPrompt, userMessage, opts)` already exists in `src/lib/claude.ts` and returns parsed JSON. Tests mock it.

- [ ] **Step 1: Write the prompt**

```ts
// src/lib/prompts/brief-fingerprint.ts
export const BRIEF_FINGERPRINT_PROMPT = `
Role: You distil a creative brief into a compact fingerprint on five fixed axes so it can be compared like-for-like against Vault concepts.

Return ONLY this JSON, no prose, no markdown fence:
{
  "strategicProblem": "the underlying creative problem the work must solve, one sentence",
  "audience": "who it's for AND the human truth / insight it must carry, one to two sentences",
  "creativeJob": "what the creative output has to do, one sentence",
  "format": "the kind of deliverable/format implied (film, social series, OOH, ambassador-led, etc.)",
  "tone": "the intended tone in a few words"
}

Rules:
- Be specific and concrete; name the actual problem, not a generic restatement.
- The audience axis MUST fold in the selected insights provided in the input — these are the truths the chosen concept has to keep carrying.
- Never invent budget or partner facts not present in the brief.
`;
```

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/vault-match/__tests__/fingerprint.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildBriefFingerprint } from '../fingerprint';

afterEach(() => vi.restoreAllMocks());

vi.mock('../../claude', () => ({
  callClaudeJSON: vi.fn(),
}));
import { callClaudeJSON } from '../../claude';

const sections = { objective: 'grow off-peak bookings', audience: 'culture-first travellers', creative_task: 'a film series' };
const insights = [{ id: 1, text: 'they travel to feel changed', level: 'sharper' as const }];

describe('buildBriefFingerprint', () => {
  it('returns the LLM fingerprint when the call succeeds', async () => {
    (callClaudeJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      strategicProblem: 'make off-peak desirable', audience: 'culture-first; change-seekers',
      creativeJob: 'inspire shoulder-season trips', format: 'film series', tone: 'warm, cinematic',
    });
    const fp = await buildBriefFingerprint('brief text', sections, insights);
    expect(fp.strategicProblem).toBe('make off-peak desirable');
    expect(fp.audience).toContain('change-seekers');
  });

  it('falls back to triage sections when the LLM call throws', async () => {
    (callClaudeJSON as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    const fp = await buildBriefFingerprint('brief text', sections, insights);
    expect(fp.strategicProblem).toContain('grow off-peak bookings');
    expect(fp.audience).toContain('culture-first travellers');
    expect(fp.audience).toContain('they travel to feel changed'); // insight folded in
    expect(fp.creativeJob).toContain('a film series');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/vault-match/__tests__/fingerprint.test.ts`
Expected: FAIL — cannot find module `../fingerprint`.

- [ ] **Step 4: Write `fingerprint.ts`**

```ts
// src/lib/vault-match/fingerprint.ts
import { callClaudeJSON } from '../claude';
import { BRIEF_FINGERPRINT_PROMPT } from '../prompts/brief-fingerprint';
import type { BriefFingerprint } from './types';

interface Insight { id: number; text: string; level: 'safer' | 'sharper' | 'bolder' }

/** Deterministic fingerprint from the triage sections + insights — used as the fallback. */
function fallbackFingerprint(
  sections: Record<string, string>,
  insights: Insight[],
): BriefFingerprint {
  const insightText = insights.map((i) => i.text).join('; ');
  return {
    strategicProblem: sections.objective || 'Not stated',
    audience: [sections.audience, insightText].filter(Boolean).join(' — ') || 'Not stated',
    creativeJob: sections.creative_task || sections.objective || 'Not stated',
    format: 'Not stated',
    tone: 'Not stated',
  };
}

export async function buildBriefFingerprint(
  brief: string,
  sections: Record<string, string>,
  insights: Insight[],
): Promise<BriefFingerprint> {
  const userMessage = `Brief:\n${brief}\n\nTriage sections:\n${JSON.stringify(sections, null, 2)}\n\nSelected insights:\n${JSON.stringify(insights, null, 2)}`;
  try {
    const fp = await callClaudeJSON<Partial<BriefFingerprint>>(
      BRIEF_FINGERPRINT_PROMPT, userMessage, { endpoint: 'brief-fingerprint' },
    );
    const fallback = fallbackFingerprint(sections, insights);
    return {
      strategicProblem: fp.strategicProblem || fallback.strategicProblem,
      audience: fp.audience || fallback.audience,
      creativeJob: fp.creativeJob || fallback.creativeJob,
      format: fp.format || fallback.format,
      tone: fp.tone || fallback.tone,
    };
  } catch {
    return fallbackFingerprint(sections, insights);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/vault-match/__tests__/fingerprint.test.ts`
Expected: PASS (both cases).

- [ ] **Step 6: Commit**

```bash
git add src/lib/prompts/brief-fingerprint.ts src/lib/vault-match/fingerprint.ts src/lib/vault-match/__tests__/fingerprint.test.ts
git commit -m "feat(vault-match): brief fingerprint with deterministic fallback"
```

---

## Task 5: Independent concept scoring (parallel, Sonnet)

**Files:**
- Create: `src/lib/prompts/concept-score.ts`
- Create: `src/lib/vault-match/score.ts`
- Test: `src/lib/vault-match/__tests__/score.test.ts`

- [ ] **Step 1: Write the prompt**

```ts
// src/lib/prompts/concept-score.ts
export const CONCEPT_SCORE_PROMPT = `
Role: You are a senior strategist scoring ONE Vault concept against ONE brief, honestly. You are not an advocate. Score what is genuinely there.

You receive a brief fingerprint and a concept fingerprint, both on shared axes. Return ONLY this JSON, no prose, no fence:
{
  "problemScore": 0-100,
  "problemReason": "one sentence: does the concept solve the same strategic/creative problem?",
  "audienceScore": 0-100,
  "audienceReason": "one sentence: does its audience overlap AND would it still carry the brief's chosen insight?",
  "mechanismScore": 0-100,
  "mechanismReason": "one sentence: is its creative device/format the right shape for what the brief must produce?"
}

Rules:
- Score each axis independently on its own merits. Do not inflate to be helpful.
- audienceScore MUST reflect insight-carriage: a concept that fits the demographic but would lose the brief's chosen insight scores low here.
- A genuinely poor fit should score low (0-40). Reserve 80-100 for real, defensible fit.
- Reasons are one sentence each, concrete, naming what fits and what doesn't.
`;
```

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/vault-match/__tests__/score.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { scoreConcept, scoreAllConcepts } from '../score';
import type { BriefFingerprint, ConceptFingerprint } from '../types';

afterEach(() => vi.restoreAllMocks());

vi.mock('../../claude', () => ({ callClaudeJSON: vi.fn() }));
import { callClaudeJSON } from '../../claude';

const brief: BriefFingerprint = { strategicProblem: 'p', audience: 'a', creativeJob: 'j', format: 'f', tone: 't' };
const cfp: ConceptFingerprint = { strategicProblem: 'p', audience: 'a', creativeJob: 'j', mechanism: 'm', format: 'f' };

describe('scoreConcept', () => {
  it('returns clamped axis scores from the model', async () => {
    (callClaudeJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      problemScore: 120, problemReason: 'pr', audienceScore: -5, audienceReason: 'ar', mechanismScore: 60, mechanismReason: 'mr',
    });
    const s = await scoreConcept(brief, 'c1', cfp);
    expect(s.conceptId).toBe('c1');
    expect(s.scores.problemScore).toBe(100); // clamped
    expect(s.scores.audienceScore).toBe(0);  // clamped
    expect(s.scores.mechanismScore).toBe(60);
  });

  it('scores 0 with a logged reason when the call fails', async () => {
    (callClaudeJSON as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    const s = await scoreConcept(brief, 'c2', cfp);
    expect(s.scores.problemScore).toBe(0);
    expect(s.scores.audienceScore).toBe(0);
    expect(s.scores.mechanismScore).toBe(0);
  });
});

describe('scoreAllConcepts', () => {
  it('scores every concept and preserves ids', async () => {
    (callClaudeJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      problemScore: 50, problemReason: 'p', audienceScore: 50, audienceReason: 'a', mechanismScore: 50, mechanismReason: 'm',
    });
    const out = await scoreAllConcepts(brief, [
      { conceptId: 'a', fingerprint: cfp },
      { conceptId: 'b', fingerprint: cfp },
    ]);
    expect(out.map((o) => o.conceptId).sort()).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/vault-match/__tests__/score.test.ts`
Expected: FAIL — cannot find module `../score`.

- [ ] **Step 4: Write `score.ts`**

```ts
// src/lib/vault-match/score.ts
import { callClaudeJSON } from '../claude';
import { CONCEPT_SCORE_PROMPT } from '../prompts/concept-score';
import type { AxisScores, BriefFingerprint, ConceptFingerprint, ScoredConcept } from './types';

const clamp = (n: unknown): number => {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(100, v));
};

const ZERO: AxisScores = {
  problemScore: 0, audienceScore: 0, mechanismScore: 0,
  problemReason: 'Not scored (scoring call failed).',
  audienceReason: 'Not scored (scoring call failed).',
  mechanismReason: 'Not scored (scoring call failed).',
};

export async function scoreConcept(
  brief: BriefFingerprint,
  conceptId: string,
  fingerprint: ConceptFingerprint,
): Promise<ScoredConcept> {
  const userMessage = `Brief fingerprint:\n${JSON.stringify(brief, null, 2)}\n\nConcept fingerprint:\n${JSON.stringify(fingerprint, null, 2)}`;
  try {
    const r = await callClaudeJSON<Partial<AxisScores>>(
      CONCEPT_SCORE_PROMPT, userMessage, { endpoint: 'concept-score' },
    );
    return {
      conceptId,
      scores: {
        problemScore: clamp(r.problemScore),
        audienceScore: clamp(r.audienceScore),
        mechanismScore: clamp(r.mechanismScore),
        problemReason: r.problemReason || '',
        audienceReason: r.audienceReason || '',
        mechanismReason: r.mechanismReason || '',
      },
    };
  } catch (err) {
    console.error(`concept-score failed for ${conceptId}:`, err);
    return { conceptId, scores: ZERO };
  }
}

export async function scoreAllConcepts(
  brief: BriefFingerprint,
  concepts: { conceptId: string; fingerprint: ConceptFingerprint }[],
): Promise<ScoredConcept[]> {
  return Promise.all(concepts.map((c) => scoreConcept(brief, c.conceptId, c.fingerprint)));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/vault-match/__tests__/score.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add src/lib/prompts/concept-score.ts src/lib/vault-match/score.ts src/lib/vault-match/__tests__/score.test.ts
git commit -m "feat(vault-match): independent per-concept scoring on Sonnet"
```

---

## Task 6: Offline fingerprint enrichment script

**Files:**
- Create: `scripts/enrich-vault-fingerprints.ts`
- Create: `src/lib/prompts/concept-fingerprint.ts`

Generates a `fingerprint` for every concept and writes it back into `vault-content.json`. One-shot, run manually. Run against the CURRENT vault now so the pipeline is testable end-to-end before the v3 ingest.

- [ ] **Step 1: Write the concept-fingerprint prompt**

```ts
// src/lib/prompts/concept-fingerprint.ts
export const CONCEPT_FINGERPRINT_PROMPT = `
Role: You distil a single Vault creative concept into a compact fingerprint on five fixed axes, matching the axes a brief is distilled onto, so the two can be compared like-for-like.

Return ONLY this JSON, no prose, no fence:
{
  "strategicProblem": "the kind of creative problem this concept is built to solve, one sentence",
  "audience": "who it lands with and the human truth it plays on, one to two sentences",
  "creativeJob": "what the concept's output does, one sentence",
  "mechanism": "the actual creative device/format (anthology film, first-person doc, DOOH stunt, ambassador-led, etc.)",
  "format": "the deliverable shape (e.g. 3x hero films, social series, OOH)"
}

Base it ONLY on the provided concept fields. Do not invent.
`;
```

- [ ] **Step 2: Write the enrichment script**

```ts
#!/usr/bin/env tsx
// scripts/enrich-vault-fingerprints.ts
// Run: npx tsx scripts/enrich-vault-fingerprints.ts src/lib/vault-content.json
import { readFileSync, writeFileSync } from 'fs';
import { callClaudeJSON } from '../src/lib/claude';
import { CONCEPT_FINGERPRINT_PROMPT } from '../src/lib/prompts/concept-fingerprint';
import type { ConceptFingerprint } from '../src/lib/vault-match/types';

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error('usage: enrich-vault-fingerprints.ts <vault-content.json>');
  const vault = JSON.parse(readFileSync(path, 'utf8'));
  const concepts: Array<Record<string, unknown>> = vault.concepts;

  for (const c of concepts) {
    const input = {
      ideaSummary: c.ideaSummary, creativeMechanism: c.creativeMechanism,
      coreMessage: c.coreMessage, whatItsGoodFor: c.whatItsGoodFor,
      audienceFit: c.audienceFit, channelsFormats: c.channelsFormats, category: c.category,
    };
    const fp = await callClaudeJSON<ConceptFingerprint>(
      CONCEPT_FINGERPRINT_PROMPT, JSON.stringify(input, null, 2), { endpoint: 'concept-fingerprint' },
    );
    c.fingerprint = fp;
    console.log(`fingerprinted: ${c.id}`);
  }

  writeFileSync(path, JSON.stringify(vault, null, 2));
  console.log(`Wrote ${concepts.length} fingerprints to ${path}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Run the script against the current vault**

Run: `ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY npx tsx scripts/enrich-vault-fingerprints.ts src/lib/vault-content.json`
Expected: prints `fingerprinted: <id>` per concept, then `Wrote 33 fingerprints`. Spot-check a couple of `fingerprint` objects in the JSON for sane axes.

- [ ] **Step 4: Commit**

```bash
git add scripts/enrich-vault-fingerprints.ts src/lib/prompts/concept-fingerprint.ts src/lib/vault-content.json
git commit -m "feat(vault-match): offline concept-fingerprint enrichment + enrich current vault"
```

---

## Task 7: Wire the pipeline into the route

**Files:**
- Modify: `src/app/api/vault/route.ts`
- Test: `src/app/api/__tests__/vault-route.test.ts`

Replace the body of `generateMatcherRanking` so it runs filter → brief fingerprint → score → rank. Keep `validateMatchRequest`, the narrative-draft path, and the response shape untouched.

- [ ] **Step 1: Write the failing integration test (mocked LLM)**

```ts
// src/app/api/__tests__/vault-route.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => vi.restoreAllMocks());

vi.mock('@/lib/vault-match/fingerprint', () => ({
  buildBriefFingerprint: vi.fn().mockResolvedValue({
    strategicProblem: 'p', audience: 'a', creativeJob: 'j', format: 'f', tone: 't',
  }),
}));
vi.mock('@/lib/vault-match/score', () => ({
  scoreAllConcepts: vi.fn().mockResolvedValue([]), // overridden per-test below
}));

import { POST } from '../../vault/route';
import { scoreAllConcepts } from '@/lib/vault-match/score';
import vaultContent from '@/lib/vault-content.json';

function req(body: unknown) {
  return new Request('http://x/api/vault', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

describe('POST /api/vault (match)', () => {
  it('returns ranked concepts from the scoring pipeline', async () => {
    const firstId = (vaultContent as { concepts: { id: string }[] }).concepts[0].id;
    (scoreAllConcepts as ReturnType<typeof vi.fn>).mockResolvedValue([
      { conceptId: firstId, scores: { problemScore: 90, audienceScore: 90, mechanismScore: 90, problemReason: 'r', audienceReason: 'r', mechanismReason: 'r' } },
    ]);
    const res = await POST(req({ mode: 'match', brief: 'b', briefSections: {}, insights: [], partnerType: 'destination', productionBudgetUsd: 100000 }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.rankedConcepts[0].conceptId).toBe(firstId);
    expect(data.rankedConcepts[0].confidence).toBe('strong');
  });

  it('still 400s on an invalid budget', async () => {
    const res = await POST(req({ mode: 'match', brief: 'b', briefSections: {}, insights: [], partnerType: 'destination', productionBudgetUsd: 10 }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/__tests__/vault-route.test.ts`
Expected: FAIL — `generateMatcherRanking` still calls the old `VAULT_MATCH_PROMPT`, so the ranked concept won't come from `scoreAllConcepts`.

- [ ] **Step 3: Rewrite `generateMatcherRanking`**

In `src/app/api/vault/route.ts`, replace the imports of the old matcher and the body of `generateMatcherRanking`:

```ts
// new imports (remove VAULT_MATCH_PROMPT import)
import { buildBriefFingerprint } from '@/lib/vault-match/fingerprint';
import { scoreAllConcepts } from '@/lib/vault-match/score';
import { rankAndLabel } from '@/lib/vault-match/rank';
import type { ConceptFingerprint } from '@/lib/vault-match/types';

async function generateMatcherRanking(
  candidates: ReturnType<typeof filterVaultCandidates>,
  brief: string,
  briefSections: Record<string, string>,
  insights: VaultMatchRequest['insights'],
): Promise<VaultMatchResponse> {
  if (candidates.length === 0) {
    return {
      rankedConcepts: [],
      topLineNote:
        'No Vault candidates survived the filter for this brief - must-have channels excluded the available concepts.',
    };
  }

  const briefFingerprint = await buildBriefFingerprint(brief, briefSections, insights);

  const scorable = candidates
    .filter((c) => c.concept.fingerprint)
    .map((c) => ({ conceptId: c.concept.id, fingerprint: c.concept.fingerprint as ConceptFingerprint }));

  const scored = await scoreAllConcepts(briefFingerprint, scorable);
  const candidatesById = new Map(candidates.map((c) => [c.concept.id, c]));
  return rankAndLabel(scored, candidatesById);
}
```

Update the single call site of `generateMatcherRanking` to drop the now-unused `partnerType` / `productionBudgetUsd` args (it now takes 4 args). Import `VaultMatchResponse` from `@/lib/vault-match/rank` and delete the local `interface VaultMatchResponse` if it now duplicates it.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/__tests__/vault-route.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/vault/route.ts src/app/api/__tests__/vault-route.test.ts
git commit -m "feat(vault-match): wire scoring pipeline into /api/vault"
```

---

## Task 8: Retire the old matcher prompt + full verification

**Files:**
- Delete: `src/lib/prompts/vault-match.ts` (and its test if any references break)
- Modify: any remaining import of `VAULT_MATCH_PROMPT`

- [ ] **Step 1: Find references**

Run: `grep -rn "VAULT_MATCH_PROMPT\|vault-match'" src/ | grep -v node_modules`
Expected: only the route (already updated) and the prompt file itself.

- [ ] **Step 2: Delete the old prompt**

Run: `git rm src/lib/prompts/vault-match.ts`
If a test imports it, delete that test too (the new `vault-route.test.ts` covers the path).

- [ ] **Step 3: Full suite + typecheck**

Run: `npx vitest run && npx tsc --noEmit 2>&1 | grep -v "prompts.test.ts\|.next/"`
Expected: all tests PASS; no new tsc errors (only the pre-existing `prompts.test.ts` warning and stale `.next/` route warnings remain).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(vault-match): retire single-call matcher prompt"
```

---

## Self-Review notes

- **Spec coverage:** pre-filter soft non-endemic (T3), brief fingerprint + fallback (T4), offline concept fingerprints (T6), independent Sonnet scoring with insight-carriage (T5), deterministic rank/bands/no-comparable (T2), config incl. Sonnet + weights + thresholds (T1), route wiring + same response shape (T7), retire old prompt (T8). The matching-vs-generating reconciliation needs no code (narrative-draft + Creative Lab already exist) — confirm at the call before merging.
- **Deferred (own tasks, not here):** v3 vault re-ingest (run the T6 script against the v3 JSON once parsed); TBC-budget matching; prompt caching wiring (add cache_control to the scoring system prompt — fast follow once the pipeline is green).
- **Branch:** build on `vault-build`. Do not merge to `main` until after the Tim/Richard call.
