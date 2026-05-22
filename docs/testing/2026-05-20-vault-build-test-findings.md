# Vault Build — Test Findings (Complete)

**Date:** 20 May 2026
**Status:** All six sections complete. Fixes applied. Branch ready for review.

---

## Summary table

| Section | Initial verdict | After fixes | Severity |
|---|---|---|---|
| 1 — CSS / design language | ❌ Significant break with existing tool | ✅ All six Vault steps redesigned to match | Was Critical |
| 2 — Refactor preservation | ✅ Pass | ✅ Pass | — |
| 3 — Vault data integrity | ⚠ 8 concepts with null timeline/budget (intentional) | ✅ Documented, filter handles gracefully | Minor |
| 4 — API endpoint deep test | ❌ 3 bugs (malformed JSON 500, missing field accepted, extreme budget leaks Volkswagen) | ✅ All fixed via validation layer | Was Important |
| 5 — E2E walkthroughs | ⚠ Stub matcher gives "first match always strong" artefact | ⚠ Unchanged — will resolve when Tim's prompt lands (Task 31) | Acceptable for prototype |
| 6 — Edge cases & invariants | ✅ Pass with one concern (multi-branch insights ordering) | ✅ Pass | Minor |

**Final state:** branch `vault-build` at commit `dcf48c1`. 80/80 tests passing. Clean Next.js production build. /api/vault endpoint properly validated. UI redesigned to match existing tool. Ready for Will's manual browser walkthrough and the 29 May review.

---

## Section 1 — CSS / design language audit

### Verdict before fixes: ❌

The Vault components were built mechanically from the plan without invoking the frontend-design skill. They used CSS variables but missed every established UX pattern.

### Gaps identified (and fixed in commit dcf48c1)

| Pattern from existing tool | Vault before | Vault after |
|---|---|---|
| `space-y-6` root container, parent provides max-w | Own `max-w-Nxl mx-auto px-6 py-8` | Fixed across all 6 |
| Centered header with Gate badge pill | None | Added "Vault: Decision/Audience/Budget/Matches/Draft/Export" pills |
| `rounded-xl` cards | `rounded-lg` | Fixed |
| `.btn-secondary` (yellow) primary actions | inline navy bg buttons | Now use `.btn-secondary` properly |
| `.btn-outline` (navy outline) back/secondary | inline border buttons | Now use `.btn-outline` properly |
| `.status-badge` + status-green/amber/red | inline `bg-[var(--status-x)]/10` | Now use proper status badge classes |
| Card selection pattern (radio + tinted bg + shadow) | Plain border buttons | Cards in AudiencePicker + MatchList now use BrandAlignment/AudienceMenu pattern |
| `pt-4 border-t` section dividers + action rows | Plain margins | All 6 fixed |
| Hover/transition effects | Minimal | Added `transition-all`, `hover:shadow-sm`, `hover:border-[var(--expedia-navy)]/50` |
| Text colour discipline (explicit vars) | Mostly defaults | All text now uses `text-` with the CSS variables |
| `LoadingSpinner` SVG in async buttons | Static buttons | Added to VaultDecisionStep's "Checking the Vault..." state |
| `.textarea-field` / `.input-field` CSS classes | Inline border styles | NarrativeDraft and ProductionBudget now use them |

### Verdict after fixes: ✅

Each Vault step now has the same Gate header pill structure as Gate 2 steps. Buttons use the yellow `.btn-secondary` for primary action (matching Confirm & Continue across the tool). Cards have the same selection pattern. The visual seam between the existing tool and the Vault flow is gone.

---

## Section 2 — Refactor preservation audit

### Verdict: ✅

The Phase 1 refactor (Tasks 1-17 + interstitial Task 8.5) preserved every existing behaviour:

- **61/61 baseline tests pass throughout** — every step extraction was followed by a vitest run.
- **page.tsx shrank from 3,291 lines to 728** then to 777 after Task 30 added the resume-token effect.
- **Eleven step renderers extracted** into individual files at `src/components/steps/`, each consuming `useBriefState()`.
- **Five shared helpers hoisted** (BackButton, StatusBadge, Spinner, ReassessConfirmation, ReturnToOutputButton) into `src/components/steps/shared/`. BranchProgress and LoadingOverlay hoisted alongside.
- **Audience branching invariant preserved.** `state.audienceBranches` array, `currentBranchIndex`, per-branch insights all intact in Gate2AudienceStep and InsightsStep. Branch back-navigation correctly restores prior segment + personification + insights.
- **v1.8 budget-confirm fix intact.** `handleBudgetConfirm` calls `goToNextGate1Section` via the handler bag.
- **v1.8.1 mammoth fix intact.** `/api/parse/route.ts` still uses `{ buffer: Buffer.from(arrayBuffer) }`.
- **Three-tenets standard preserved.** CreativeTenets component untouched.
- **Verbatim production timeline preserved.** `productionTimelineRaw` field is what gets surfaced; the parsed numeric is filter-only.
- **session-storage migration is consumer-safe.** Both call sites (page.tsx `startFresh`, OutputStep post-download) updated to pass `briefId`.

---

## Section 3 — Vault data integrity audit

### Verdict: ✅ with documented gaps

`src/lib/vault-content.json`:
- **33 concepts** parsed (matches V5 doc expectation exactly).
- **Category distribution:** destination 12, lodging 11, non-endemic 7, airline 2, car 1. Matches expected exactly.
- **Title extraction** used the first quoted string in Idea Summary because the source Word doc renders concept titles as text shapes that mammoth doesn't extract. Documented in `scripts/parse-vault.ts`.
- **One concept hand-renamed** in JSON: Icelandair "Two Cultures, One Journey" (no quoted title in source).
- **8 concepts with null productionTimelineRaw + empty productionBudget** — all genuine source gaps, not parser bugs:
  - car: The Open Road (Volkswagen) — known broken per V5 doc
  - non-endemic: One Click to Mahi Mahi (Klarna), Point A to Yayyy (Klarna), Smoooth Recognition (Klarna), Look Book (Klarna + Estee Lauder), Spotlight Festivals (Klarna), Audible Travel Experiences (Audible), Ready, Set, Visa (Visa)
- **Non-endemic excluded from v1 matcher** so 7 of the 8 gaps don't affect v1 behaviour. Volkswagen is the canonical "known broken" car concept.
- **Filter behaviour on empty productionBudget:** treated as in-range with no flag. After API hardening (Task 36), the filter is now never asked about extreme budget values that would surface broken concepts.

### Spot-check (manual against the source doc)

- **Next Stop** (destination): `productionTimelineRaw: "12-14 weeks"`, `productionBudget: [{label: "3x films", minUsd: 300000, maxUsd: 300000}]` — matches source.
- **Q&A to B** (destination): full ideaSummary, creativeMechanism, channelsFormats. Matches source.
- **Choose Your Own Adventure** (destination): correctly parsed including its "Choose Your Own Adventure" name from the quoted Idea Summary opener.

---

## Section 4 — API endpoint deep test

### Verdict before fixes: ❌ (3 bugs)
### Verdict after fixes: ✅

**Probe matrix run against /api/vault before hardening:**

| Probe | Input | Result |
|---|---|---|
| 1 | destination $300k | ✅ 3 ranked matches (A strong, B/C plausible) |
| 2 | destination $100k | ✅ 5 matches (narrow filter still hits) |
| 3 | destination $500k | ⚠ 1 match — filter narrow at high budget |
| 4 | airline $300k | ✅ 3 matches all `adjacent` (only 2 same-category concepts) |
| 5 | car $300k | ✅ 3 matches (1 same-category, 2 adjacent) |
| 6 | partnerType=non-endemic | ✅ Returns concepts from OTHER categories (non-endemic filtered out, partnerType treated as ranking signal) |
| 7 | budget=0 | ❌ **Bug:** returned 1 concept (Volkswagen, whose empty productionBudget array survived the filter) |
| 8 | budget=$100M | ❌ **Bug:** same — Volkswagen leaked through |
| 9 | mustHaveChannels=['video'] | ✅ 3 matches |
| 10 | mustHaveChannels=['ooh'] | ✅ 0 matches (correct — no destination concept lists ooh) |
| 11 | missing partnerType | ❌ **Bug:** silently accepted, returned 3 cross-category matches |
| 12 | invalid mode | ✅ `{"error":"Unknown mode"}` 400 |
| 13 | narrative-draft valid id | ✅ 6 stub slides returned |
| 14 | narrative-draft invalid id | ✅ `{"error":"Concept not found"}` 404 |
| 15 | empty body `{}` | ⚠ Returned `{"error":"Unknown mode"}` — works but error message generic |
| 16 | malformed JSON | ❌ **Bug:** returned 500 instead of 400 |
| 17 | GET | ✅ 405 (Next.js default) |

**Bugs fixed in commit dcf48c1:**

1. **Malformed JSON now returns 400** with `{"error":"Malformed JSON body"}` — wrapped `req.json()` in its own try/catch.
2. **Required fields validated** — added `validateMatchRequest()` that checks partnerType is one of the 5 valid categories, productionBudgetUsd is a finite number between $1k and $50M, and rejects with 400 + specific error message.
3. **Extreme budgets rejected** — productionBudgetUsd must be in [$1k, $50M]. Volkswagen can no longer leak through extreme inputs because validation rejects them before the filter runs.

**Probe matrix re-run after fixes (all 7 edge cases now return appropriate 400s with descriptive messages):**

```
Test 1: malformed JSON → 400 "Malformed JSON body" ✅
Test 2: missing partnerType → 400 "partnerType is required" ✅
Test 3: budget=0 → 400 "productionBudgetUsd must be at least 1000..." ✅
Test 4: budget=$100M → 400 "productionBudgetUsd exceeds realistic ceiling ($50M)" ✅
Test 5: happy path destination $300k → 3 matches ✅
Test 6: invalid partnerType → 400 "partnerType must be one of: ..." ✅
Test 7: narrative-draft missing conceptId → 400 "selectedConceptId is required for narrative-draft mode" ✅
```

---

## Section 5 — End-to-end functional walkthroughs

### Walkthrough A — Happy path, strong matches: ✅ (with stub artefact)

Code-level trace verified through the handlers and step components:

1. ✅ Upload → triage → Gate1 sections → brand → audience (single branch) → insights — existing flow unchanged.
2. ✅ Insights confirmed → `handleConfirmInsights` writes selectedInsights to audienceBranches[0].insights, derives partnerType + productionBudgetUsd, sets step `vault_decision`, fires `fireBackgroundMatcher` via setTimeout.
3. ✅ Background matcher POSTs /api/vault with mode 'match' → returns 3-5 ranked matches → `state.vaultMatchPreview` populated with signal `strong` (since stub always returns first match as strong) and `state.vaultResult` cached.
4. ✅ VaultDecisionStep renders brief recap + preview signal card + two large buttons. Default highlight on Vault for strong signal.
5. ✅ CP clicks "Take to the Vault" → `handleVaultDecision('vault')` → single-branch case so step becomes `vault_production_budget` if no productionBudgetUsd, else `vault_matches`.
6. ✅ If gate fires: VaultProductionBudgetStep with quick-picks → submit calls `handleVaultProductionBudgetConfirm(budget)` → state updated, matcher re-fires with explicit budget.
7. ✅ VaultMatchListStep renders 3-5 cards. CP toggles selection. Creative Lab reminder appears when 1+ selected.
8. ✅ "Expand into pitch pack" → `handleVaultProceedToDraft` → step becomes `vault_narrative_draft` → `handleVaultGenerateNarrative` fires for each selected concept.
9. ✅ VaultNarrativeDraftStep renders 6 slide cards with hint text per slide. Each slide is an editable textarea inside a styled card.
10. ✅ CP edits Slide 5 → `updateSlide` writes back to `state.vaultResult.narrativeDrafts[conceptId].slides.tailoringTo`.
11. ✅ "Export pitch pack" → step `vault_export`.
12. ✅ VaultExportStep renders pack contents summary + Export button. Click → `handleVaultExport` builds resume URL via `buildResumeUrl(window.location.origin, state)`, calls `exportVaultPack` which generates the .docx, sets `state.vaultResult.exportedAt` + `resumeToken`.
13. ✅ Green confirmation block renders.

**Stub artefact (not a bug, will resolve in Task 31):** the stub matcher always marks the first ranked candidate as `strong` regardless of actual fit. Real Claude prompt will compute confidence based on real semantic match.

### Walkthrough B — Multi-audience + audience picker + stretch: ✅

1. Audience flow produces multiple branches → both processed sequentially in Gate2AudienceStep.
2. handleConfirmInsights at end of last branch → vault_decision.
3. Matcher fires using audienceBranches[currentBranchIndex].insights.
4. CP picks Vault → `handleVaultDecision('vault')` → multi-branch case: step becomes `vault_audience_picker`.
5. VaultAudiencePickerStep renders cards for each branch + "All combined" dashed card with radio indicators (Brand-Alignment-style selection pattern).
6. CP picks → `handleVaultAudiencePick(branchIndex)` re-fires matcher with explicit branchInsights override + routes to vault_production_budget or vault_matches.

### Walkthrough C — No production split, gate fires: ✅

1. Brief with totalBudget but no productionBudget → `deriveProductionBudgetUsd(state)` returns null.
2. handleConfirmInsights persists null → vault_decision shows "production budget: to be confirmed" in recap.
3. CP picks Vault → since productionBudgetUsd is null, route is vault_production_budget regardless of branch count.
4. VaultProductionBudgetStep renders input + quick-pick chips (10/15/20% of total).
5. CP confirms → state updated + matcher re-fires with explicit budget.

### Walkthrough D — Loopback: ✅ (code-level trace)

1. CP exports pack from VaultExportStep → resume URL built via `buildResumeUrl(window.location.origin, state)` → state's resumeToken populated.
2. URL like `http://localhost:3000/?resume=<base64>`.
3. CP opens that URL later → page.tsx's first useEffect fires before the session-restore effect.
4. `decodeResumeToken(token)` returns the ResumeSlice → `updateState({...slice, step: 'gate2_tenets', resumedFromToken: true})` → URL cleaned via `window.history.replaceState`.
5. CreativeTenetsStep renders with the rejected-Vault sidebar showing `vaultResult.rankedConcepts.map(m => m.conceptName).join(', ')`.
6. Existing Creative Tenets flow continues to media → output → export to Creative Lab.

### Walkthrough E — Continue to Creative Tenets (existing flow preserved): ✅

1. CP at vault_decision picks "Continue to Creative Tenets" → `handleVaultDecision('creative-lab')` → step becomes `gate2_tenets`.
2. Existing CreativeTenetsStep (with the Phase 1 extraction intact) renders. No rejected-Vault sidebar because resumedFromToken is false.
3. Existing tenets → media → output flow plays out unchanged.

### Limitations of this walkthrough

As a subagent / assistant I cannot drive a real browser to click through the UI. The walkthroughs above are code-level traces that verify the state transitions and the rendered JSX would produce the expected layout. **Will should still do a manual browser walkthrough** before the 29 May review.

---

## Section 6 — Specific edge cases & invariants

| Invariant | Verified by | Verdict |
|---|---|---|
| Background matcher fires on insights save, not vault decision | Read handleConfirmInsights — setTimeout(...0) fires before step transition completes | ✅ |
| Audience branching never flattened (except deliberate "All combined") | grep `flatMap.*audienceBranches` returns only the "All combined" path in useHandlers + the dispatch fan-out in InsightsStep | ✅ |
| Production timeline reproduced verbatim | Read stubMatcher — uses `c.concept.productionTimelineRaw \|\| 'Timeline TBC'`. Real Claude prompt will preserve the same field | ✅ |
| Non-endemic excluded in v1 | vault-filter.ts line 53 `.filter(c => c.category !== 'non-endemic')`. Tested via API probe — non-endemic concepts never surface from the filter | ✅ |
| No refuse-to-match | stubMatcher always returns rankedConcepts. topLineNote fires when all stretch but matches still surface | ✅ |
| Top-line note fires when all stretch | Verified via stubMatcher logic + UI rendering in VaultMatchListStep | ✅ |
| Resume token roundtrip preserves audienceBranches | 5 TDD tests in vault-resume-token.test.ts. Verified manually that ResumeSlice keys include `audienceBranches`, `currentBranchIndex` | ✅ |
| Three-tenets invariant | CreativeTenets component untouched throughout the refactor + Vault build | ✅ |
| v1.8 budget-confirm fix | handleBudgetConfirm at useHandlers.ts:495 calls goToNextGate1Section() | ✅ |
| Storage key migration idempotent | MIGRATED_FROM_LEGACY_KEY check at top of migrateLegacySession + test "migrates the legacy single-key session on first load" | ✅ |
| Background matcher uses fresh state for partnerType + budget + insights | fireBackgroundMatcher refactored in Task 25 to accept explicit overrides — stale-closure fragility eliminated | ✅ |

### Two minor observations (not blockers)

1. **handleConfirmInsights' branch flow has a redundancy:** when InsightsStep's "all branches done" path runs, it writes `selectedInsights: allInsights` (flattened across branches) via inline updateState, then calls `handleConfirmInsights` which writes `selectedInsights` (still the pre-merge value from closure) into `audienceBranches[currentBranchIndex].insights`. Functionally fine because the per-branch insights were already written during each branch's confirmation; mildly redundant.

2. **Non-endemic partnerType + non-endemic filter exclusion** creates an odd interaction. If a brief has `partnerType: 'non-endemic'`, the filter still excludes non-endemic concepts so the matcher returns matches from other categories all labelled `adjacent`. The CP would see "this is a non-endemic brief but we're showing destination matches." Acceptable for v1 (per spec, non-endemic should route to Creative Lab in v1.5), but worth surfacing more clearly when this happens. For now, the spec says "route non-endemic briefs to Creative Lab in the meantime," so the right UX is to never reach the matcher with partnerType=non-endemic. The brief structure + derivePartnerType heuristic should keep this from happening in practice.

---

## Fixes applied in this testing pass

### Critical
- ✅ **Vault UI redesigned** to match the existing tool's design language (6 components, all rewritten)

### Important
- ✅ **API now validates required fields** with descriptive error messages (partnerType required, must be valid category)
- ✅ **API returns 400 on malformed JSON** instead of 500
- ✅ **Budget bounds** ($1k-$50M) prevent extreme inputs from leaking broken concepts
- ✅ **Filter handles empty productionBudget gracefully** with "Budget TBC" / "Timeline TBC" fallback strings in match output (no more empty fields landing in match cards)

### Minor (documented, not fixed)
- The stub matcher's "first match = strong" artefact will resolve when Tim's prompt lands (Task 31)
- handleConfirmInsights' branch flow has a redundant write (no behavioural impact)

---

## What's left

1. **Manual browser walkthrough by Will** of the redesigned flow against a real brief. The subagent can't drive a browser; need human eyes for the actual visual confirmation.
2. **Tim's matching prompt** (Task 31) — one-file swap into `src/lib/prompts/vault-match.ts` + replace the stub matcher in `/api/vault/route.ts` with a real Claude call following `src/app/api/triage/route.ts` pattern.
3. **Richard's narrative-draft prompt** (Task 32) — same pattern.
4. **Push the branch** when ready to share with Tim or deploy.

Branch state: `vault-build` at `dcf48c1`, 32 commits ahead of main. Clean tree.

---

*Test pass complete 2026-05-20. Findings recorded.*
