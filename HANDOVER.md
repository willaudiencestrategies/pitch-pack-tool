# Creative Brief Builder — Handover

Written July 2026 by Will Bainbridge (Steadman AI) for Richard Bowman and whoever takes over development. Everything below was verified against the code on the date of writing. Where something could not be verified from the repo it is marked [TODO: Will to confirm].

## 1. What this is

The Creative Brief Builder (CBB, formerly the Pitch Pack Tool, the repo folder still carries the old name) is a Next.js app that walks an Expedia E Studio Commercial Partner through repairing and enriching an inbound creative brief, and is now mandatory for every CP brief. There are two branches. `main` is the live production app. `vault-build` is the Vault extension, a creative-idea matching layer that forks the flow after the insights step to match the brief against E Studio's library of validated concepts (see `docs/specs/2026-05-20-vault-build-design.md` on that branch). It is built and tested but not merged into main. The app is deployed on Railway (`railway.toml` at the repo root, and `prompts/README.md` documents the workflow of committing to GitHub and waiting about two minutes for Railway to deploy). All LLM calls go to `claude-sonnet-4-6` via the official `@anthropic-ai/sdk`, from a single wrapper in `src/lib/claude.ts`.

## 2. Architecture

### The two-gate workflow

The user moves through six phases, tracked by the `Step` union in `src/lib/types.ts`:

1. **Upload** — drop a brief file (txt, md, doc/docx, pdf; pptx is a stub that asks for a paste). Parsed server-side by `/api/parse`.
2. **Triage** — one big LLM call assesses the whole brief and returns traffic-light scores, synthesised content, contradictions and questions for every section (`EnhancedTriageResponse`). There is also an optional "tell me more" step for adding context before triage.
3. **Gate 1 sections** — the user walks through Objective, Budget, Audience and Creative Task one at a time, editing content, feeding extra info back for reassessment, and confirming each.
4. **Gate transition** — a summary screen between gates.
5. **Gate 2** — five sub-steps in order: Brand alignment (pick Expedia / Hotels.com / Vrbo, with an LLM fit check), Audience (LLM generates a segment menu, the user picks a primary and up to two secondary segments, each gets a personification), Insights (12 LLM-generated insights per audience, user picks up to 3), Creative Tenets (LLM-generated from the primary audience and its insights), Media Context.
6. **Output** — one final LLM call compiles everything into a single markdown brief, which the user copies or exports.

On `main` this entire UI lives in one file, `src/app/page.tsx` (3,337 lines). It holds all state, all handlers, and all step renderers.

### API routes (`src/app/api/`)

All are thin POST handlers that load a prompt, build a system prompt, and call `callClaude`/`callClaudeJSON` in `src/lib/claude.ts`.

- `parse/route.ts` — file text extraction (mammoth, pdf-parse). No LLM, no prompt file.
- `triage/route.ts` — whole-brief assessment. Uses `prompts/triage.json`. This is the longest call in the app.
- `section/route.ts` — reassess or generate a single section. Maps the section key to a prompt file (`creative_task` → `prompts/creative-task.json`, and so on for `objective`, `budget`, `audience`, `media-context`, `research-stimuli`).
- `section/builder/route.ts` — generates the four-option rebuild (`lifted`/`light`/`inspired`/`ruthless`) for a section, using the same per-section prompt files' `generate` block.
- `brand-fit/route.ts` — assesses fit between the chosen brand and the brief's audience/objective. Uses `prompts/brand-fit.json` plus the hard-coded brand definitions in `src/lib/brand-criteria.ts`.
- `generate/audience/route.ts` — two modes: with no `selectedSegment` it generates the segment menu, with one it generates the personification. Both from `prompts/audience.json` (`generate` and `personify` blocks).
- `generate/truths/route.ts` — generates the 12 audience insights. Uses `prompts/audience-insights.json`, with brand context injected from `brand-criteria.ts`.
- `generate/tenets/route.ts` — generates creative tenets from objective, primary audience and selected insights. Uses `prompts/creative-tenets.json`.
- `output/route.ts` — compiles the final brief markdown from all confirmed sections plus audience, personification and insights. Uses `prompts/output.json`.

`vault-build` adds `api/vault/route.ts` and the matching pipeline under `src/lib/vault-match/` (fingerprint, score, rank, config), with the concept library in `src/lib/vault-content.json`.

### The prompt system

Every LLM behaviour is defined in `prompts/*.json`, loaded at request time by `src/lib/prompts.ts` (`loadPrompt` reads the file with `fs.readFileSync`, `buildSystemPrompt` assembles Role / Task / Logic / Inputs / Outputs / Examples / Escape Hatch into a system prompt). Because prompts are read from disk on every request, editing a JSON file and redeploying changes behaviour with no code change. `prompts/EDITING-GUIDE.md` and `prompts/README.md` explain the structure and the edit-on-GitHub workflow for non-developers. Treat those two docs as the manual for prompt tuning.

### How vault-build differs structurally

Beyond the Vault feature itself, `vault-build` carries a large refactor that main never received:

- `src/app/page.tsx` shrinks from 3,337 lines to 784. The step renderers move to `src/components/steps/*` (UploadStep, TriageStep, Gate1SectionsStep, BrandAlignmentStep, Gate2AudienceStep, InsightsStep, CreativeTenetsStep, MediaContextStep, OutputStep, plus the Vault steps).
- All handlers move to `src/lib/state/useHandlers.ts` (~1,000 lines), with state shared through `src/lib/state/BriefStateContext.tsx`.
- Long calls stream. `src/lib/stream-response.ts` wraps the triage work in an NDJSON response that emits a heartbeat line every 10 seconds so proxies never see a silent connection, and `src/lib/read-json-stream.ts` consumes it client-side. The triage route on that branch also sets `maxDuration = 300`.

If you are choosing where to build next, the vault-build structure is the better foundation. Merging it (or at least the refactor) should be an early decision for the new developer.

## 3. Data flow

All working state is a single `SessionState` object (defined in `src/lib/types.ts`), held in one React `useState` in `src/app/page.tsx`. Nothing lives on the server between requests. The server is stateless: every API call receives everything it needs in the request body.

An end-to-end brief looks like this:

1. Upload sends the file to `/api/parse`, and the extracted text lands in `state.brief`.
2. Triage sends `state.brief` to `/api/triage`. The response populates `state.triageResult` and seeds `state.sections` (an array of nine `Section` objects, each with a key, status, content and feedback) with synthesised content and traffic-light statuses.
3. Each Gate 1 reassessment sends the brief, the section's current content and the user's added context to `/api/section`. The response overwrites that section's status/content/feedback in `state.sections`. Sections accumulate: nothing is regenerated unless the user asks.
4. Gate 2 audience and insights calls populate `state.audienceBranches` (see section 5), and on final confirm the audience and audience_insights sections in `state.sections` are written from the branches. Confirming tenets writes the creative_tenets section. Media context is confirmed the same way as Gate 1 sections.
5. Output sends `state.sections` plus audience, personification, selected insights and brand alignment to `/api/output`, which asks the LLM to compile one markdown document. The response is then post-processed deterministically by `ensureTenetsProvenance` in `src/lib/output-postprocess.ts` (guarantees the tenets provenance line when secondary audiences exist) and stored as `state.outputMarkdown`.
6. All three export paths render that same compiled `outputMarkdown`: Copy to Clipboard writes it verbatim, Download as Markdown wraps it in a Blob, and Export as Word converts it to a docx via `markdownToParagraphs` in `src/lib/word-export.ts`. Since commit `98ee0cd` the Word export no longer rebuilds from raw sections when the compiled markdown exists, so the three exports cannot diverge.

## 4. Sessions: storage, expiry, sleep and idle

This answers "what happens when a laptop sleeps or a session idles".

- Sessions persist in **browser localStorage only**, under the key `pitch-pack-session` (`src/lib/session-storage.ts`). There is **no server-side storage at all**. No database, no server sessions, nothing.
- Expiry is **24 hours** from the last save (`EXPIRY_HOURS = 24` in `src/lib/session-storage.ts`). Every save stamps a fresh `expiresAt`, so the clock resets while the user is actively working.
- Auto-save runs on every state change, **debounced by 1 second**, and is skipped while still on the upload step (`src/app/page.tsx`, the effect around line 1126).
- On page load, if a saved session exists and it got past upload, a **restore prompt** appears showing when it was saved and how long remains. "Restore" merges the stored state over fresh defaults (so sessions saved before newer fields existed still load safely). "Start fresh" clears the stored session.

What this means in practice:

- **Laptop sleep or idle**: the saved state survives, because localStorage is durable. What does not survive is any LLM call that was in flight when the machine slept; the fetch dies and the user sees an error with a retry. On waking, work up to the last confirmed state is intact.
- **Browser or tab closed, machine restarted**: same, the session restores within 24 hours.
- **More than 24 hours idle**: the session is deleted on next load and the user starts over. This is the most common "I lost my work" report.
- **Different browser, different machine, incognito**: nothing. localStorage is per-browser per-device. There is no way to hand a session to a colleague or resume on another machine. (vault-build adds a resume-token mechanism for the Vault flow specifically, `src/lib/vault-resume-token.ts`, but the core session remains local.)

## 5. The audience-handler path (the July audience-priority bug)

This is the area behind the recent bug and the July 2026 fixes (`ab0e4b8`, `98ee0cd`, `6d51110`, all 16 July). Read this before touching audience code.

The model is a **branch walk**. When the user confirms audience selection, `handleSelectAudience` (main: `src/app/page.tsx` around line 1554) takes an `AudiencePrioritisation` of `{primary, secondary[]}` (max two secondaries, enforced in `src/components/AudienceMenu.tsx`) and creates one `AudienceBranch` per segment in `state.audienceBranches`. **Index 0 is always the primary.** The tool then walks the branches: for each one it generates a personification, then insights, and the user confirms up to 3 insights per branch. `state.selectedAudienceSegment`, `state.personification`, `state.insightOptions` and `state.selectedInsights` are the *working* copies for whichever branch is current (`state.currentBranchIndex`); confirmed work is written back into the branch.

The original bug: after walking the branches, the working state was left pointing at the **last** branch (a secondary), and tenets, output and Word export all read the working state. So tenets were built from a secondary audience whenever secondaries existed. The fix has four parts:

1. **Per-branch persistence**: each branch now stores its own `insights` *and* `insightOptions` (selected insight ids are only meaningful against the options they were picked from, so options must live with the branch). See the confirm handler in `renderInsightsStep` (main, around line 2786) and `AudienceBranch` in `src/lib/types.ts`.
2. **Primary restore at final confirm**: when the last branch is confirmed, the working state is reset to branch 0 (primary segment, personification, options, insights) before moving to tenets, and the audience / audience_insights sections are written with the primary first and secondaries labelled as such (main, around lines 2830 to 2884).
3. **Tenets are primary-only by construction**: `handleGenerateTenets` sends only the primary audience and its insights, with secondary names passed as context (`secondaryAudiences`), and `handleConfirmTenets` prepends a "Built solely from the primary audience: X" attribution to the section content when secondaries exist.
4. **Deterministic provenance in the output**: because the final compile is an LLM call, the guarantee is enforced in code. `ensureTenetsProvenance` (`src/lib/output-postprocess.ts`) inserts the provenance statement under the CREATIVE TENETS heading of the compiled markdown if it is missing, and the Word export renders the same compiled markdown, so all three exports carry it.

On `vault-build` the same logic lives in `src/components/steps/InsightsStep.tsx` and `src/lib/state/useHandlers.ts`; the fixes were applied to both branches. Also note the re-arm guard: on a revisit where all other branches are already confirmed, the walk goes straight to the merge path rather than walking again (`otherBranchesComplete` in the confirm handler).

## 6. Variable output: architectural or config?

The honest answer is both, and it is worth being precise about which part is which.

`src/lib/claude.ts` sets **no temperature** on its `anthropic.messages.create` calls (verified: only `model`, `max_tokens`, `system` and `messages` are passed), so every generation runs at the API's default temperature. Identical inputs will produce different outputs run to run. That is by design for the creative steps (audience segments, insights, tenets are meant to offer fresh options), but it also applies to the final compile: `/api/output` is itself an LLM call, so even the *assembly* of confirmed content gets re-worded each run.

- **The config part**: adding `temperature: 0` (or low) to the two functions in `src/lib/claude.ts` is a one-line change per function and would substantially reduce variation everywhere at once. You could also thread a per-endpoint temperature through so the compile runs cold while the creative steps stay warm.
- **The architectural part**: even at temperature 0 the API is not guaranteed deterministic, and any step that is an LLM call can drift in wording. Full determinism is not achievable with this design. The pattern that works, already proven in this codebase, is to enforce anything that must be exact **in code, after the compile**: `ensureTenetsProvenance` in `src/lib/output-postprocess.ts` is the template. If the client promises a structural feature of the output, add a post-processor for it there rather than relying on prompt adherence.

## 7. Known issues and fragile areas

All verified in code unless marked otherwise.

- **Undo is off-by-one and partial.** `pushHistory` stores a snapshot of the *pre-action* state, but `undo` applies `history[historyIndex - 1]` (main `src/app/page.tsx` lines 1197 to 1209), which is the snapshot from one action earlier than the one being undone, and `canUndo` requires `historyIndex > 0` so the first action can never be undone at all. Snapshots are also `Partial<SessionState>` containing only the fields each call site chose to pass, so an undo merges a partial state over the current one and can leave related fields (like `step`) inconsistent. Treat undo as unreliable; a rewrite should snapshot full state and apply `history[historyIndex]`.
- **Word export renderer gaps.** `markdownToParagraphs` in `src/lib/word-export.ts` handles headings (H1-H4), bullets, numbered lists, bold/italic, horizontal rules and the Differentiator prefix, but not tables or blockquotes. If a prompt change makes the compile emit a table, the docx will contain raw pipe characters.
- **Budget silent drop (Tim's bug) — FIXED 16 July.** Root cause was two advance paths: `ProductionBudget` holds figures in local component state and only writes `state.budgetDetails` via its own "Confirm Budget", while the generic section footer and the floating forward arrow both advanced without capturing. Both bypasses are now closed on the budget section (footer hidden, arrow disabled with an explanatory tooltip), and the typed figures now travel to the output compile as an authoritative "Confirmed Budget" block. If a new advance path is ever added to Gate 1, gate it the same way.
- **Brand selection friction — timeout fix applied 16 July, root cause still unconfirmed.** `src/components/BrandAlignment.tsx` gates the continue button on an async brand-fit LLM check, and for moderate/weak fits additionally on an acknowledge tick (`fitAcknowledged`); strong fits auto-acknowledge and errors auto-acknowledge. A hung fit call previously left the button disabled forever; the fetch now aborts after 45 seconds, which auto-acknowledges and unblocks. Not yet reproduced with the original reporter, so treat as mitigated rather than confirmed fixed.
- **Long triage calls.** Triage takes roughly 60 to 110 seconds in production (the streaming code on vault-build documents 60 to 90 as the working assumption). On `main` the only protection is `fetchWithRetry` (`src/lib/fetch-with-retry.ts`, one retry on a network-layer drop, deliberately no retry on HTTP errors). `vault-build` additionally streams NDJSON heartbeats every 10 seconds (`src/lib/stream-response.ts`) so intermediary proxies never kill an apparently idle connection. That streaming fix has not been merged to main.
- **Chrome on the EG network intermittently fails.** This is the same root cause as the June "Failed to fetch" reports: the multi-minute `/api/triage` request gets killed at the network layer (proxy timeout on an apparently idle connection). The June fix on `main` retries once and shows a clear message, which helps but cannot survive a network that consistently kills long requests; Safari evidently tolerates the long-idle connection better, hence the "use Safari" workaround. The proper fix is the vault-build streaming keep-alive (previous bullet), which keeps bytes flowing every 10 seconds so the connection never looks idle. Porting that to `main` (or merging the refactor) is the recommended resolution.
- **No server-side storage.** Consequences: no cross-device or shareable sessions, no team visibility into who has built what, and no persistent analytics. `logAnalytics` in `src/lib/analytics.ts` writes the brief score to the browser console and to a `pitch_pack_analytics` localStorage array capped at the last 100 sessions, on the user's own machine only, fired once when output is compiled. The only server-side telemetry is the structured JSON line each API call logs to stdout from `src/lib/claude.ts` (endpoint, duration, token counts), visible in Railway logs but not aggregated anywhere.

## 8. Running and deploying

Local:

```bash
cp .env.example .env.local   # then set ANTHROPIC_API_KEY, the only env var
npm install
npm run dev                  # http://localhost:3000
npm run test:run             # vitest, one-shot
npm run build && npm start   # production build
```

Node 20+ is required (`engines` in `package.json`, `.nvmrc`, and `railway.toml` pins Node 20 for Nixpacks).

Deployment is Railway, configured by `railway.toml` (Nixpacks builder, healthcheck on `/` with a 300 second timeout because Claude calls are long, restart on failure). `prompts/README.md` describes the working loop: commit to GitHub, Railway auto-deploys in about two minutes.

The production Railway service watches the **legacy repo `willaudiencestrategies/pitch-pack-tool`, branch `main`** — every push to that main goes live roughly two minutes later. The new canonical repo `github.com/steadman-ai/expedia-cbb` (branches `main` and `vault-build`, full history) is a mirror as of July 2026 and does not trigger deploys yet. Until the Railway service is re-pointed at the Steadman repo, a fix only reaches production when pushed to the legacy `origin` main, so push to both. [TODO: Will to hand over Railway project access, confirm the service's source and region in the dashboard (Settings → Source), and re-point it at steadman-ai/expedia-cbb so the legacy repo can be retired.]

The canonical repo going forward is **github.com/steadman-ai/expedia-cbb**. Push there.

## 9. For AI assistants: invariants and rules of engagement

This document will mostly be read by an LLM assistant helping the next developer or PM. These are the hard rules. Do not break them, and do not let a plausible-sounding refactor talk you out of them.

1. **`audienceBranches` index 0 is ALWAYS the primary audience.** The whole July 2026 fix (section 5) depends on it: `handleSelectAudience` builds the array as `[primary, ...secondary]`, the final-confirm merge restores working state from branch 0, and tenets are generated from branch 0 only. Never sort, filter or re-order this array.
2. **Every fix on `main` must also land on `vault-build`.** Team rule agreed with Tim, July 2026. The branches share most of their surface but the code lives in different files (main: `src/app/page.tsx`; vault-build: `src/components/steps/*` and `src/lib/state/useHandlers.ts`), so the same fix usually needs two distinct patches, not a cherry-pick.
3. **`prompts/*.json` are read from disk with `fs.readFileSync` + `JSON.parse` on every request** (`loadPrompt` in `src/lib/prompts.ts`). That means prompt edits deploy with no code change, and it also means there is no build-time validation: a file that is not valid JSON 500s its route at request time in production. Keep every value a properly quoted JSON string, escape any double quotes inside values, and remember a colon is only safe inside a quoted string. Validate with `python3 -m json.tool prompts/<file>.json` before committing.
4. **There is no server-side storage.** No database, no server sessions, no object store. All state is client-side localStorage plus what each request carries in its body. Do not design features that assume a database exists; if a feature needs one, that is an architecture decision to raise, not a detail to slip in.
5. **The compiled output is LLM-generated.** Anything that must appear verbatim in the final brief needs a deterministic post-processor in `src/lib/output-postprocess.ts` (pattern: `ensureTenetsProvenance`). Never rely on prompt adherence for a promised structural feature.
6. **The output length cap and tone live in `prompts/output.json`**, not in code. The `generate.role` says the pack is "A 2-pager, not an 8-pager" and the `generate.outputs.markdown` contract says "Should be 2-3 pages when rendered"; the creative-voice rules ("Write for a creative team, not a strategy team", avoid media-planning jargon) are in `generate.logic`. Tune length and tone there.
7. **Production deploys from the legacy `origin` main** (`willaudiencestrategies/pitch-pack-tool`, see section 8). Pushing to that branch ships to live users about two minutes later. Treat any push there as a production deploy, and mirror it to `steadman-ai/expedia-cbb`.
8. **The section-key rename is load-bearing.** `human_truths` → `audience_insights` and `media_strategy` → `media_context` are mapped in `LEGACY_SECTION_MAP` (`src/lib/types.ts`) for old stored sessions. The `Truth` type name survives from the old naming; UI copy says "insights". Do not "clean up" either without handling stored sessions.

## 10. File map

Everything tracked on `main`, with `[vault-build]` marking files that exist only on that branch (verified against `git ls-files` and `git ls-tree -r vault-build`). Skips `node_modules/`, `.next/` and the `public/*.svg` scaffold icons.

Repo root:

- `README.md` — stock Create Next App readme, not project documentation.
- `DEVELOPMENT.md` [vault-build] — codebase-specific practices; points at the debugging-lessons doc before any refactor.
- `context.manifest.yaml` [vault-build] — Will's ALIVE-system project manifest (metadata only, no runtime role).
- `package.json` / `package-lock.json` — name `pitch-pack-tool`, version 0.1.0; scripts `dev`, `build`, `start`, `lint`, `test`, `test:run`, `test:ui`.
- `railway.toml` — Railway/Nixpacks deploy config (Node 20, healthcheck 300s).
- `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `vitest.config.ts` — standard toolchain config.
- `.env.example` — the single env var, `ANTHROPIC_API_KEY`.
- `.nvmrc` — Node 20.

`docs/`:

- `docs/2026-01-22-prompt-overhaul-debugging-lessons.md` — post-mortem of the January prompt overhaul; required reading before refactors.
- `docs/plans/2026-01-22-prompt-system-overhaul.md` — plan for the four-option/two-step prompt system.
- `docs/plans/2026-01-26-tim-richard-feedback-improvements.md` — first client feedback round plan.
- `docs/plans/2026-01-30-v1.3-implementation-plan.md` — v1.3 plan (tell-me-more, multi-doc upload).
- `docs/plans/2026-02-04-brand-criteria-implementation.md` and `docs/plans/2026-02-04-brand-criteria-integration.md` — brand criteria design and build plans.
- `docs/architecture-map.md` [vault-build] — January architecture snapshot; records the live URL `pitch-pack-tool-production.up.railway.app`.
- `docs/plans/2026-01-23-ux-improvements.md`, `2026-01-26-reassessment-loop-fix.md`, `2026-01-26-reassessment-loop-fix-implementation.md`, `2026-01-29-ui-consistency-plan.md`, `2026-01-29-v1.2-implementation-plan.md`, `2026-01-29-workshop2-v1.2-design.md`, `2026-02-02-v1.4-ux-improvements.md` [vault-build] — historical sprint plans retained only on that branch.
- `docs/plans/2026-05-20-vault-build-CONTEXT-PACK.md` [vault-build] — briefing pack assembled for the Vault build.
- `docs/plans/2026-05-20-vault-build-implementation.md` [vault-build] — the Vault implementation plan.
- `docs/plans/2026-06-06-vault-match-scoring-pipeline.md` [vault-build] — TDD plan for the scoring pipeline.
- `docs/specs/2026-05-20-vault-build-design.md` [vault-build] — the Vault design spec (the authoritative description of the flow).
- `docs/specs/2026-06-04-vault-match-redesign-design.md` [vault-build] — redesign of the matcher after the single-call version underperformed.
- `docs/testing/2026-05-20-pre-manual-test-plan.md`, `2026-05-20-vault-build-test-plan.md`, `2026-05-20-vault-build-test-findings.md` [vault-build] — May manual-testing plans and findings.

`prompts/` (identical file list on both branches):

- `prompts/README.md` — non-developer workflow: edit on GitHub, Railway redeploys in ~2 minutes.
- `prompts/EDITING-GUIDE.md` — which file controls which behaviour, the JSON structure, and the safe-edit rules.
- `prompts/triage.json` — whole-brief multi-persona assessment (`assess` block).
- `prompts/objective.json`, `budget.json`, `audience.json`, `creative-task.json`, `media-context.json`, `research-stimuli.json` — per-section assess/reassess/generate prompts.
- `prompts/audience-insights.json` — the 12-insight generation (with `{brandContext}` placeholder).
- `prompts/creative-tenets.json` — tenet generation (with `{brandContext}` placeholder).
- `prompts/brand-alignment.json` — brand-alignment section config.
- `prompts/brand-fit.json` — brand/audience fit assessment.
- `prompts/output.json` — final pack compile: structure, two-page cap, creative voice.

`scripts/` [vault-build only]:

- `scripts/parse-vault.ts` [vault-build] — one-off Word-to-JSON parser that produced `src/lib/vault-content.json`.
- `scripts/enrich-vault-fingerprints.ts` [vault-build] — offline enrichment run that adds a `fingerprint` to every concept via Claude; live run still pending (section 13).

`src/app/`:

- `src/app/page.tsx` — on main, the entire UI (3,337 lines: state, handlers, all step renderers); on vault-build, a 784-line shell that composes the step components.
- `src/app/layout.tsx`, `src/app/globals.css` — root layout and styling.
- `src/app/api/parse/route.ts` — file text extraction (no LLM).
- `src/app/api/triage/route.ts` — whole-brief triage; on vault-build it streams NDJSON with heartbeats and sets `maxDuration = 300`.
- `src/app/api/section/route.ts` — per-section reassess/generate.
- `src/app/api/section/builder/route.ts` — four-option rebuild for a section.
- `src/app/api/brand-fit/route.ts` — brand fit assessment.
- `src/app/api/generate/audience/route.ts` — segment menu and personification.
- `src/app/api/generate/truths/route.ts` — the 12 insights (route path keeps the old "truths" name).
- `src/app/api/generate/tenets/route.ts` — creative tenets from the primary audience.
- `src/app/api/output/route.ts` — final compile.
- `src/app/api/vault/route.ts` [vault-build] — the Vault endpoint, `mode: 'match'` and `mode: 'narrative-draft'`.
- `src/app/api/__tests__/vault-route.test.ts` [vault-build] — route validation tests.

`src/components/` (shared by both branches unless marked):

- `AudienceMenu.tsx` — segment menu with primary/secondary selection (max two secondaries enforced here).
- `BrandAlignment.tsx` — brand cards, async fit check, the "DG Match / Co-investment" checkbox.
- `CreativeTenets.tsx` — structured tenet cards (headline, explanation dots, differentiator).
- `FileUpload.tsx`, `GateTransition.tsx`, `GoodExamplePrompt.tsx`, `LoadingProgress.tsx`, `PersonificationReview.tsx`, `ProductionBudget.tsx`, `SectionFooter.tsx`, `SectionOptions.tsx` — step-level UI pieces; `ProductionBudget.tsx` holds budget figures in local state (section 7, Tim's bug).
- `BranchProgress.tsx` [vault-build] — audience-branch progress indicator.
- `src/components/steps/*` [vault-build] — one component per step: `UploadStep`, `TellMeMoreStep`, `TriageStep`, `Gate1SectionsStep`, `GateTransitionStep`, `BrandAlignmentStep`, `Gate2AudienceStep`, `InsightsStep`, `CreativeTenetsStep`, `MediaContextStep`, `OutputStep`, plus the six Vault steps (`VaultDecisionStep`, `VaultAudiencePickerStep`, `VaultProductionBudgetStep`, `VaultMatchListStep`, `VaultNarrativeDraftStep`, `VaultExportStep`) and `steps/shared/` helpers (`BackButton`, `LoadingOverlay`, `ReassessConfirmation`, `ReturnToOutputButton`, `Spinner`, `StatusBadge`).

`src/hooks/`:

- `useLoadingProgress.ts` (+ test) — staged fake-progress driver for long LLM calls.

`src/lib/`:

- `types.ts` — all domain types and `createInitialState` (section 11).
- `claude.ts` — the single Anthropic SDK wrapper: `callClaude`, `callClaudeJSON`, structured stdout logging; model hard-coded `claude-sonnet-4-6`; on vault-build also `warmupClaude`.
- `prompts.ts` — `loadPrompt` and `buildSystemPrompt` (section 12).
- `brand-criteria.ts` — hard-coded EG brand definitions and `getBrandContextForPrompt` (section 12).
- `file-parser.ts` (+ test) — docx/pdf/md/txt extraction; pptx stub.
- `file-utils.ts` — supported-extension list.
- `word-export.ts` — `markdownToParagraphs` and the docx builders; on vault-build also `exportVaultPack`.
- `output-postprocess.ts` — deterministic post-compile guarantees (`ensureTenetsProvenance`).
- `session-storage.ts` — localStorage persistence; main: single key, 24 h; vault-build: per-briefId keys `pitch-pack-session:<briefId>`, 30-day expiry, legacy-key migration.
- `fetch-with-retry.ts` — one retry on network-layer drop only.
- `analytics.ts` — console + localStorage brief-score logging.
- `loading-config.ts` — staged loading messages per endpoint.
- `good-examples.ts` — placeholder good-example content (E Studio to replace).
- `research-prompts.ts` — suggested prompts the user can run in their own LLM.
- `claude-json-extract.ts` [vault-build] — balanced-brace JSON extraction from LLM prose.
- `parse-budget.ts` [vault-build] — free-text budget parsing ("$200k p/e", "$1.5M", ranges) into USD.
- `stream-response.ts` / `read-json-stream.ts` [vault-build] — NDJSON heartbeat streaming (server/client halves).
- `vault-content.json` [vault-build] — the parsed concept library (section 13).
- `vault-filter.ts` [vault-build] — soft pre-filter (budget flag, must-have channels, partner-type match).
- `vault-match/` [vault-build] — `config.ts` (weights, thresholds), `fingerprint.ts` (brief fingerprint with deterministic fallback), `score.ts` (per-concept scoring), `rank.ts` (deterministic rank/label), `types.ts` (fingerprint/score types), plus `__tests__/`.
- `vault-resume-token.ts` [vault-build] — URL-safe base64 encode/decode of a resume slice of SessionState.
- `prompts/` [vault-build] — TypeScript prompt constants (as opposed to the JSON files): `brief-fingerprint.ts`, `concept-fingerprint.ts`, `concept-score.ts`, `vault-narrative-draft.ts`.
- `state/` [vault-build] — `BriefStateContext.tsx`, `useHandlers.ts` (~1,000 lines, every handler), `useProgressHooks.ts`.
- `__tests__/` — unit tests (see section 15 for the per-branch inventory).
- `src/instrumentation.ts` [vault-build] — server-boot Claude connection warmup so the first triage of the day does not pay cold-start latency.

`src/test/`:

- `integration/flow.test.ts` — type-level flow assertions (section order, initial state), not a network-level integration test.
- `setup.ts` — vitest setup.

## 11. Core data structures

All from `src/lib/types.ts`, reproduced verbatim from `main` as of 16 July 2026 (commit `6d51110`).

The `Step` union defines the flow. On `main`:

```typescript
export type Step = 'upload' | 'tell_me_more' | 'triage' | 'context' | 'gate1_sections' | 'gate_transition' | 'gate2_brand' | 'gate2_audience' | 'gate2_insights' | 'gate2_tenets' | 'gate2_media' | 'output';
```

On `vault-build` the union inserts six Vault steps between `gate2_insights` and `gate2_tenets`:

```typescript
export type Step =
  | 'upload'
  | 'tell_me_more'
  | 'triage'
  | 'context'
  | 'gate1_sections'
  | 'gate_transition'
  | 'gate2_brand'
  | 'gate2_audience'
  | 'gate2_insights'
  | 'vault_decision'
  | 'vault_audience_picker'
  | 'vault_production_budget'
  | 'vault_matches'
  | 'vault_narrative_draft'
  | 'vault_export'
  | 'gate2_tenets'
  | 'gate2_media'
  | 'output';
```

`SessionState` is the one object that holds everything, created by `createInitialState()` on load or "start fresh", mutated via a single `setState` throughout the session, persisted to localStorage on every change (1 s debounce), and cleared only by "Start fresh" or expiry:

```typescript
export interface SessionState {
  step: Step;
  currentGate: 'gate1' | 'gate2' | 'output';
  brief: string;
  briefFilename: string;
  additionalContext: string;
  preTellMeMoreContext: string;

  // Enhanced triage
  triageResult: EnhancedTriageResponse | null;

  // Section building with options
  sections: Section[];
  currentSectionIndex: number;
  currentSectionOptions: SectionOptionsResponse | null;
  selectedOptionLevel: OptionLevel | null;

  // Gate 2: Brand Alignment
  brandAlignment: BrandAlignment | null;

  // Gate 2: Budget Details
  budgetDetails: BudgetDetails | null;

  // Gate 2: Audience
  audienceMenu: AudienceSegmentMenu | null;
  selectedAudienceSegment: AudienceSegment | null;
  personification: PersonificationResponse | null;
  audiencePrioritisation: AudiencePrioritisation | null;

  // Gate 2: Audience Branching (v1.3) - One branch per selected segment
  audienceBranches: AudienceBranch[];
  currentBranchIndex: number;

  // Gate 2: Audience Insights (renamed from Human Truths)
  insightOptions: Truth[]; // Renamed from truthOptions
  selectedInsights: Truth[]; // Renamed from selectedTruths, max 3

  // Output
  outputMarkdown: string | null;
  includeResearchStimuli: boolean; // Toggle for appendix

  // Analytics stub
  briefScore: BriefScore | null;

  // Track reassessments for visual feedback
  reassessCount: number;
  lastReassessedAt: string | null;

  // Undo history
  history: HistoryEntry[];
  historyIndex: number;

  // Navigation state
  hasReachedOutput: boolean;

  error: string | null;
  loading: boolean;
  loadingProgress: LoadingProgress | null;
}
```

On `vault-build`, `SessionState` gains seven fields (and `createInitialState` seeds `briefId: crypto.randomUUID()`):

```typescript
  // Vault fields (added 2026-05-21)
  briefId: string;
  productionBudgetUsd: number | null;
  partnerType: VaultCategory | null;
  vaultAudienceBranchIndex: number | 'all' | null;
  vaultMatchPreview: VaultMatchPreview | null;
  vaultResult: VaultResult | null;
  resumedFromToken: boolean;
```

`Section` — one per brief section, all nine created red-and-empty by `createInitialState`, populated by triage (`synthesizedContent` + status), overwritten by each reassess/generate/confirm, and never cleared until "start fresh":

```typescript
export interface Section {
  key: SectionKey;
  name: string;
  status: Status;
  content: string;
  feedback: string;
  suggestion?: string;
  gaps?: string[];
  questions?: string[];
}
```

`AudienceSegment` — one of the LLM-generated menu options; lives in `audienceMenu.segments` from the menu call, then in `audiencePrioritisation` and each `AudienceBranch` after selection:

```typescript
export interface AudienceSegment {
  id: number;
  name: string;
  tagline?: string; // e.g. "Collects experiences like currency"
  needsValues: string;
  demographics: string;
}
```

`AudiencePrioritisation` — written once when the user confirms selection in `AudienceMenu`, read to build the branches; index 0 of the resulting branch array is the primary:

```typescript
export interface AudiencePrioritisation {
  primary: AudienceSegment;
  secondary: AudienceSegment[]; // Max 2
}
```

`AudienceBranch` — one per selected segment, created at selection with `personification: null, insights: []`, filled in as the walk visits each branch, and read back at final confirm to write the audience sections and restore the primary:

```typescript
export interface AudienceBranch {
  segment: AudienceSegment;
  personification: PersonificationResponse | null;
  insights: Truth[];
  // Generated insight options, persisted per branch so revisiting a branch
  // restores ITS options (selected ids are only meaningful against these).
  // Optional for backward compat with sessions stored before this field.
  insightOptions?: Truth[];
}
```

`Truth` — one insight (the type keeps the pre-rename name); twelve land in `insightOptions` per generation call, up to three are moved to `selectedInsights`, and both are persisted into the current branch on confirm:

```typescript
export interface Truth {
  id: number;
  text: string;
  level: 'safer' | 'sharper' | 'bolder';
}
```

`BrandAlignment` — written by the brand step's confirm, read by truths/tenets generation (for `{brandContext}`) and by the output compile (which prints `DG Match: Yes/No`):

```typescript
export interface BrandAlignment {
  brand: ExpediaBrand | null;
  hasDGMatch: boolean;
  brandAudience?: string; // Placeholder for brand audience definition
}
```

The Vault types on `vault-build` (`VaultConcept`, `VaultContent`, `VaultMatchPreview`, `VaultConceptMatch`, `NarrativeDraft`, `VaultResult`, `VaultCategory`, `VaultConfidence`) live at the bottom of that branch's `src/lib/types.ts`; the matching-pipeline types (`BriefFingerprint`, `ConceptFingerprint`, `AxisScores`, `ScoredConcept`) are in `src/lib/vault-match/types.ts`. Lifecycle: `vaultMatchPreview` and `vaultResult` are written by the background matcher fired on insights confirm, refined through the Vault steps, and carried in the resume token.

## 12. Prompt file anatomy

How routes find their prompt file: most routes hard-code the name (`loadPrompt('triage')`, `loadPrompt('output')`, and so on), but `section/route.ts` and `section/builder/route.ts` derive it mechanically: `sectionKey.replace('_', '-')`, so `creative_task` loads `prompts/creative-task.json`. Note `.replace` with a string only replaces the FIRST underscore, which is fine for every current key but would silently break for a future key containing two underscores (name the file accordingly or fix the replace to a global one).

Every file in `prompts/` follows the `SectionPrompts` shape from `src/lib/prompts.ts`:

```typescript
export interface PromptConfig {
  role: string;
  task: string;
  logic: string;
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  examples?: Array<{ input: string; output: string }>;
  escapeHatch: string;
}

export interface SectionPrompts {
  section: string;
  displayName: string;
  assess: PromptConfig;
  reassess: PromptConfig;
  generate: PromptConfig;
  personify?: PromptConfig;  // Only used by audience prompt (two-step flow)
}
```

`buildSystemPrompt` assembles a block into a system prompt in fixed order: `# Role`, `# Task`, `# Logic`, `# Inputs` (bulleted key: description), `# Outputs (JSON format)` (bulleted), `# Examples` (if present), `# Escape Hatch`. The `inputs` and `outputs` maps are the data contract with the route code; edit only the prose fields (`role`, `task`, `logic`, `examples`, `escapeHatch`) unless you are also changing the route.

Which route reads which file and block (all verified in the route code):

| Route | Prompt file | Block used |
|---|---|---|
| `/api/triage` | `triage.json` | `assess` |
| `/api/section` | per-section file, derived as `sectionKey.replace('_', '-')` (`objective.json`, `budget.json`, `audience.json`, `creative-task.json`, `media-context.json`, `research-stimuli.json`) | `reassess` when `action === 'reassess'`, else `generate` |
| `/api/section/builder` | same per-section file | `generate` |
| `/api/brand-fit` | `brand-fit.json` | `assess` |
| `/api/generate/audience` | `audience.json` | `generate` (segment menu) or `personify` (when `selectedSegment` is present) |
| `/api/generate/truths` | `audience-insights.json` | `generate`, with `{brandContext}` substituted |
| `/api/generate/tenets` | `creative-tenets.json` | `generate`, with `{brandContext}` substituted |
| `/api/output` | `output.json` | `generate` |

`brand-alignment.json` exists as section config but no route loads it by that name; the brand step's LLM behaviour comes from `brand-fit.json`.

**`{brandContext}` injection.** The truths and tenets routes call `getBrandContextForPrompt(brand)` from `src/lib/brand-criteria.ts` and do a literal `task.replace('{brandContext}', brandContext)` on the `generate.task` string before building the system prompt (empty string when no brand is chosen). The injected text is built from the hard-coded `BRAND_CRITERIA`, whose audience profiles are, verbatim from that file:

- **Expedia — Quality Seekers** (avg age 43, 17% of travellers, 26% of spend): "Savvy travel planners who value platforms that match their level of expertise. These professionals with high disposable income want flexible, smart tools that give them a sense of control, value, and confidence. They're not looking for an easy travel platform; they're looking for a powerful, seamless one." Key values: Control, Intelligent tools, Flexibility, Rewards, Seamless experience.
- **Hotels.com — Savvy Trip Takers** (avg age 31, 19% of travellers, 20% of spend): "Young professionals who travel frequently including leisure, business and bleisure. They need an OTA they can trust to provide a hassle-free experience and a variety of good value options. They take advantage of loyalty programs and choose destinations that will make their friends and followers jealous." Key values: Simplicity, Flexibility, Rewards, Transparency, Value.
- **Vrbo — Group Planners** (avg age 46, 14% of travellers, 13% of spend): "Avid planners intent on organizing trips that please the whole family. Planning gives them peace of mind so they can relax and have a better time during the trip. They are value-driven and will actively research special offers and deals." Key values: Family focus, Planning, Value, Togetherness, Experiences.

If a prompt file needs the placeholder, it must appear in `generate.task` exactly as `{brandContext}`; a typo silently injects nothing.

**Worked example of a safe prompt edit.** Say Richard wants the final pack to stop using the word "leverage". Open `prompts/output.json`, find the `generate.logic` string, and append inside the existing quoted string: `- Never use the word 'leverage'; write 'use' instead`. Do not touch `inputs`, `outputs`, `section` or `displayName`. Run `python3 -m json.tool prompts/output.json` to confirm the file still parses, commit, push to the legacy `origin` main (section 8), and the change is live in about two minutes with no code deploy. If the requirement were structural rather than stylistic (something that must always appear), it belongs in `src/lib/output-postprocess.ts` instead (rule 5 in section 9).

## 13. The Vault (vault-build) in depth

The Vault turns E Studio's concept library into a matching step in the middle of the brief flow. Everything in this section is on `vault-build` only.

### The concept library

`src/lib/vault-content.json` was produced once by `scripts/parse-vault.ts` from the Word document `THE VAULT_November 2025_Kat.docx` (the JSON records `sourceFile` and `parsedAt: 2026-05-20`). It contains **33 concepts**: 12 destination, 11 lodging, 7 non-endemic, 2 airline, 1 car. The design spec (`docs/specs/2026-05-20-vault-build-design.md`) confirms "The Vault is roughly 33 validated concepts today (growing to 50-60 once Dave's video format franchises land)". [TODO: Will to confirm — some briefing notes cite ~66 concepts; the repo's JSON and the spec both say 33.] Each concept carries id, name, category, idea summary, creative mechanism, core message, audience fit, channels/formats, watchouts, parsed production timeline and budget tiers, reference links and era tags.

**There are no vector embeddings and no vector database anywhere in this project.** This is worth stating bluntly because the briefs' language ("matching", "fingerprints") suggests otherwise. A grep for embedding/vector/pinecone/pgvector across `src/`, `prompts/` and `scripts/` on both branches returns nothing. Matching is entirely LLM-judgement scoring over structured JSON plus deterministic arithmetic.

### The matching pipeline (`src/lib/vault-match/`)

Built TDD on 6 June 2026 after the original single-LLM-call matcher underperformed (design in `docs/specs/2026-06-04-vault-match-redesign-design.md`, plan in `docs/plans/2026-06-06-vault-match-scoring-pipeline.md`). Stages, as wired in `src/app/api/vault/route.ts` (`mode: 'match'`):

1. **Soft pre-filter** (`src/lib/vault-filter.ts`). Only must-have channels can exclude a concept. Budget never hard-gates: each candidate gets a `budgetFlag` of `within-range` or `close-to-edge` based on a ±50% comfort band (`COMFORT_BAND_PCT = 0.50`) around the brief's production budget. Non-endemic concepts are deliberately NOT dropped for endemic briefs; the file's comment records that the old hard filter "starved the LLM matcher of brief-relevant candidates" and says any future commercial reason to hide non-endemic should be an explicit opt-in arg, never a silent filter.
2. **Brief fingerprint** (`fingerprint.ts`). One Claude call condenses the brief, triage sections and selected insights into a `BriefFingerprint` `{strategicProblem, audience, creativeJob, format, tone}`, with a deterministic fallback assembled from the triage sections if the call fails. The audience field folds the selected insights in.
3. **Independent per-concept scoring** (`score.ts`). One Claude call per candidate (`Promise.all`, so parallel) compares the brief fingerprint to the concept's pre-computed fingerprint and returns `AxisScores`: `problemScore`, `audienceScore`, `mechanismScore` (each 0-100, clamped) with a reason per axis. A failed call scores zero rather than failing the batch.
4. **Deterministic rank and label** (`rank.ts`). Weighted total = 0.45 × problem + 0.35 × audience + 0.20 × mechanism (`AXIS_WEIGHTS` in `config.ts`, "Problem-led weighting (Tim's call)"). Confidence bands: **strong ≥ 70, plausible ≥ 45, stretch below** (`CONFIDENCE_THRESHOLDS`). Top five concepts get slots A-E (`MAX_RANKED = 5`). When the top total is **below 45**, `buildTopLineNote` emits the no-comparable note recommending the Creative Lab in parallel. (`NO_COMPARABLE_FLOOR = 35` also exists in `config.ts` but is only asserted in tests; the note logic keys off the plausible threshold.) `SCORING_MODEL` in `config.ts` documents Sonnet as the intended scorer; the actual model is whatever `src/lib/claude.ts` hard-codes, currently `claude-sonnet-4-6` for everything.

### The flow

On insights confirm, `handleConfirmInsights` (`src/lib/state/useHandlers.ts`) advances to `vault_decision` and fires `fireBackgroundMatcher` un-awaited (via `setTimeout` with explicitly passed values, because the closure's view of state would be stale), so the preview signal is ready before the decision screen renders. Steps:

1. **`vault_decision`** — recap plus a preview signal (`strong` / `plausible` / `stretch` / `none` derived from the ranked list); CP chooses "Take to the Vault" or "Continue to Creative Tenets".
2. **`vault_audience_picker`** — only when the brief has multiple audience branches: match against which branch's insights, or all combined.
3. **`vault_production_budget`** — only when no explicit production budget could be derived (`parse-budget.ts` handles "$200k p/e", "$1.5M", ranges); matching requires a figure between $1,000 and $50M (route validation).
4. **`vault_matches`** — the A-E ranked list with confidence, reasons, budget flag and partner-type match; CP selects concepts.
5. **`vault_narrative_draft`** — `mode: 'narrative-draft'` generates a six-slide pack per selected concept (key brief points, creative problem, narrative pitch, full concept description, tailoring, strategic fit & budget) using Tim's v1.0 prompt (`src/lib/prompts/vault-narrative-draft.ts`); slides are editable inline; a `creativeLabFlag` marks drafts needing Creative Lab input.
6. **`vault_export`** — Word pack via `exportVaultPack` in `src/lib/word-export.ts`, including a "Resume in tool" link.

### The resume token

`src/lib/vault-resume-token.ts` encodes a fixed `ResumeSlice` of SessionState (briefId, brief, triage, sections, brand, budget, audience branches, insights, Vault fields; not loading/error/history) as URL-safe base64. If the buying client rejects the Vault concept, the CP opens the resume URL, the token decodes, full state restores, and the flow routes to Creative Tenets with the rejected matches as context. This exists because there is still no server-side storage; the token IS the session, carried in the URL. Supporting this, session storage on this branch is per-brief (`pitch-pack-session:<briefId>`) with a 30-day expiry and legacy-key migration (`src/lib/session-storage.ts`).

### Held items (as of 16 July 2026)

- **The fingerprint enrichment run has not happened.** `scripts/enrich-vault-fingerprints.ts` (run: `npx tsx scripts/enrich-vault-fingerprints.ts src/lib/vault-content.json`) makes one Claude call per concept to write a `fingerprint` onto each entry and rewrites the JSON. Today **0 of 33 concepts have fingerprints**, and the match route only scores candidates that have one, so the scoring pipeline currently returns an empty ranked list end to end. The run spends API money (~33 Sonnet calls) and is awaiting Will's go. It is the single blocking prerequisite for the Vault working at all.
- **The branch is unmerged.** `vault-build` regularly absorbs `main` (merge commits `ebcd45e` and `ea52666`, both 16 July 2026) but has never merged the other way. It carries the page refactor, streaming keep-alive, session-storage upgrade and the whole Vault; merging it (or at minimum the refactor and streaming) is the standing recommendation from section 2.

## 14. Project history and timeline

Condensed from `git log` on both branches. Hashes are on `main` unless marked (vb).

- `f721a83` 21 Jan 2026 — initial commit (Create Next App scaffold); the whole v1 core lands the same day: Claude wrapper (`4b57a34`), API routes (`9e1af1a`), main page state and renderers (`42cdeb2`).
- `0e49197` 22 Jan 2026 — prompt system overhaul: four-option spectrum (`e200aea`), two-step audience (`0bfe0ba`), multi-persona triage (`a2eefdd`), 12-truth spectrum (`427382b`); vitest introduced (`3eebcfc`); Railway deploy fixes (timeouts `cf369b2`, Node 20 `b52f867`).
- `9ec08dc` 23 Jan 2026 — file upload and export fixes; mammoth for Word parsing (`935bd2a`).
- `11c1cad` 26 Jan 2026 — Tim & Richard feedback round; all reassess prompts changed to return a suggestion rather than overwriting content (`a7cec99` through `7353ff2`).
- `1aa8b24` 29 Jan 2026 — the two-gate architecture rebuild: gate type system, two-gate flow UI (`a9a0ea3`), brand alignment component (`f4bfb0c`), tenets route (`8878edd`), primary/secondary audience prioritisation (`e443194`).
- `187dcfe` 30 Jan 2026 — v1.3: "Tell Me More" step, multi-document upload (`7719fbc`), research prompt suggestions (`a6cad09`).
- `c83e811` 1 Feb 2026 — localStorage session persistence; Word export (`c8fd737`), PDF parsing (`81cb9c2`), brief-score analytics (`a0fa42b`).
- `2c9e05d` 2 Feb 2026 — production budget in Gate 1; staged loading progress (`ec5cbe6`, `bd75af8`).
- `96a2582` 4 Feb 2026 — brand criteria data model; `/api/brand-fit` (`0154171`); brand context injected into truths and tenets (`d563a0f`).
- `e1ddf49` 10 Feb 2026 — v1.6: structured tenets (`59c4b11`), coherence analysis (`0b157db`), major prompt enrichment across objective, output, creative-task, budget, triage and creative-tenets (`b2d6673` through `2b1b31a`).
- `dcaee80`/`66f9e58`/`3e8f8f2` 11 Feb 2026 — v1.7 batches 1-3; production budget made optional (`ac9cba8`).
- `4cd5d3c` 11 Mar 2026 — v1.8 launch sprint (4 blockers, 4 prompt fixes, UX improvement).
- `0ef3c53` 17 Mar 2026 — Word upload fix (mammoth arrayBuffer unsupported server-side).
- `8b918a2` through `7db5bf0` (vb) 20 May 2026 — the vault-build refactor: state context, `useHandlers`, every step extracted to `src/components/steps/`.
- `00b0f59` through `b8ac0fa` (vb) 20 May 2026 — Vault v1 in a day, TDD: Word-to-JSON parser, types, pre-filter, resume token, per-briefId 30-day sessions, `/api/vault` stub, all six Vault steps, loopback re-entry; test findings documented (`7e9561d`).
- `ba2b613` (vb) 22 May 2026 — four bugs from 21 May manual testing fixed.
- `adbbf20`/`00394ed` (vb) 25-26 May 2026 — Tim's v1.0 narrative-draft and matcher prompts wired in; demo-era hardening (`9917af3`, `7f309e0`, `6ecd604`); rename to Creative Brief Builder (`8003d85`); model bump to claude-sonnet-4-6 (`e775c10`).
- `caea247` 27 May 2026 — rename and model bump shipped to production `main` (the 26 May demo era).
- `4fad678` (vb) 28 May 2026 — env-var-driven deploy label pill.
- `1e15462`/`cb2a4cf` 4 Jun 2026 — loading bar pinning fix and triage auto-retry on network drop; the June deploy-unblock on `main`.
- `64ab277` through `2dec9ef`, `509e142` (vb) 6 Jun 2026 — the vault-match scoring pipeline, TDD: config, deterministic rank/label, soft non-endemic filter, brief fingerprint with fallback, independent per-concept scoring, enrichment script (live run pending, `e9fbda1`), wired into `/api/vault`, single-call matcher retired.
- `51134c1` (vb) 2 Jul 2026 — NDJSON streaming keep-alive for triage (stops the Railway edge idle-kill; not yet on `main`).
- `ab0e4b8`/`98ee0cd`/`6d51110` 16 Jul 2026 — audience-priority fix, export-divergence fix, adversarial-review hardening (section 5); merged into vault-build the same day (`ebcd45e`, `ea52666`).

## 15. Testing and verification

Tests are vitest, run with `npm run test:run`. They live in `src/lib/__tests__/`, alongside their subjects as `*.test.ts` (`src/lib/prompts.test.ts`, `src/lib/file-parser.test.ts`, `src/lib/types.test.ts`), in `src/hooks/__tests__/`, in `src/test/integration/`, and on vault-build additionally in `src/lib/vault-match/__tests__/` and `src/app/api/__tests__/`.

Counts as of 16 July 2026:

- **`main`: 74 tests in 9 files, all passing** — verified by running `npm run test:run` on this machine today.
- **`vault-build`: 150 tests in 22 files** — verified statically by counting `it(`/`test(` declarations per file via `git show` (the branch was not checked out to run them): the 74-equivalent core plus `claude-json-extract` (16), `prompts` grows to 21, `types` to 11, `vault-filter` (9), `rank` (8), `vault-resume-roundtrip` (8), `vault-export` (6), `session-storage` (6), `vault-resume-token` (5), `parse-budget` (5), `stream-response` (4), `score` (3), `fingerprint` (2), `config` (2), `vault-route` (2).

What they cover: pure logic. Prompt loading and system-prompt assembly, file parsing, type/flow invariants, brand criteria, fetch retry, output post-processing, and on vault-build the whole matching pipeline (weights sum to 1, band boundaries, ranking determinism, filter softness), budget parsing, JSON extraction, resume-token round-trips and streaming. `src/test/integration/flow.test.ts` is, despite the name, type-level assertions about section order and initial state, not a network test.

What they do NOT cover: **there are no component/UI tests and no end-to-end tests in the repo.** Nothing renders `page.tsx` or the step components; nothing drives a browser; no LLM call is ever made in tests. The July audience bug lived exactly in this gap (handler orchestration across steps), which is why it needed the manual approach below.

**The manual e2e approach used in July 2026**: drive the API routes directly, in the order the client calls them, with a two-audience brief, then assert primary-audience fidelity on the results. The reusable script lives outside the repo on Will's machine; the sequence, so an LLM can recreate it:

1. `POST /api/parse` with the brief file (or skip and use raw text as `brief`).
2. `POST /api/triage` `{brief}` → take `triageAssessment[].synthesizedContent` as each section's content.
3. For each Gate 1 section: optionally `POST /api/section` `{sectionKey, brief, currentContent, additionalContext, action: 'reassess'}` and adopt the returned content.
4. `POST /api/brand-fit` `{brand, briefAudienceContent, briefObjectiveContent}`.
5. `POST /api/generate/audience` `{brief, additionalContext}` → segment menu; pick a primary and one secondary.
6. For each segment, primary first (mirroring the branch walk): `POST /api/generate/audience` with `selectedSegment` → personification; then `POST /api/generate/truths` `{audience, personification, brandAlignment}` → 12 insights; keep up to 3.
7. `POST /api/generate/tenets` with the objective, the PRIMARY segment, the PRIMARY branch's insights, and `secondaryAudiences: [names]`.
8. `POST /api/output` with all sections plus the primary audience, personification, selected insights, `brandAlignment`.
9. Assert: the tenets reference the primary audience's world, the compiled markdown's CREATIVE TENETS section carries the "Built solely from the primary audience" provenance line, and the AUDIENCE section lists the primary first with secondaries labelled.

Note the server is stateless, so this sequence needs no cookies or session handling; each request body carries everything.

## 16. Glossary

Domain terms an outsider or LLM needs, in rough order of encounter:

- **CBB** — Creative Brief Builder, this tool. Formerly the Pitch Pack Tool; the repo folder, package name (`pitch-pack-tool`) and localStorage keys still carry the old name. Renamed 26-27 May 2026 (`8003d85`, `caea247`).
- **CP (Commercial Partner)** — the Expedia-side seller-facing user who runs a brief through the tool. The tool's primary user.
- **E Studio** — Expedia Group's creative studio, the team the brief ultimately serves and the owner of the Vault concept library.
- **EG (Expedia Group)** — the parent company; "EG brand" means one of Expedia, Hotels.com or Vrbo.
- **Gate 1 / Gate 2** — the two-phase workflow (section 2). Gate 1 repairs what the inbound brief said (objective, budget, audience, creative task); Gate 2 enriches it (brand alignment, audience segments and insights, creative tenets, media context).
- **Triage** — the single big LLM assessment of the whole uploaded brief: traffic-light scores, synthesised content, contradictions, questions.
- **Branch walk** — the Gate 2 pattern of processing each selected audience segment (primary plus up to two secondaries) independently through personification and insights (section 5).
- **Personification** — the narrative persona sketch generated for a segment ("meet this person" prose), from `audience.json`'s `personify` block.
- **Insights / truths** — the same thing. "Human Truths" was renamed to "Audience Insights" in the two-gate rebuild (`e0b42cd`, 29 Jan 2026); the `Truth` type, the `/api/generate/truths` route path and `LEGACY_SECTION_MAP` keep the old name. Each insight is graded safer/sharper/bolder.
- **Creative tenets** — the three-part creative direction statements (headline, explanation points, differentiator) generated from the primary audience and its insights.
- **Differentiator** — the third element of a tenet: what makes this direction distinct. Rendered with a "Differentiator" prefix that `word-export.ts` handles specially.
- **DG match** — a checkbox on the brand step, labelled "DG Match / Co-investment" in `src/components/BrandAlignment.tsx`, stored as `BrandAlignment.hasDGMatch` and printed in the output as "DG Match: Yes/No". The code never defines the expansion. [TODO: Will to confirm exact meaning of "DG" — the UI pairing with "Co-investment" suggests a co-funded deal type.]
- **Brand criteria** — the hard-coded EG brand definitions in `src/lib/brand-criteria.ts`: Expedia targets **Quality Seekers**, Hotels.com targets **Savvy Trip Takers**, Vrbo targets **Group Planners** (full verified wording in section 12).
- **The Vault** — E Studio's library of validated creative concepts (a Word doc, `THE VAULT_November 2025_Kat.docx`), and by extension the `vault-build` branch's matching feature over its parsed form (section 13).
- **Fingerprint** — the structured LLM-generated summary used for matching: a `BriefFingerprint` (strategic problem, audience, creative job, format, tone) for the brief, a `ConceptFingerprint` (strategic problem, audience, creative job, mechanism, format) per concept. Plain JSON, not an embedding.
- **Non-endemic** — a Vault concept category for partners outside travel supply (the others: destination, lodging, airline, car). Deliberately a soft signal in matching, never a hard filter.
- **SMARTER** — an objectives framework for a SEPARATE future workstream. Explicitly out of scope for this repo this week; it appears nowhere in the code and should not be built here without a new brief.
- **The spine flows** — three planned E Studio flows on a separate roadmap. Also not in this repo; mentioned only so an assistant does not go hunting for them here.

## 17. Accounts, access and data handling

**GitHub.** Two repos, both with `main` and `vault-build` and full history. `willaudiencestrategies/pitch-pack-tool` (git remote `origin`) is the legacy repo and, critically, the **production source**: Railway watches its `main`. `steadman-ai/expedia-cbb` (git remote `steadman`) is the canonical home going forward, currently a mirror that does not trigger deploys. Until Railway is re-pointed, push fixes to both (section 8).

**Railway.** One project/service, deployed from the legacy repo's `main` via Nixpacks per `railway.toml`. The live URL recorded in `docs/architecture-map.md` (vault-build) is `pitch-pack-tool-production.up.railway.app`. Project access transfer to the incoming developer is pending, along with confirming the service's source and region in the dashboard [TODO: Will — see section 8].

**Anthropic API.** One API key, used by the single wrapper in `src/lib/claude.ts`. Locally it lives only in `.env.local` (gitignored; `.env.example` is the template and `ANTHROPIC_API_KEY` is the only variable). In production it lives only in the Railway service variables. It appears nowhere in the repo. Account ownership of the Anthropic console/key is a dashboard fact [TODO: Will to confirm which account holds the key and hand over access].

**Data privacy facts (June 2026, supplied by Will for Expedia's data team).** These are stated facts from Will, not all derivable from the code; the first is code-verified:

- The tool calls the standard first-party commercial Anthropic API (no Bedrock, no Vertex, no custom endpoint). Verified: `src/lib/claude.ts` constructs the stock `@anthropic-ai/sdk` client with only an API key, no `baseURL` override.
- Anthropic does not train on API data by default.
- Default retention at Anthropic is up to 30 days unless the account holds a Zero Data Retention agreement.
- Nothing in the code or deploy config sets up ZDR; there is no code-level mechanism for it, it is an account-level agreement.
- Account ownership, ZDR status and the Railway region (US vs EU hosting) are dashboard facts. [TODO: Will to confirm all three.]

What data flows where: the uploaded brief and everything derived from it goes to the Anthropic API in request bodies and comes back as generations; Railway sees the same traffic plus the structured stdout log lines from `src/lib/claude.ts` (endpoint, duration, token counts, no brief content); the user's browser localStorage holds the full session. No other party receives anything, because there is nothing else in the stack.

## 18. Team and process context

Team agreements as of July 2026. These are process facts, not code facts.

- **Fixes land on both branches.** Any fix to `main` is also applied to `vault-build` (and the July 16 fixes were, same day). See rule 2 in section 9 for the mechanics.
- **Richard Bowman is product manager** and runs the feedback tracker: a single prioritised list that replaces the previous pattern of ad-hoc email to Will. New bugs and requests go into the tracker, not into inboxes.
- **Version language is agreed**: v1 = the toys (the current builds), v2 = rolled out on Steadman tech, v3 = in Expedia's tech, with .x increments under each. Bug reports should quote the version so reports stay attributable as the tool evolves.
- **The CBB and the Vault are "one and a half builds"**: one tool with an unmerged extension, not two products. Log bugs against the right one — a Vault matching complaint belongs to `vault-build`, an audience or export complaint almost certainly to `main` (and by rule, its fix goes to both).
- **Fausto is expected to own the tool at Expedia eventually** — the likely receiving developer/owner as it moves in-house.
- **Phil (Expedia) has a pending request to bring the CBB into Expedia's environment** — the v3 path in the version language above.
- **Known bug reporters**: Dave reported the audience bug (fixed 16 July, section 5); Kirsty reports the network drops and generally chases user-facing glitches (the Chrome/EG-network triage failures in section 7 are her territory).

## 19. July 2026 engagement changelog — complete record of what changed and why

This section is the authoritative record of Will's final engagement week (15-17 July 2026). It is written so that an AI assistant reading it cold can reconstruct the reasoning behind every change, know exactly which behaviour is new, and avoid re-fixing or accidentally reverting any of it. Commits are on `main` unless noted; every one was merged to `vault-build` the same day (merge commits ebcd45e, ea52666, 9dd0861, a06e8ef, 3bca9c2, 8222802), with page.tsx changes hand-ported into `src/components/steps/*` and `src/lib/state/useHandlers.ts` because the branches structure that code differently (see section 2).

### 19.1 The audience-priority bug (Dave's bug) — commit ab0e4b8, hardened in 6d51110

**Symptom:** with a primary + secondary audience selected, the Creative Tenets step showed the secondary audience as "Confirmed Audience", blended both audiences' insights into one list, and generated tenets for the secondary. The final output partially recovered, which made the bug look intermittent.

**Root cause:** the audience flow walks `audienceBranches` one at a time (index 0 = primary, always). Each branch overwrote the single working-state fields (`selectedAudienceSegment`, `personification`, `selectedInsights`), and after the LAST branch (a secondary) nothing restored the primary. Every downstream consumer read the contaminated working state. `audiencePrioritisation` (the only structure that knows which segment is primary) was written once at selection and never read again.

**Fix mechanics (all still in force — do not revert any of these):**
- Final branch confirm restores branch 0 (segment, personification, insight options, insights) as working state before entering tenets. Main: the insights confirm handler in `src/app/page.tsx`; vault-build: `src/components/steps/InsightsStep.tsx`.
- Tenets generation sends ONLY the primary audience and its insights, plus `secondaryAudiences` (names, labelled context-only) and an explicit instruction in `src/app/api/generate/tenets/route.ts`: build solely from the primary, do not blend.
- The `audience` and `audience_insights` sections are written primary-first with explicit `(Primary)` / `(Secondary)` labels per audience.
- The compiled output's CREATIVE TENETS section is guaranteed to carry a "built solely from the primary audience" statement by `ensureTenetsProvenance` (`src/lib/output-postprocess.ts`) — a deterministic post-processor, because the compile is an LLM call and prompt adherence is not a guarantee. Unit tested (`src/lib/__tests__/output-postprocess.test.ts`).
- The tenets step cards read "Primary Audience" / "Primary Audience Insights" (`src/components/CreativeTenets.tsx`).

**Hardening (6d51110), after adversarial review found a re-contamination path:** `insightOptions` now persist per branch (`AudienceBranch.insightOptions`, optional for old sessions) and restore on every branch entry — forward, back, and final. Insight ids are 1-12 per generation, so selections are only meaningful against the options they were picked from; before this, revisiting the insights screen after finishing showed the primary's selections ticked against the last secondary's option texts. The confirm button also goes straight to the merge path when every other branch already has confirmed insights (`otherBranchesComplete`), so a revisit can never re-arm the full branch walk.

### 19.2 Export divergence — commit 98ee0cd

Word export previously rebuilt the document from raw sections and appended its own audience/personification/insights blocks (from the contaminated working state, compounding 19.1), so Word and Copy-to-Clipboard produced different briefs. `exportToWord` now renders the compiled `outputMarkdown` — the identical string the clipboard and markdown download use — whenever it exists; the raw-sections path survives only as a fallback. The markdown renderer (`markdownToParagraphs`) was extended across the week to cover H1-H4 headings, bullets, numbered lists, bold/italic/bold-italic, horizontal rules and the Differentiator prefix. Still NOT covered: tables and blockquotes.

### 19.3 Live user-feedback fixes (Richard's tracker, 16 July) — commit df8a8f5, completed in 5124b11

- **Budget silently dropped (Maddy):** `ProductionBudget` holds typed figures in local component state and only writes `state.budgetDetails` via its own "Confirm Budget" button. Two other advance paths skipped that capture: the generic section footer "Confirm & Continue" (hidden on the budget section in df8a8f5) and the floating bottom-right forward arrow (disabled on the budget section in 5124b11, with tooltip "Use Confirm Budget to continue"). Rule for the future: any new Gate 1 advance path must be gated the same way on `section.key === 'budget'`.
- **Crash on back-navigation (Maddy):** never reproduced; structural protection added instead. `src/app/error.tsx` is a Next.js route error boundary — render errors now show "Something went wrong / Your work is safe" with Try again and Reload & restore, instead of a white screen. Recovery is real because sessions auto-save every second. If Maddy's exact repro steps ever surface, the underlying error will be visible in that screen's message.
- **Insight text cut off (Maddy):** insight options rendered in single-line `<input type="text">`, so long text scrolled horizontally off-screen. Replaced with auto-resizing, wrapping `<textarea>` (main `renderInsightsStep`; vault-build `InsightsStep.tsx`).
- **Tenets all-or-nothing (Elena):** tenets were already click-to-edit (headline, dot points, differentiator), which was a discoverability failure, not a feature gap. Added: per-tenet remove (✕ on card hover, minimum 1 kept), "+ Add your own tenet" (maximum 5), a clearer hint line, and the destructive button relabelled "Regenerate all". This implements Richard's chosen direction (human-curated editing) rather than per-tenet AI regeneration, which remains unbuilt — see 19.6.

### 19.4 Context threading — commit de9a7f7 ("the LLM feels confused" fix), plus 5124b11

The client's core complaint was that the model doesn't factor in what the user has already decided. A full audit of every LLM call site found the tenets fix (19.1) had closed one instance of this fallacy but four earlier calls and one data path still had it. All fixed; the matrix after the fixes:

| Call | Now receives (new items in bold) |
|---|---|
| `/api/triage` | brief + **additionalContext from the tell-me-more screen** (was silently discarded by the route while the UI promised it would be used; merged context is passed as a function argument because React's setState is async and reading state immediately after would see the stale value — preserve that pattern) |
| `/api/generate/audience` (personify) | brief, segment, **additionalContext**, **secondarySegments** (client sent both for months; the route dropped them; the prompt's secondaryNote logic could never fire) |
| `/api/generate/truths` (insights) | audience, personification, **confirmed objective** (from the Gate 1 section), **brandAlignment** (route supported it since February, no client ever sent it — the same accepted-but-never-sent pattern as the original tenets bug; grep for this pattern when adding any route field) |
| `/api/generate/tenets` | objective, primary audience, primary insights, secondaryAudiences, brandAlignment, **personification narrative** (the confirmed persona was previously absent from tenets generation) |
| `/api/brand-fit` | **user-confirmed Gate 1 audience/objective content** (was the pre-confirmation triage synthesis; falls back to synthesis only when the section is unedited) |
| `/api/output` (compile) | sections, primary audience, personification, primary insights, brandAlignment, **budgetDetails typed by the user, marked authoritative** (previously the typed figures NEVER reached the final document — only stale section text did; the compile now renders them under BUDGET & CONSTRAINTS and is instructed they override conflicting section text) |

Prompt changes in the same commits: `prompts/output.json` heading changed from "PITCH PACK:" to "CREATIVE BRIEF:" (the dead product name was still mandated in the compiled document), plus a budget-authority rule; `prompts/audience-insights.json` gained an objective-fit rule ("an insight that fights the objective is a bad insight").

### 19.5 Reliability fixes — 5124b11 and the vault-build merges

- **Brand-fit timeout (Tim's bug 6, mitigated):** the fit check fetch now aborts after 45s (`AbortSignal.timeout`), and the existing error path auto-acknowledges, so a hung call can no longer leave the Continue button disabled forever — the most plausible mechanism behind "can't reliably pick the EG brand". Marked mitigated, not confirmed, because the original report was never reproduced.
- **Personification re-confirm no longer regenerates insights** when the branch already has saved options (both branches): it restores the branch's saved options + selections; Regenerate remains on the insights screen as a deliberate action.
- **vault-build only:** `handleConfirmInsights` now persists `insightOptions` alongside insights (its later setState was overwriting the branch record without them — a port bug caught by audit), and the background vault matcher receives `branchInsights` explicitly (its closure fallback read the pre-persist empty array, so match previews were computed with zero insights).
- **Session restore** merges stored state over `createInitialState()` on both branches, so sessions saved before newer state fields existed cannot restore with fields missing.

### 19.6 Explicitly NOT done — product decisions parked for Richard

1. Sending triage coherence tensions into the compiled client-facing document (prompt promises honesty; wiring exists nowhere; whether sellers want contradictions printed is a product call).
2. Brand-aware audience segment menus (menu is generated one step after brand confirmation but brand-blind; ~10-line change once approved, changes creative output character).
3. Re-checking brand fit against the confirmed audience segment (ordering is correct today; nothing revisits fit after audience confirmation).
4. Per-tenet AI regeneration (Elena's literal ask; Richard chose editability instead — if users still want it, it is an LLM call taking the kept tenets as context).
Also unaddressed: Chrome/EG root fix on main is the vault-build NDJSON streaming port (section 7); the two-page output cap remains prompt-only; tables/blockquotes in Word.

### 19.7 Verification evidence

- Unit tests: main 74/74, vault-build 150/150, clean production builds on both, after every commit above.
- Two full live end-to-end runs against a real two-audience Nashville brief (all 7 LLM calls in client order): primary-first TARGET AUDIENCE, per-audience attributed insights, tenets provenance statement present, tenets content verifiably primary-only; second run additionally confirmed the tell-me-more call note visibly shaped the triage assessment, the typed budget (USD 135,000 production) appeared in BUDGET & CONSTRAINTS with a derived media remainder, and no "PITCH PACK" heading.
- Three independent code audits (adversarial review, 26-item requirements audit, LLM context-threading audit); every actionable finding fixed same-day and re-verified.

### 19.8 Deployment state at handover

`steadman-ai/expedia-cbb` (canonical) holds everything above on both branches. Production Railway deploys from the LEGACY repo `willaudiencestrategies/pitch-pack-tool` `main` (section 8). Whether the July work is live depends on whether that legacy main has been pushed — check `git log origin/main` against this changelog's commits before assuming.
