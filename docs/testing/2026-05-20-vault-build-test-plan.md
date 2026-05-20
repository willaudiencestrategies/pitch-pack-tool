# Vault Build — Comprehensive Test Plan

**Date:** 20 May 2026
**Branch:** vault-build (31 commits ahead of main)
**Status:** All code committed, smoke verified, prompts pending from Tim
**Approach:** Will walks through each section, documents findings, surfaces fixes needed before the 29 May review.

## Why this test plan exists

The Vault build ran across 30 of 33 plan tasks (Tasks 31 and 32 are blocked on Tim's prompts). The implementation passed unit-level checks (80/80 tests, clean tsc, clean Next.js build, working API endpoint) but the build was done by subagents working from the plan's code blocks. Two gaps:

1. **CSS / design consistency was never audited**, only mechanically inherited. The new Vault step components use the project's CSS variables but they were never visually compared to the existing components (PersonificationReview, CreativeTenets, BrandAlignment, AudienceMenu) for consistency in spacing, typography, hierarchy, motion. The frontend-design skill was not invoked during the build.
2. **End-to-end functional testing has been build-level only** — typecheck, unit tests, GET /, POST /api/vault. The full user journey (multi-step flow through the UI, multi-audience branching, loopback) has not been exercised.

This plan covers both. Six sections, executed in order, with findings documented inline and a "Fixes Required" summary at the end.

---

## Section 1: Static design language audit (CSS + visual consistency)

**Goal:** Verify the six new Vault step components match the existing tool's design language.

**Method:**
- Read each existing reference component end-to-end:
  - PersonificationReview.tsx
  - CreativeTenets.tsx
  - BrandAlignment.tsx
  - AudienceMenu.tsx
  - ProductionBudget.tsx (existing, not the Vault one)
- Catalogue the patterns: container widths, padding, button styles, heading sizes, status colour usage, hover/transition behaviour, spacing scales, copy tone
- Compare each new Vault step against these patterns:
  - VaultDecisionStep
  - VaultAudiencePickerStep
  - VaultProductionBudgetStep
  - VaultMatchListStep
  - VaultNarrativeDraftStep
  - VaultExportStep
- Surface any inconsistency with severity (Critical / Important / Minor)

**Acceptance:** Every Vault step matches the existing tool's visual language. Discrepancies either get fixed or get an explicit justification.

---

## Section 2: Refactor preservation audit

**Goal:** Confirm the Phase 1 refactor preserved every behaviour in the original tool.

**Method:**
- Read the extracted step components against their original inline renderers via git log
- Compare each step's JSX byte-for-byte (modulo state-access transformations like `state.x` instead of bare `x`)
- Confirm the audience-branching invariant: walk Gate2AudienceStep + InsightsStep flow logic for multi-branch scenarios
- Confirm the v1.8 budget-confirm fix: trace handleBudgetConfirm → goToNextGate1Section path
- Confirm the v1.8.1 mammoth fix is intact in /api/parse/route.ts
- Confirm session-storage migration didn't break any consumer

**Acceptance:** Zero behavioural change vs. main for the existing tool flow.

---

## Section 3: Vault data integrity audit

**Goal:** Verify the parsed vault-content.json is correct and complete.

**Method:**
- Compare a sample of 5 concepts against the source Word doc
- Confirm category distribution: 12 destination, 11 lodging, 7 non-endemic, 2 airline, 1 car (total 33)
- Verify the 8 known-gap concepts (Volkswagen + 7 non-endemic) are correctly null on timeline/budget
- Run the filter against the real JSON to confirm it narrows correctly for representative briefs
- Spot-check production budget parsing: at least one multi-tier ("3x films"), at least one range, at least one missing
- Spot-check production timeline parsing: at least one "X-Y weeks" pattern

**Acceptance:** Every concept in JSON maps faithfully to its source. The 8 known-broken concepts are correctly flagged as broken (null timeline/budget) without false-fixing them.

---

## Section 4: API endpoint deep test

**Goal:** Exercise /api/vault with the full matrix of realistic and edge-case inputs.

**Method:** With dev server running, POST to /api/vault with each of:

**Match mode happy paths:**
- destination, $300k → 3-5 matches
- destination, $100k → narrower set (or all-stretch)
- destination, $500k → wider set
- lodging, $200k
- airline, $300k → likely cross-category fallback (only 2 airline concepts)
- car, $300k → cross-category (only 1 car concept)

**Match mode with channel constraint:**
- destination + mustHaveChannels: ['video']
- destination + mustHaveChannels: ['ooh']
- destination + mustHaveChannels: ['video', 'social', 'ooh'] (very narrow)

**Match mode edge cases:**
- non-endemic partnerType (should still work but match against non-endemic concepts which are excluded — what does it return?)
- productionBudgetUsd: 0
- productionBudgetUsd: 100000000 (massive)
- productionBudgetUsd: -1000 (negative)
- Missing required fields
- Invalid mode value

**Narrative-draft mode:**
- Valid concept ID
- Invalid concept ID
- Missing concept ID
- Empty brief

**Acceptance:** Every input returns a sensible response. No 500s on valid input. No data corruption on edge inputs. Invalid inputs return clear errors.

---

## Section 5: End-to-end functional walkthroughs

**Goal:** Verify the full user journeys work end-to-end against the dev server.

**Method:** Since I can't drive a browser as the assistant, the depth I can reach is:
- Read the rendered HTML from the dev server (GET /)
- Inspect the static markup
- Simulate state transitions by calling /api/vault directly
- Document the journey at each decision point with what the UI would show

**Walkthrough A — Happy path, strong matches:**
1. Single-audience brief uploaded, triaged, sectioned
2. Brand alignment confirmed
3. Audience selected (1 primary, no secondary)
4. Personification + insights selected
5. handleConfirmInsights fires → vault_decision step
6. Background matcher returns 3 ranked concepts, one strong
7. Decision screen shows "Strong matches found" with default highlight on Vault
8. CP picks Vault → routes to vault_production_budget (no branch picker because 1 branch)
9. Production budget confirmed → routes to vault_matches
10. CP picks top concept → routes to vault_narrative_draft
11. Narrative draft loads (stub for now)
12. CP edits Slide 5 (Tailoring) inline
13. CP hits Export → vault_export step
14. Export generates .docx → state.exportedAt set, resume URL embedded
15. Confirmation block shows

**Walkthrough B — Multi-audience, audience picker, stretch:**
1. Same setup but brief produces 2 audience segments
2. Both branches processed (personification + insights for each)
3. handleConfirmInsights → vault_decision
4. Background matcher fires using primary branch's insights → returns matches
5. Decision screen shows preview based on primary's match quality
6. CP picks Vault → routes to vault_audience_picker (because >1 branch)
7. Picker shows both audiences + "All combined"
8. CP picks the secondary audience → handleVaultAudiencePick(1) called
9. Matcher re-fires with the secondary's insights, vaultResult updates
10. Routes to vault_production_budget OR vault_matches (depending on whether budget already set)
11. Match results show, possibly all-stretch with top-line note

**Walkthrough C — No production split in brief, gate fires:**
1. Brief with total budget only, no production split
2. Through to Vault decision
3. CP picks Vault → routes to vault_production_budget gate
4. Quick-picks render based on total budget
5. CP confirms → matcher re-fires with confirmed budget

**Walkthrough D — Loopback:**
1. Through Walkthrough A to export
2. Export generates resume URL like `http://localhost:3000/?resume=<base64>`
3. Simulate paste of that URL in a new tab (or open the URL directly via curl/fetch)
4. Page mount detects ?resume= and decodes
5. State restored, step set to gate2_tenets, resumedFromToken: true
6. CreativeTenetsStep renders with the rejected-Vault sidebar showing match names

**Walkthrough E — Continue to Creative Tenets (existing flow preserved):**
1. Through to vault_decision
2. CP picks "Continue to Creative Tenets" → routes to gate2_tenets
3. Existing Creative Tenets flow plays out unchanged
4. Through to output as today

**Acceptance:** Each walkthrough's state transitions work without surprise. Step components render the expected content. State persistence works across navigations.

---

## Section 6: Specific edge cases & invariants

**Goal:** Probe specific behaviours that could break silently.

**Tests:**
1. **Background matcher fires the moment insights are saved** — verify via reading handleConfirmInsights + the setTimeout pattern.
2. **Audience branching never gets flattened** — search the codebase for any flatMap of audienceBranches outside of the deliberate "All combined" path.
3. **Production timeline reproduced verbatim** — confirm the matcher output preserves the raw string, no normalization.
4. **Non-endemic excluded in v1** — confirm vault-filter.ts excludes them and the API stub doesn't surface them.
5. **No refuse-to-match** — confirm the API always returns rankedConcepts (even if empty) and never throws/refuses based on confidence.
6. **Top-line note fires when all stretch** — confirm via API probe with a brief likely to produce only stretch matches.
7. **Resume token roundtrip preserves the audience branches** — encode/decode through vault-resume-token and confirm audienceBranches structure intact.
8. **Three-tenets invariant** — confirm CreativeTenets component still produces three tenets, not four.
9. **v1.8 budget-confirm fix** — trace from ProductionBudget component's confirm callback to goToNextGate1Section.
10. **Storage key migration is idempotent** — confirm MIGRATED_FROM_LEGACY_KEY guards prevent double-migration.

**Acceptance:** Every invariant holds.

---

## Findings template

For each section, I'll record:
- ✅ **Pass** — observation
- ⚠ **Concern** — issue with severity (Critical/Important/Minor) + recommended fix
- ❌ **Fail** — blocker that needs immediate fix before review

---

## After this test plan

Surface a clean "Fixes Required" list. Apply the critical and important fixes. Re-verify. Then this branch is genuinely ready for the 29 May review (modulo Tim's prompts).

*Plan written 2026-05-20. Execution begins immediately below.*
