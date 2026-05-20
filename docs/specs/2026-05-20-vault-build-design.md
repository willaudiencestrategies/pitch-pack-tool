# Vault Build — Design Spec

**Date:** 20 May 2026
**Status:** Draft, written by Will, to be reviewed by Tim before build
**Audience:** Will (build), Tim (architecture, prompts), Richard (prompts), Dave (Vault content, validation), Kirsty (review), Cynthia (Drive permissions)

This spec sits downstream of two documents that the team has already read: Tim's V4 engineering brief and the V5 architectural decision doc, both dated 13 May, both currently in Will's inbox. Those two documents settle what we're building and why. This spec turns those decisions into an implementation plan that lives inside the existing Pitch Pack Tool codebase, with the architectural foundation work that has to come first, and a day-by-day sequence for the build.

---

## 1. What this is, in plain English

The Pitch Pack Tool today walks a Commercial Partner (CP) through a creative brief in two gates: triage of the inbound brief, then a guided rebuild of the brief section by section. The output is a structured brief that the Creative Lab uses to ideate new creative work.

What we're adding is a fork in the middle of that flow. After the CP has finished the audience and human-truth work (which the tool calls Gate 2 Step 4), the tool checks whether E Studio already has a validated creative concept in the Vault that matches this brief. If yes, the CP can skip the rest of the brief-building (Creative Tenets, Media Context, Research Stimuli) and go straight to a pitch-ready package built around an existing concept. If no, or if the buying client later rejects the Vault concept, the CP carries on through the existing brief flow to feed the Creative Lab as today.

The Vault is roughly 33 validated concepts today (growing to 50-60 once Dave's video format franchises land), held in a Word document on Drive. For v1 we convert that to a structured JSON file the tool can match against, with a hand-written cleanup pass before conversion to handle inconsistencies like the broken Volkswagen entry.

The goal is to give the seller a faster path to a strong pitch when an existing concept fits, without sacrificing the creative judgement the tool already supports when it doesn't.

---

## 2. Why this matters

Three commercial pressures are converging.

First, sellers are pitching against tight SLAs, often without enough partner contact time to enrich the brief properly. Today the tool helps them build a better brief, but the brief still has to travel into the Creative Lab, where net-new ideation takes weeks. For a meaningful slice of incoming briefs, the right answer isn't net-new creative, it's an existing concept that already works for this kind of partner.

Second, the Vault as it stands lives in a Word document that almost nobody reads cold. Concepts get rediscovered slowly, through institutional memory and Slack mentions, rather than systematically matched against incoming briefs. The Vault tool turns that institutional memory into a deterministic step in the workflow.

Third, the existing tool's architecture is healthy but the central page file has grown beyond the point where new flows can be safely bolted on. Doing the Vault work without addressing this would bake the next round of pain into the codebase before the tool has even shipped Vault. The context refactor described in Section 5 is the foundation that makes the Vault flow possible to build cleanly, and which the next sprint of work after Vault will also benefit from.

---

## 3. The user journey, narrated

Here is what the CP experiences once Vault is live.

The CP uploads a brief as today. The tool runs triage, then walks them through Gate 1 sections (Objective, Budget, Audience, Creative Task) and into Gate 2. They confirm brand alignment, work through their audience selection (one or more segments), produce a personification, and pick their human truths (insights).

The moment the CP confirms their insights and saves Step 4, the tool fires the Vault matcher in the background. The CP doesn't see this happen. By the time the next screen renders, the matcher has either found candidates worth a look or has come back empty.

The next screen is the Vault decision screen. It shows a short recap of the brief so far (objective, audience, insights), the CP's confirmed budget, and a preview signal derived from the matcher. The signal is one of four states: "Strong matches found" (at least one Strong-confidence concept), "Some matches worth a quick scan" (Plausible matches but no Strong), "Closest fits found but nothing strong" (only Stretch matches), or "Vault has nothing close" (the pre-filter returned nothing or only excluded categories). The CP picks between "Take to the Vault" and "Continue to Creative Tenets". The default highlight follows the signal, so a Strong result nudges toward Vault, a None result nudges toward Tenets, but the CP always has the choice.

If they continue to Creative Tenets, the existing flow plays out unchanged: Tenets, Media Context, Research Stimuli, Output. Nothing in their experience changes.

If they take the Vault path, three things happen in sequence.

The first is an audience picker, but only when the brief has more than one audience branch. If the CP picked just a primary audience, the tool silently uses that branch's insights and skips this screen. If they picked a primary plus one or two secondary audiences, the tool asks once: "Match against which audience?" with options for each branch by name plus "All combined". This is a deliberate UX choice. The existing brief flow processes each audience branch independently, and the truths from each branch are genuinely different. The Vault matcher needs to know which set of truths to weight, because matching against a merged truth pool produces concepts that fit some audiences and not others without saying which. The picker gives the CP explicit control rather than pretending one merged truth exists.

The second is the production budget gate, but only when the brief lacks an explicit production budget figure. If the brief already specifies what portion of total budget is available for production (a number, or a percentage of total), the gate is skipped. If the brief has only total or media or blended budget, the tool asks once: "Before I can match this to existing Vault concepts, please confirm what portion of this budget is available for production." A number input plus quick-pick buttons for the common splits (10%, 15%, 20% of total). Matching cannot proceed without this, because both the deterministic pre-filter and the LLM ranking need a production budget figure.

The third is the match list itself. The tool surfaces three to five ranked matches in Top Match A-E format. Each match shows:

- A concept title and a short description tailored to this brief
- A confidence label (Strong, Plausible, or Stretch) with a one-sentence reason explaining what makes it that confidence level
- The estimated production timeline, reproduced verbatim from the Vault entry, with no normalising
- A flag if the concept is borderline on budget (the ±10% close-to-edge case inside the 20% hard cutoff)
- A flag if the concept is "too destination-specific" to transplant or "overly generic" without a strong creative idea (the two creative quality safeguards)

If everything is a Stretch, the matcher's output starts with a clear top-line note recommending Creative Lab while still surfacing what the Vault has, rather than refusing to match. The CP sees what's there honestly labelled and decides.

The CP picks one (or more) concepts they want to expand. Dave's required Creative Lab reminder fires before generation: "It's great that you think there are some interesting options, but to be safe, please ensure you speak with the Creative Lab team..."

The tool then generates a six-slide narrative draft for each selected concept. Each draft follows a fixed structure:

- **Slide 1: Key Brief Points.** A restatement of the strategic inputs (partner, objective, audience, focus, timing, market, budget, tensions) plus the CBT triage traffic lights showing which parts of the original brief were strong and which needed enrichment. This anchors the whole pitch in the actual brief.
- **Slide 2: Creative Problem We're Solving.** The brief reframed as a creative challenge, with framing of why the existing concept fits, not a new concept invented on the fly.
- **Slide 3: Narrative Pitch.** The concept sold as a story. What the audience experiences, how it unfolds, what shift occurs, what impression they leave with. Presentation-ready copy the seller can read aloud.
- **Slide 4: Concept Description (Full).** A comprehensive articulation that leans heavily on the original Vault entry's creative structure, tone, and mechanism, and embeds the concept's deployment examples directly (for instance the Jamaica and Bahamas references for Eats and Beats) so the seller has concrete proof points without leaving the pack.
- **Slide 5: Tailoring the Concept to [Partner].** Controlled adaptation, with explicit allowed and forbidden modifications. Allowed: destination, culture, atmosphere, local characters, property type, travel occasion, seasonality. Forbidden: speculative new executions, channels not in the original concept, invented production details, claims unsupported by the brief or the Vault.
- **Slide 6: Strategic Fit & Budget.** The strategic and audience and objective rationale, the watchouts, the verbatim production timeline, the verbatim production budget, the in-range confirmation with the close-to-edge flag if relevant, the era flags and last-validated date from the Vault metadata so the seller knows whether the concept is fresh, and a flag if Creative Lab input is required before the seller takes the concept externally.

The CP can edit any slide inline before exporting. When they hit Export, the tool generates a pitch-ready package containing the matches summary, the chosen concept's six-slide draft, the reference materials (links to original pitch slides and deployment examples), the production parameters, and at the bottom a "Resume in tool" link with an encoded resume token. The seller takes the pack into the client meeting. The CP doesn't see the resume link in the client-facing view; it's there for the CP themselves if they need to come back.

The seller pitches the buying client. If the client accepts, the brief goes to production and the Vault flow is done. If the client rejects the concept, the CP clicks the resume link, the tool decodes the token, restores their full brief state, and routes them to Step 5 (Creative Tenets) with a small sidebar showing the rejected Vault matches so the team has context. From there the CBT runs Tenets, Media, Stimuli, and exports to the Creative Lab as today, with a line in the brief telling the Lab "this brief already had X and Y surfaced and they didn't land."

That is the full journey. Everything else in this document is what we have to build to make it happen.

---

## 4. Three things that change from today

Three changes underpin everything in this spec, and they all flow from the V4 and V5 documents.

The first is the new fork. The existing flow goes triage → Gate 1 → Gate 2 (brand, audience, insights, tenets, media, stimuli) → output. The new flow inserts a decision point between insights and tenets. The downstream of that fork is either the existing tenets-onwards flow, or the new Vault flow. This is a clean cut in the existing code because Step 4 (insights) and Step 5 (tenets) are already separate steps in the state machine.

The second is that state has to survive longer than a browser session. Today the tool keeps state in browser localStorage with a 24-hour expiry under a single shared key. For the Vault loopback path to work, the CP needs to be able to come back days or weeks later, possibly on a different machine, after the seller has been in a client meeting. The fix is a resume token baked into the exported pack, encoded as base64 JSON in a URL, plus a per-brief session storage key with a 30-day expiry for active in-tool work. The token is the persistence layer; localStorage is just there so the CP can close their laptop and come back tomorrow.

The third is the foundation refactor that makes the new flow possible to build cleanly. The page that runs the existing tool is currently 3,291 lines in a single file, with every step's render function defined inline as a closure. Adding five new step components into that file would push it past 4,000 lines and tangle the Vault logic into the same closure scope as every other step. We need a context-based architecture in place before the Vault work lands, otherwise the technical debt this work generates will dominate the next sprint.

---

## 5. The foundation: context refactor

Before any Vault code lands, the existing page is refactored to a context-based architecture. This is two days of mechanical work that doesn't change what the tool does, only where the code lives.

### Why now, not later

Three reasons. First, the new five Vault step components want the same state and handlers every existing step wants. Building them inline against the existing structure means duplicating that boilerplate five times, then either refactoring later (which never happens in practice) or living with the duplication permanently. Second, doing the refactor before the Vault work means the Vault components land into the clean architecture, which makes them easier for Tim and Richard to review and easier for anyone to extend in v1.1. Third, the existing tool's other pain points (the long page file, the prop-less closures, the implicit handler dependencies) are getting worse with every feature added. This is the natural moment to fix them.

### What changes

The page.tsx file shrinks from 3,291 lines to roughly 400-600, containing only the provider wrapper, the header, the progress bar, the global error banner, the step dispatch switch, and the modals. The eleven existing step renderers (currently inline closures occupying lines 1855-3187) move out entirely. The handler closures and progress hooks move into the context. Everything that remains is glue.

A new `BriefStateContext` provider holds the state, the updateState function, the full handler bag (handleSelectAudience, handleGenerateInsights, handleBudgetConfirm, the rest), the progress hooks (insightsProgress, audienceProgress), and the history utilities (pushHistory, lastAction). Consumers read what they need via a `useBriefState()` hook.

The eleven existing step renderers become eleven step component files under `src/components/steps/`: UploadStep, TellMeMoreStep, TriageStep, Gate1SectionsStep, GateTransitionStep, BrandAlignmentStep, Gate2AudienceStep, InsightsStep, CreativeTenetsStep, MediaContextStep, OutputStep. Each one is a self-contained React component reading from the context, around 150-400 lines.

The handler closures move into a `useHandlers(state, updateState)` custom hook in `src/lib/state/useHandlers.ts`. This keeps them as a single coherent unit, testable in isolation, and avoids each step re-deriving them.

### What stays the same

The state shape doesn't change. The flow doesn't change. The components downstream of the steps (AudienceMenu, PersonificationReview, CreativeTenets, etc.) don't change. The API routes don't change. The tests don't change in intent; some import paths shift.

### Risk and mitigation

The refactor touches every step in the live tool, so there's a regression risk. Three mitigations: TypeScript catches the bulk of issues at compile time (a missed prop in the context shape becomes a build error), the existing 61 vitest tests run after each step extraction, and the refactor ends with an end-to-end smoke test against one of Kirsty's real briefs before any Vault work begins.

If a smoke test fails, the refactor pauses and the failure is fixed before continuing. The Vault build doesn't start until the refactor is green.

---

## 6. Architecture overview

Once the refactor is in, the Vault build sits on top of a clean foundation. Here is what the new architecture looks like.

### The fork point

The existing step type `gate2_insights` already exists in the state machine. When the CP confirms their selected insights, today the tool advances to `gate2_tenets`. The change is that confirming insights now advances to a new step, `vault_decision`, which renders the new VaultDecisionStep component.

From the decision step, the CP either advances to `gate2_tenets` (the existing flow, unchanged), or branches into the Vault flow: `vault_audience_picker` (when needed), then `vault_production_budget` (when needed), then `vault_matches`, then `vault_narrative_draft` (when the CP picks concepts to expand), then `vault_export`.

The state machine's step union grows by six values. The dispatch switch grows by six cases. Everything else is contained in step component files.

### The background matcher

The moment `gate2_insights` saves, the tool fires the matcher in the background via a fetch to `/api/vault`. This happens before the CP sees the decision screen, so by the time they look at the screen, `state.vaultMatchPreview` is already populated with the preview signal (Strong, Plausible, Stretch, or None). The full match result is cached in state too, so if the CP picks the Vault path, they go straight to the results without a second model call.

The matcher itself runs in two stages. Stage one is a deterministic TypeScript pre-filter in `vault-filter.ts`. It hard-cuts concepts whose production budget is more than 20% above or below the brief's confirmed production budget. It applies a ±10% soft flag for close-to-edge concepts so the matcher can warn the CP about borderline cases. It filters out concepts that can't deliver the brief's must-have channels. It excludes non-endemic entirely in v1 (deferred to v1.5). Partner type is not used as a filter, only as a ranking signal passed through to the LLM. The pre-filter typically narrows ~33 concepts down to 6-15 candidates.

Stage two is the LLM matching call to Claude Sonnet 4.6, using the Role/Task/Logic/Output prompt pattern that Richard's other prompts already follow. The prompt receives the Steps 1-4 outputs (with the CP-confirmed audience branch's insights, per Section 7), the brief-derived partner type, the confirmed production budget, and the filtered candidates. It returns 3-5 ranked matches in Top Match A-E format, each with a Strong / Plausible / Stretch confidence label and a one-sentence reason. If everything is a Stretch, the output opens with a clear top-line note recommending Creative Lab. Production timelines are reproduced verbatim.

The exact prompt content is drafted by Tim and Richard. This spec doesn't dictate the prompt copy, only the shape of the call, the input it receives, and the output it must produce.

### The audience picker (Option 4)

The Pitch Pack Tool today supports audience branching: when the CP picks multiple audience segments, the tool creates one branch per segment, each with its own personification and insight set. By the time the CP reaches the Vault decision point, all branches have been processed.

The question for the Vault matcher is which branch's insights to use. The decision is:

- If there's only one branch (CP picked just a primary audience), the matcher silently uses that branch's insights. No screen is shown.
- If there are multiple branches (CP picked a primary plus one or two secondaries), the tool inserts a single-screen audience picker before matching. The CP sees the audience names and picks one, or picks "All combined" to merge the truth sets.

Two reasons for this design. First, the existing brief flow already produces per-branch insight sets, and they're meaningfully different across audiences. Matching against a merged pool produces concepts that fit some audiences without saying which. Second, surfacing the choice explicitly gives the CP control rather than the tool silently picking the primary and the CP wondering why a concept they expected to surface didn't.

Multi-audience parallel matching (running the matcher once per branch and showing per-branch result sets) is a v1.5 feature if Kirsty's testing surfaces demand for it.

### The production budget gate

The pre-filter and the LLM matcher both need a production budget figure. The existing brief flow captures total budget reliably but production budget unreliably (some briefs have an explicit split, many don't). The Vault flow gates on this: if the brief already has a production figure, the gate is skipped. If not, a single-screen input renders before matching, with a number input and quick-pick buttons for the common splits.

This is the ONE genuinely new screen in the Vault flow. Partner type is derived from the existing brief structure (no screen needed). Brief analysis is already produced by Steps 1-4 (no extra screen needed). Dave's GPT spec runs all three as separate conversational gates because ChatGPT can't access upstream state; we can, so we skip the two that are redundant.

### Resume tokens and state persistence

Three layers of state:

The first is in-tool browser localStorage, keyed per `briefId` rather than the current single shared key. Expiry bumped from 24 hours to 30 days. This handles the CP closing their laptop and coming back the next morning. Multiple briefs can live side by side without colliding.

The second is the resume token. When the CP exports a Vault pack, `vault-resume-token.ts` encodes the relevant slice of state (briefId, brief text, triage, Steps 1-4 results, audience branches, production budget, full vaultResult including ranked matches and selected narrative draft) as a base64-encoded JSON string and appends it as a query parameter on a URL pointing back at the tool. The token is the persistence layer that survives a seller-client cycle.

The third is the loopback re-entry. When the CP clicks the resume link, the tool decodes the token, sets `state.resumedFromToken: true`, restores the full BriefState, and routes to Step 5 (Creative Tenets) with a small sidebar showing the rejected Vault matches. From there the tool continues to Tenets, Media, Stimuli, and exports to Creative Lab as today, with the Vault context flowing into the export so the Lab knows what was tried.

For v1 the token is unencrypted base64 JSON in a share-with-anyone URL. If Expedia InfoSec needs tighter scoping later (SSO-only, signed tokens, server-side session lookup), it layers on top without changing the data model.

---

## 7. Data model

The data model changes are additive. Nothing in the existing SessionState shape is removed or renamed.

### Extensions to SessionState

```typescript
// In src/lib/types.ts

export interface SessionState {
  // ...all existing fields unchanged...

  // NEW Vault-related fields
  briefId: string;                              // stable per-brief identifier
  productionBudget: number | null;              // confirmed production figure in USD
  partnerType: VaultCategory | null;            // derived from brief structure
  vaultAudienceBranchIndex: number | null;      // which branch was picked for matching
  vaultMatchPreview: VaultMatchPreview | null;  // populated by background matcher
  vaultResult: VaultResult | null;              // full match data + narrative drafts
  resumedFromToken: boolean;                    // true when CP returns via resume URL
}

export type VaultCategory =
  | 'destination'
  | 'lodging'
  | 'airline'
  | 'car'
  | 'non-endemic';

export interface VaultMatchPreview {
  signal: 'strong' | 'plausible' | 'stretch' | 'none';
  rankedCount: number;
  topConceptName: string | null;
  cachedAt: string;
}

export interface VaultResult {
  rankedConcepts: VaultConceptMatch[];          // 3-5 entries, slots A-E
  selectedConceptIds: string[];                 // CP picks one or more for expansion
  narrativeDrafts: Record<string, NarrativeDraft>;  // keyed by concept ID
  customEdits: Record<string, string>;          // CP's inline edits to drafts
  exportedAt: string | null;
  resumeToken: string | null;
}

export interface VaultConceptMatch {
  conceptId: string;
  conceptName: string;
  slot: 'A' | 'B' | 'C' | 'D' | 'E';
  confidence: 'strong' | 'plausible' | 'stretch';
  confidenceReason: string;
  partnerTypeMatch: 'same-category' | 'adjacent';
  budgetFlag: 'within-range' | 'close-to-edge';
  conceptDescription: string;
  estimatedProductionTimeline: string;          // VERBATIM from vault
  estimatedProductionBudget: string;            // VERBATIM from vault
  qualityFlags: ('too-destination-specific' | 'overly-generic')[];
  referenceLinks: string[];
}

export interface NarrativeDraft {
  conceptId: string;
  slides: {
    keyBriefPoints: string;
    creativeProblemWeAreSolving: string;
    narrativePitch: string;
    conceptDescriptionFull: string;
    tailoringTo: string;
    strategicFitAndBudget: string;
  };
  creativeLabFlag: boolean;
}
```

### Vault content schema

The Vault is parsed once from `THE VAULT_November 2025_Kat.docx` (Dave to confirm canonical version) into `src/lib/vault-content.json`. Schema per concept:

```typescript
export interface VaultConcept {
  id: string;
  name: string;
  conceptType: 'one-off' | 'franchise';
  category: VaultCategory;
  archetype: string[];                          // e.g. ['food-and-drink', 'reappraisal']
  ideaSummary: string;
  creativeMechanism: string;
  coreMessage: string;
  whatItsGoodFor: string[];
  audienceFit: string[];
  channelsFormats: string[];
  watchouts: string[];
  previouslyPitchedTo: string[];
  productionTimelineRaw: string;                // VERBATIM source string
  productionTimeline: { minWeeks: number; maxWeeks: number };  // parsed for filter only
  productionBudget: BudgetTier[];
  referenceLinks: string[];
  lastValidated: string | null;
  eraTags: string[];
}

export interface BudgetTier {
  label: string;                                // e.g. "1x creator", "3x films"
  minUsd: number;
  maxUsd: number;
}
```

The Klarna concepts (One Click to Mahi Mahi, Point A to Yayyy, Smoooth Recognition, Spotlight Festivals) are treated as four independent records in v1. If Dave confirms they were pitched as a single brand programme, v1.1 adds a parent-child wrapper.

---

## 8. New files

The Vault build adds the following files to the repo. All paths are absolute.

### State and architecture (foundation)

- `/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/src/lib/state/BriefStateContext.tsx` — React Context provider holding state, updateState, handlers, progress hooks, history utilities. Exposes `useBriefState()`.
- `/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/src/lib/state/useHandlers.ts` — custom hook returning the full handler bag.

### Vault data and logic

- `/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/scripts/parse-vault.ts` — one-shot script that parses the Vault Word doc into vault-content.json. Run manually, not in the live tool.
- `/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/src/lib/vault-content.json` — the structured concept data, derived from the Word doc.
- `/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/src/lib/vault-filter.ts` — the deterministic pre-filter.
- `/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/src/lib/vault-resume-token.ts` — encode/decode for resume tokens.
- `/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/src/lib/prompts/vault-match.ts` — the matching prompt (drafted by Tim and Richard).
- `/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/src/lib/prompts/vault-narrative-draft.ts` — the six-slide expansion prompt (drafted by Tim and Richard).

### API endpoint

- `/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/src/app/api/vault/route.ts` — new endpoint serving both the match call and the narrative-draft call. Same streaming pattern as existing endpoints.

### Step components

- `/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/src/components/steps/VaultDecisionStep.tsx` — the fork screen with the preview signal.
- `/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/src/components/steps/VaultAudiencePickerStep.tsx` — the audience picker, only rendered when there are multiple branches.
- `/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/src/components/steps/VaultProductionBudgetStep.tsx` — the production budget gate, only rendered when the brief lacks an explicit split.
- `/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/src/components/steps/VaultMatchListStep.tsx` — the Top Match A-E results view.
- `/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/src/components/steps/VaultNarrativeDraftStep.tsx` — the six-slide editor.
- `/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/src/components/steps/VaultExportStep.tsx` — the pitch-pack export with resume URL.

### Modified files

- `/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/src/lib/types.ts` — adds the new types listed in Section 7.
- `/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/src/lib/session-storage.ts` — per-briefId keys, 30-day expiry, multi-brief support.
- `/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/src/lib/word-export.ts` — extended to handle the new Vault pack output structure (matches summary, six-slide draft, reference materials, resume URL).
- `/Users/will.bainbridge/Desktop/World/04_Ventures/steadman-ai/clients/expedia/pitch-pack-tool/src/app/page.tsx` — shrinks from 3,291 lines to roughly 200, contains only the provider wrapper, header, progress bar, dispatch switch, and modals.

---

## 9. Implementation sequence

The full build runs across two working days.

### Wednesday 20 May (today)

**Morning** — Foundation refactor, part one. Create the BriefStateContext provider and useHandlers hook. Extract the simplest steps first to validate the pattern: UploadStep, TellMeMoreStep, TriageStep, Gate1SectionsStep. Run vitest after each extraction.

**Afternoon** — Foundation refactor, part two. Extract the remaining steps: GateTransitionStep, BrandAlignmentStep, Gate2AudienceStep, InsightsStep, CreativeTenetsStep, MediaContextStep, OutputStep. End-of-day smoke test the full existing flow against one of Kirsty's real briefs to confirm zero regression. Commit the refactor as its own clean change.

**Evening (if needed)** — Word-to-JSON parser. Manual cleanup pass on the Vault doc inconsistencies (Volkswagen entry, inconsistent headings). Produce vault-content.json. types.ts extensions.

### Thursday 21 May (tomorrow)

**Morning** — Vault plumbing. vault-filter.ts with budget + channel + non-endemic + close-to-edge logic. vault-resume-token.ts encode/decode. session-storage.ts migration to per-briefId keys with 30-day expiry. /api/vault/route.ts with a deterministic stub matcher that returns mock matches matching the V4 schema (for testing the UI before Tim's prompt lands).

**Midday** — Vault UI, first half. VaultDecisionStep with the background matcher firing on Step 4 save and the preview signal. VaultAudiencePickerStep (conditional). VaultProductionBudgetStep (conditional). Wire the new step values into the dispatch switch.

**Afternoon** — Vault UI, second half. VaultMatchListStep with Top Match A-E rendering, confidence labels, reasons, selection state, Creative Lab reminder. VaultNarrativeDraftStep with the six-slide editor. VaultExportStep extending word-export.ts with the new pack structure and the resume URL.

**Late afternoon** — Integrate Tim's matching prompt (replacing the stub). Integrate Tim's narrative-draft prompt. End-to-end smoke test against a real brief, generating a full pack.

**Evening** — Loopback re-entry (resume URL decode, route to Step 5, sidebar with rejected matches). If time runs short, this defers to Friday. Loopback is needed for the full story but not for the 29 May review demo.

### Friday 22 May onward

Buffer for prompt testing against Kirsty's briefs as they arrive, polish, anything that slipped from Thursday, and any iteration Tim asks for during Phase A testing.

The Thursday 29 May review happens on the working prototype.

---

## 10. Decisions locked

These match the V5 architectural decision doc. Documented here for completeness so this spec stands alone.

| Item | Decision |
|---|---|
| Where the Vault sits in the workflow | Fork between Gate 2 Step 4 (Insights) and Step 5 (Tenets) |
| Background matcher | Fires the moment Step 4 saves |
| Audience branching | Silent primary for single-branch; picker screen for multi-branch (Option 4) |
| Production budget gate | One new screen, only when brief lacks explicit production split |
| Confidence rating | Strong / Plausible / Stretch label on every match, no hidden threshold |
| Match count and format | 3-5 ranked matches in Top Match A-E format |
| Budget tolerance | 20% hard cutoff outside range, ±10% soft flag inside |
| Partner type | Soft ranking signal, not hard gate; adjacency allowed |
| Output structure | Two-stage: matches first, six-slide draft on selection |
| Production timeline | Reproduced verbatim from vault, no normalising |
| Creative Lab reminder | Fires after concept selection |
| Six-slide draft structure | Dave's baseline plus CBT triage on Slide 1, deployment examples on Slide 4, era flags on Slide 6 |
| When matches are weak | Always surface what's there with honest labels; top-line note if all Stretch; no refuse-to-match |
| Non-endemic in v1 | Deferred to v1.5 |
| Klarna in v1 | Four independent concepts; v1.1 adds parent-child wrapper if Dave confirms programme intent |
| State persistence | Resume token in exported pack; localStorage per-briefId with 30-day expiry for in-tool work |
| Rejected Vault concepts on loopback | Sidebar at Step 5, not headline context |
| Source of truth | Word doc remains source, JSON derived; needs a named owner for re-export |
| Foundation refactor | Context-based architecture lands before any Vault code |

---

## 11. Deferred to v1.5

- Non-endemic concepts (seven concepts: Klarna, Visa, Audible, Estee Lauder)
- Multi-audience parallel matching (one matcher run per branch)
- Brand Target Audiences deck cross-check (uploaded reference doc)
- Optional Slide 7 in the narrative draft (Objections and how to handle them)
- Signed or auth-scoped resume tokens (currently unencrypted base64)

Note: the Klarna campaign-suite wrapper is scoped for v1.1 (not v1.5), pending Dave's confirmation that the four concepts were pitched as a single programme rather than four independent ideas.

---

## 12. Open items going to the 29 May review

These need confirmation but don't block the build:

- **Canonical Vault file.** Dave's GPT references `1THE VAULT_November 2025_Dave.docx`; we're parsing `Kat.docx`. Dave to confirm before the JSON migration is final. We parse Kat.docx for v1 and tag the JSON with a `sourceFile` field so a re-parse from Dave.docx is mechanical.
- **Drive link permissions.** Cynthia to confirm share-with-anyone permissions on the original concept pitch slides and deployment examples. If SSO is required, the reference materials section of the export needs a different pattern.
- **Vault content cleanup.** Volkswagen has no budget or timeline. Inconsistent headings throughout. Half-day cleanup by Dave and Kirsty before the JSON is considered locked.
- **Named owner for Word-to-JSON re-export.** Dave or Kirsty needs to own this. Without an owner the JSON will rot the moment Kat updates the Word doc.

---

## 13. Risks

- **Foundation refactor regression.** Mitigation: extract one step at a time, run vitest after each, end-to-end smoke test before any Vault code begins.
- **Tim's prompts arrive late or in a different shape than expected.** Mitigation: build to the precise output schema in V4 Section III, use a deterministic stub matcher during UI build so the prompt integration is a one-file swap.
- **State doesn't survive the seller-client cycle.** Mitigation: resume token in the exported pack, designed and tested before the prototype review.
- **Word doc JSON rots when Kat updates the source.** Mitigation: named owner accountable for re-running the conversion script. Surfaced at the 29 May review.
- **Drive link permissions block sellers from sharing references.** Mitigation: Cynthia confirms during the review week.
- **Matching prompt over-confidently surfaces Stretch fits.** Mitigation: Strong/Plausible/Stretch labels visible to the CP, one-sentence reason per match, top-line note when everything is a Stretch, two creative quality safeguards (too-destination-specific, overly-generic) flagged in the ranking.
- **CPs route everything to the Vault because it's faster.** Mitigation: preview signal on the decision screen nudges toward Tenets when nothing qualifies. Post-launch telemetry should show the Vault-to-Lab ratio.
- **Thin coverage in airline (2 concepts) and car (1) returns weak matches.** Mitigation: partner type as ranking signal not gate; matcher reaches into adjacent categories and flags the cross-category reach honestly.
- **Compressed timeline.** The full refactor plus Vault build in two days is aggressive. If something slips, the order of cutting is: loopback re-entry first (defers to Friday), then VaultExport polish (ship minimum-viable export, polish post-review), then narrative draft (ship match list only, narrative as v1.1) only as a last resort. The refactor itself does not get cut; it's the foundation everything else depends on.

---

## 14. People

- **Will**: Foundation refactor, all Vault step components, data model, filter, endpoint, resume token plumbing, vault-content JSON migration. Wednesday and Thursday this week.
- **Tim**: Architectural lead, drafts the v1 matching prompt and the narrative-draft prompt with Richard, runs Phase A prompt testing against Kirsty's briefs, prepares the 29 May review.
- **Richard**: Drafts Role/Task/Logic/Output for both prompts with Tim. One-hour session this week.
- **Kirsty**: Provides cross-section of recent briefs as the Phase A test set. Source-of-truth call with a named owner. Word doc freeze decision. Reviewer at the 29 May session.
- **Dave**: Confirms canonical Vault file. Validates existing concepts (still-valid / needs-update / retire). Consolidates the video format franchises. Confirms Eats and Beats as canonical example. Confirms Klarna programme intent (or not).
- **Cynthia**: Confirms Drive link permissions. Identifies any other Expedia stakeholders to include in the review.
- **Kat**: Current Word doc maintainer. Conversation about JSON ownership at the 29 May review.
- **Fausto**: Optional reviewer for Vault outputs via a "Send to Fausto for sense-check" action. No mandatory role in v1.

---

## 15. What this spec doesn't decide

Some intentional gaps, called out so they don't surprise anyone:

- The exact prompt copy. This spec dictates input shape, output shape, and the Logic constraints. The wording inside the Role/Task/Logic/Output sections is Tim and Richard's call.
- The visual design of the new step components. They follow the existing tool's visual language and the existing component patterns (PersonificationReview, CreativeTenets, BrandAlignment). Specific Tailwind classes and copy decisions happen during the build.
- The contents of the Vault content JSON. That comes out of the parse script plus Dave's validation pass on the Word doc.
- Telemetry. Post-launch we want Vault-to-Lab ratio, confidence distribution per match, time-to-pack, edit counts on slides. Not in v1 scope but worth flagging now so the data model can include the hook points.
- Migration of in-flight sessions. The session storage key format changes (single key → per-briefId keys). Existing in-flight sessions get a one-off migration on first load, or get cleared with a banner. Decided during the session-storage.ts work on Thursday morning.

---

*End of spec.*
