# Vault Build — Subagent Context Pack

> **READ THIS FIRST.** Every subagent picking up a task from `2026-05-20-vault-build-implementation.md` must read this document end-to-end before touching any code or invoking any tool. The plan tasks are tight by design and assume you arrive with the context below already loaded. If you skip this, you will make mistakes that look reasonable in isolation but break things downstream.

This pack exists because the build is two days, 33 tasks, fresh subagent per task. Without a shared briefing each subagent comes in cold, doesn't know what the previous one did, doesn't know the conventions of the codebase, doesn't know which architectural walk-backs are load-bearing, and accidentally undoes decisions that look optional but aren't. The pack is the floor of context every subagent stands on.

---

## 0. Read order

Every subagent does these reads, in this order, before writing any code:

1. **This document** end-to-end (you are here)
2. **The spec:** `/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/docs/specs/2026-05-20-vault-build-design.md` — Sections 1-9 are required; Sections 10-15 you can skim
3. **Your specific task** in `/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/docs/plans/2026-05-20-vault-build-implementation.md`
4. **The files your task touches** — read each one in full before editing. Do not assume you know what's there. The 3,291-line page.tsx has more in it than any summary suggests.
5. **The most recent prior task's final commit** — read the commit message and the diff. This tells you the actual state of the repo right now, not what the plan SAYS the state should be. If they diverge, surface that immediately before proceeding.

Then start your task. Not before.

---

## 1. What the Pitch Pack Tool is

The Pitch Pack Tool (called "the CBT" or "Creative Brief Builder" in some docs, "pitch-pack-tool" in the repo) is a live Next.js application deployed on Railway at https://pitch-pack-tool-production.up.railway.app. It's used by Commercial Partners (CPs) at Expedia Group's in-house creative agency, E Studio, to upload inbound creative briefs and walk them through a structured review and rebuild before the brief goes to the Creative Lab for ideation.

The tool exists because CPs receive briefs from sellers under tight SLAs, the briefs vary wildly in quality, and the Creative Lab needs structured input to do good ideation. The tool's job is to triage the incoming brief, surface contradictions and vagueness, and walk the CP through rebuilding each section with AI assistance until the brief is strong enough to feed forward.

The tool covers Expedia, Hotels.com, and Vrbo brands. Three audiences inside Expedia matter for our work: **Tim** (engagement lead at the Audience Strategies team, the primary stakeholder and architect of the Vault build), **Fausto** (sole creative strategist at E Studio, defines quality standards, did the v1.7 user testing), **Richard** (writes the Audience/Human Truth prompts and now the Vault matching prompt), **Kirsty** (creative team lead, owns DG match rules and the test brief set for the Vault prototype review), **Dave** (the most senior CP, owns the Vault content, did the original GPT spec we're building against), **Cynthia** (will need to confirm Drive permissions for reference materials), **Kat** (current maintainer of the Vault Word document).

Will Bainbridge is building this. He's the engineering owner. Tim is the architecture owner. Richard is the prompts owner.

Current tool version is v1.8.1 (live as of 2026-04-10). The codebase passes 61/61 vitest tests. The build is clean. The most recent change was a hotfix to fix `.docx` upload that had been silently broken for a month due to a mammoth library API mismatch. Don't reintroduce that bug.

---

## 2. What we're adding

The Vault is roughly 33 validated creative concepts that E Studio has accumulated, held in a Word document on Drive called `THE VAULT_November 2025_Kat.docx`. The Vault build inserts a step into the existing brief flow that lets the CP check whether the Vault already has a concept matching the brief before going to net-new ideation via Creative Lab.

The fork sits between Step 4 (Human Truths, called "audience_insights" in code) and Step 5 (Creative Tenets). The CP confirms their insights, the tool fires a background matcher against the Vault, the CP sees a decision screen with a preview signal, and they choose: take the Vault path, or continue to Creative Tenets as today.

If they take the Vault path, the tool shows ranked matches (Top Match A-E with Strong/Plausible/Stretch confidence labels), the CP picks one or more concepts to expand, the tool generates a six-slide narrative draft per concept, and the pack exports as a .docx with a resume token at the bottom. If the buying client later rejects the Vault concept, the CP clicks the resume link and lands back in the tool at Step 5 (Creative Tenets) with a sidebar showing the rejected matches.

The full architectural reasoning lives in `vault-architectural-decision.md` (V5) in Will's `03_Inbox/`. Read it if anything in this pack feels under-specified.

---

## 3. History you need to know

There have been five iterations of the architectural design. You only need to know the last three:

**V2 (March 13, Will's review of Tim's V1).** Will reviewed Tim's original engineering brief and flagged four things: the loopback path was fictional because session state was localStorage-only with a 24-hour expiry, the data model didn't map to the actual `SessionState` shape, the existing audience branching wasn't accounted for in the matcher prompt, and the "extend /api/chat" referenced something that doesn't exist. Will proposed resume tokens in the export, per-briefId session storage, audience picker for multi-branch briefs, new `/api/vault` route, and running the matcher in the background.

**V3 (May 12, Tim's session that over-corrected toward Dave's GPT).** Tim pulled Dave's custom GPT spec and inadvertently adopted it wholesale. This brought in 5-star ratings, hard partner-type gating, three separate gates (partner type, brief analysis, production budget), refuse-to-match behaviour, and over-fidelity to ChatGPT's constraints. Some of that was reasonable; some was structurally wrong because we're not building inside ChatGPT.

**V4 (May 13, Tim's walked-back engineering brief).** Walked back the over-corrections. Kept Top Match A-E, two-stage output (matches + narrative draft), verbatim production timeline, the six-slide structure, Creative Lab reminder. Walked back to Strong/Plausible/Stretch labels (not 5-star), partner type as soft ranking signal (not hard gate), one new screen not three (just production budget), no refuse-to-match, non-endemic deferred to v1.5.

**V5 (May 13, Tim's architectural decision doc).** Confirms V4's walk-backs and adds the Steadman extensions: CBT triage on Slide 1 of the narrative draft, deployment examples embedded on Slide 4, era flags and last-validated dates on Slide 6, optional Slide 7 for objections (deferred to v1.5).

The V5 doc is the canonical reference. If V5 contradicts the plan or this pack, V5 wins for design decisions; the plan wins for implementation order.

---

## 4. Codebase reality

The code lives at `/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/`.

Stack: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Anthropic Claude Sonnet 4.6, Vitest, mammoth.js for `.docx` parsing, docx for `.docx` export, Railway for deployment.

The most important file is `src/app/page.tsx`. It is 3,291 lines. It contains the entire UI flow as inline closures. The eleven step renderers (renderUploadStep, renderTriageStep, etc.) are defined inside the page component as `const X = () => {...}` and close over the local state and handler functions. This is what we're refactoring on Wednesday.

The state lives in a single `SessionState` interface defined in `src/lib/types.ts`. It's a flat object with around forty fields. The step machine is a string union (`Step`) with values like `'gate1_sections'`, `'gate2_audience'`, `'gate2_insights'`, `'gate2_tenets'`, `'output'`. The Vault build adds six new step values to this union.

The API routes live under `src/app/api/`. There's no `/api/chat` despite some docs implying there should be. The existing pattern is one route per capability: `/api/triage`, `/api/section/route.ts`, `/api/section/builder`, `/api/generate/audience`, `/api/generate/tenets`, `/api/generate/truths`, `/api/brand-fit`, `/api/output`, `/api/parse`. The Vault build adds `/api/vault/route.ts` following this convention.

The Claude client lives at `src/lib/claude.ts`. Read it. The existing routes use `messages.stream` with a max_tokens of 8192. Match this pattern in the Vault matcher.

Session persistence is currently in `src/lib/session-storage.ts`. It uses a single `STORAGE_KEY = 'pitch-pack-session'` with a 24-hour expiry. The Vault build migrates this to per-`briefId` keys with a 30-day expiry. Task 21 has the full new file content.

The Word export is at `src/lib/word-export.ts`. It's 184 lines, parses markdown to docx via the `docx` library, currently exports the final brief. Task 29 extends it with an `exportVaultPack` function that adds the Vault pack output structure.

The audience branching code is at `src/app/page.tsx` line 1542 onward (`handleSelectAudience`). When the CP picks multiple audience segments, the code creates one `AudienceBranch` per segment and walks each one through personification + insights sequentially. By the time the CP reaches the Vault fork, all branches have been processed. The Vault audience picker step (Task 25) chooses which branch's insights to use for matching, or merges them all. Read the existing branching code before touching anything related.

The tool uses CSS variables for the visual language. Common ones: `var(--expedia-navy)` for primary brand colour, `var(--status-green)`, `var(--status-amber)`, `var(--status-red)` for the traffic-light status colours used in triage assessment, `var(--bg-tertiary)` for muted surfaces, `var(--text-muted)` for secondary text, `var(--border-color)` for default borders. Use these variables, not hardcoded hex. The Vault step components in the plan already do.

---

## 5. The architectural change in one paragraph

We are doing two things on top of the existing tool, in order. First, a context refactor: the page component wraps in a `BriefStateProvider` from a new `BriefStateContext.tsx`, the eleven step renderers extract from page.tsx into individual files under `src/components/steps/`, the handler closures move into a `useHandlers` custom hook, the progress hooks move into a `useProgressHooks` custom hook. This doesn't change behaviour, only where the code lives. Then, on the new foundation, the Vault build: six new step components, a deterministic pre-filter, a resume token codec, a per-briefId session storage migration, and a new `/api/vault` endpoint that calls Claude with Tim and Richard's prompts. Tim's prompts integrate as one-file swaps against a stub matcher we build first.

---

## 6. Critical invariants — things that must not change

These are non-negotiable. If your task seems to require breaking any of these, stop and surface the conflict.

**Existing behaviour does not change during the refactor.** Tasks 1-17 are a pure refactor. The tool runs exactly as it does on `main` after each task, just with code in different files. The 61 existing vitest tests must pass after every task. The end-to-end smoke test in Task 17 must show zero behavioural difference vs. main.

**The `.docx` upload must keep working.** The v1.8.1 hotfix that fixed mammoth's `arrayBuffer` API mismatch is at `src/app/api/parse/route.ts`. Do not regress this. The parse pipeline uses `mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) })`, not `{ arrayBuffer }`. If you touch the parse route for any reason, verify a `.docx` upload still works after your change.

**The three tenets standard.** Creative tenets are 3, not 4. The v1.8 launch sprint dropped from 4 to 3 per Fausto's feedback. Don't reintroduce a fourth.

**The four-option spectrum stays.** The section builder produces four options on the Lifted Directly → Light Adaptation → Inspired By → Ruthless Clarity spectrum. Don't reduce or rename these.

**Audience branching is structurally important.** The `audienceBranches` array, `currentBranchIndex`, and the per-branch insight storage are load-bearing. Don't flatten them, don't replace them with a single segment, don't change the order (primary first, then secondaries). The Vault flow respects this structure; it doesn't replace it.

**Status traffic lights (green/amber/red) are how triage communicates.** Don't relabel or recolour them.

**The Vault matcher always surfaces what it found.** No hidden threshold, no refuse-to-match. If everything is a Stretch, the top-line note recommends Creative Lab but the matches still render. This was a deliberate walk-back from V3.

**The production timeline is verbatim.** Never normalise. The `productionTimelineRaw` field is source of truth for display; the parsed numeric `productionTimeline` is filter-only.

**Non-endemic is excluded in v1.** The seven concepts (Klarna, Visa, Audible, Estee Lauder) are filtered out entirely. v1.5 brings them back if Kirsty asks.

**Klarna is four independent concepts in v1.** Don't add a campaign-suite wrapper. v1.1 adds it if Dave confirms programme intent.

**Loopback uses a resume token in the exported pack, not a database.** No server-side persistence. The token is base64-encoded JSON in a URL query param. The localStorage layer is per-briefId with 30-day expiry, but it's NOT the persistence story for the seller-client cycle.

**Sections use the `SECTION_CONFIG` registry in `types.ts`.** Don't hardcode section names elsewhere. If you need to iterate sections, use `GATE1_SECTION_KEYS`, `GATE2_SECTION_KEYS`, or the full `SECTION_KEYS` arrays.

---

## 7. Conventions

**File and component naming.** Step components live in `src/components/steps/` with `PascalCase.tsx` names (`UploadStep`, `VaultMatchListStep`). Lib utilities live in `src/lib/` with `kebab-case.ts` names (`vault-filter.ts`, `vault-resume-token.ts`). Hooks live in `src/lib/state/` with `useThing.ts` names. The existing repo follows these patterns; the plan tasks match them.

**Imports use the `@/` alias.** `import { useBriefState } from '@/lib/state/BriefStateContext'`. Not relative paths from `src/`.

**Server-side parsing.** All file parsing happens server-side via `/api/parse`. Do not move it client-side. The v1.8 migration was deliberate.

**Editing existing handlers.** When you modify a handler in `useHandlers.ts`, never silently change its behaviour for the existing flow. Add Vault-specific branching with explicit conditions. Example: `handleConfirmInsights` in Task 24 advances to `vault_decision` instead of `gate2_tenets`, which is a deliberate change required by the new flow. That's fine. But changing `handleSelectAudience` to silently merge branches would not be fine.

**Commit messages.** Use Conventional Commits: `feat(vault): ...`, `refactor(steps): ...`, `test(vault): ...`. The plan tasks include the exact messages. Use them as-is.

**Test placement.** Lib-level tests go in `src/lib/__tests__/<name>.test.ts`. Existing tests for `file-parser.ts`, `prompts.ts`, `types.ts` already follow this. New Vault tests in the plan match it.

**Tailwind CSS variables.** Use `var(--expedia-navy)`, `var(--status-green)`, etc. as listed in Section 4. Never hardcode brand colours. Never use generic Tailwind primary colours.

**Voice in user-facing strings.** Australian English. Tight, direct. No "I'll" framing in tool copy — the tool is a tool, not an assistant pretending to be a person. Look at existing strings in `BrandAlignment.tsx`, `CreativeTenets.tsx` for the tone.

---

## 8. Coordination protocol between tasks

Tasks run sequentially. Each task starts from the post-commit state of the previous task. There is no parallel execution within this plan.

**Before starting a task:**

1. Run `git status` and confirm the working tree is clean. If it isn't, the previous task didn't commit cleanly; surface this immediately.
2. Run `git log --oneline -5` and confirm the most recent commit matches the previous task's commit message. If it doesn't, you're on the wrong branch or someone else committed; surface this.
3. Read the files your task is about to touch. Compare what's actually there to what the plan describes as "current state". If they diverge, surface this before writing code.

**During a task:**

1. Make changes only to the files listed in your task's `Files:` block. If you find you need to touch a file not listed, surface this rather than expanding scope silently.
2. Run `npx tsc --noEmit` after non-trivial changes. The TypeScript compile is your safety net.
3. Run `npm run test` after lib changes. Don't skip this.
4. Run `npm run dev` and smoke-test in a browser when the plan says to. Don't claim a UI works without seeing it work.

**After completing a task:**

1. Run the typecheck, tests, and (when called for) the smoke test.
2. Commit with the exact message in the plan.
3. Confirm `git status` is clean.
4. End your turn with a clear summary: what changed, what you tested, what the next task will start from. Include the commit hash.

**If a task partially fails:**

Do not commit a half-done task. Either complete the task fully (including the commit step) or roll back your changes with `git restore .` and surface what blocked you. A half-committed task corrupts the next subagent's starting state.

---

## 9. Failure modes to watch for

These are the specific ways a subagent can damage this build. Read them.

**Re-introducing inline closures during the refactor.** When extracting a step to its own file, the temptation is to leave a small wrapper closure in page.tsx that calls the new component. Don't. The extracted component is the dispatch target directly. The plan tasks show this explicitly.

**Missing the handler bag updates when adding Vault handlers.** Tasks 24-29 each add or modify entries in `useHandlers.ts`. The `UseHandlersReturn` interface must be kept in sync with the returned object. If you add `handleVaultX` to the returned bag, you also add it to `UseHandlersReturn`. The plan calls this out explicitly in Task 27 because it's the easiest one to miss.

**Forgetting that the matcher fires on insights save, not on Vault decision.** The background matcher fires in `handleConfirmInsights` (modified in Task 24) so the preview signal is ready BEFORE the decision screen renders. Don't fire it from `handleVaultDecision`; that would defeat the purpose.

**Re-firing the matcher without honouring the audience branch choice.** The matcher uses `state.vaultAudienceBranchIndex` to pick which branch's insights to send. On first fire it's null, so it defaults to `currentBranchIndex`. After the audience picker step it's set explicitly. The matcher must re-fire with the new branch choice after the picker. Task 25 has the exact pattern.

**Merging multi-branch insights silently.** The audience picker offers a deliberate "All combined" option. Until the CP picks that, the matcher uses one branch's insights. Do not flatten branches without an explicit user choice.

**Skipping the production budget gate when it shouldn't be skipped.** Skip the gate only when `state.productionBudgetUsd` is already populated (the brief had an explicit production split). Don't skip based on the presence of any budget field — only the production-specific one.

**Building the vault-content.json by hand.** Use the parser in Task 18. Hand-fix only the broken entries (Volkswagen, anything that parsed with empty fields). The script is the source of truth for the structure; manual edits are corrections.

**Treating the resume token as encrypted.** It isn't. For v1 it's plain base64 JSON. Don't add auth or signing. If InfoSec needs it, that's a v1.1 layer-on.

**Calling the prompt files before Tim delivers.** Tasks 23 and 28 ship with stub prompt files containing placeholder text. The API route uses a deterministic stub matcher until Tasks 31 and 32 swap in the real prompts. If you reach Tasks 31/32 and Tim hasn't delivered, surface that — don't invent prompt text.

**Touching files outside the Files: block.** Each task lists exact files. If your work seems to require changing a file that isn't listed, stop and surface this. Scope creep destroys the sequencing.

**Pushing to remote before Task 33.** Don't push. Work entirely local on the `vault-build` branch until the final task. The push happens once at the end after smoke tests pass.

**Committing with the wrong message format.** Use the exact message in the plan task. The messages are linked to the sequence; a wrong message breaks the audit trail.

**Smoke-testing only the happy path.** When the plan says "smoke test", it means at least the happy path plus one edge case. For multi-branch tasks (Tasks 12, 25), smoke-test the multi-branch case specifically — it's where bugs hide.

---

## 10. What to do when uncertain

If you reach a moment where the plan, the spec, this pack, or the code seems ambiguous or inconsistent:

1. **Stop writing code.**
2. State the conflict explicitly in your output: which document said X, which said Y, what you'd do in each direction.
3. End your turn without committing. The reviewing human resolves the conflict and dispatches you again or moves on.

Do not silently pick one option and commit. Half the value of subagent-driven development is the review checkpoint; using it is part of the job.

---

## 11. People and what they do

For any task that involves user-facing language or messaging:

- **Will Bainbridge** is the engineering owner of this build. Australian. Direct. Strong technical opinions. Voice profile in `~/Desktop/World/.alive/key.md`.
- **Tim** (TMR) is the architecture owner and primary stakeholder. He's drafting the matching and narrative-draft prompts with Richard.
- **Richard** writes prompts. His pattern is Role / Task / Logic / Output.
- **Dave** is the most senior CP at E Studio. The Vault content is his. He's validating concepts and consolidating video format franchises this week.
- **Kirsty Collins** is the creative team lead. She owns the DG match rules and the test brief set for the 29 May review.
- **Fausto** is the sole creative strategist at E Studio. Defines quality standards. Did the v1.7 user testing.
- **Cynthia** confirms Drive permissions.
- **Kat** maintains the current Vault Word doc.

You almost certainly will not write user-facing copy in this plan. If you do, ask before writing. Voice matters.

---

## 12. Quick reference: where things live

```
/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/
├── docs/
│   ├── specs/2026-05-20-vault-build-design.md     ← read second
│   └── plans/
│       ├── 2026-05-20-vault-build-CONTEXT-PACK.md ← you are here
│       └── 2026-05-20-vault-build-implementation.md ← task list
├── src/
│   ├── app/
│   │   ├── page.tsx                               ← 3,291 lines, being refactored
│   │   ├── api/
│   │   │   ├── triage/route.ts                    ← canonical Claude call pattern
│   │   │   ├── generate/                          ← per-capability routes
│   │   │   ├── parse/route.ts                     ← server-side file parser
│   │   │   └── vault/route.ts                     ← new, Task 23
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── types.ts                               ← SessionState lives here
│   │   ├── claude.ts                              ← Anthropic client wrapper
│   │   ├── session-storage.ts                     ← localStorage, becoming per-briefId
│   │   ├── word-export.ts                         ← docx export pipeline
│   │   ├── prompts.ts                             ← existing prompts
│   │   ├── prompts/                               ← (new dir, Tasks 23, 28)
│   │   ├── state/                                 ← (new dir, Tasks 2-4)
│   │   ├── vault-content.json                     ← (new, Task 18)
│   │   ├── vault-filter.ts                        ← (new, Task 20)
│   │   ├── vault-resume-token.ts                  ← (new, Task 22)
│   │   └── __tests__/                             ← existing test directory
│   ├── components/
│   │   ├── AudienceMenu.tsx                       ← existing
│   │   ├── BrandAlignment.tsx                     ← existing
│   │   ├── CreativeTenets.tsx                     ← existing
│   │   ├── FileUpload.tsx                         ← existing
│   │   ├── PersonificationReview.tsx              ← existing
│   │   ├── ProductionBudget.tsx                   ← existing
│   │   ├── ...
│   │   └── steps/                                 ← (new dir, Tasks 6-16, 24-29)
│   ├── hooks/
│   │   └── useLoadingProgress.ts                  ← existing
│   └── test/                                      ← existing test fixtures
└── scripts/
    └── parse-vault.ts                             ← (new, Task 18)
```

---

## 13. What this pack does not cover

- The exact wording of Tim and Richard's prompts. Those land in Tasks 31 and 32 when Tim delivers them.
- Telemetry hooks. Not in v1. Deferred mention only.
- Brand Target Audiences deck cross-check. Deferred to v1.5.
- Optional Slide 7 (Objections handling). Deferred to v1.5.
- Drive link auth/SSO patterns. v1 assumes share-with-anyone; auth is a v1.1+ layer if Cynthia requires it.

If a task seems to require any of the above, surface it; do not invent.

---

*End of context pack. Now read the spec, then your task, then go.*
