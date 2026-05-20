# Vault Build — Test Findings

**Date:** 20 May 2026
**Status:** Section 1 (CSS audit) complete. Sections 2-6 in progress.

---

## Section 1 — CSS / design language audit

### Verdict: ❌ Significant inconsistency. The Vault step components were built mechanically without invoking the frontend-design skill and do not match the existing tool's design polish.

### Existing tool design language (catalogued from PersonificationReview, CreativeTenets, BrandAlignment, AudienceMenu)

**Container:** root `<div className="space-y-6">`. Parent provides the max-width and padding via FloatingNavButtons / header layout. Step components do NOT set their own max-w / px / py — they live inside the parent's container.

**Header:** centered, with a Gate badge pill, h2 title, subtitle p, divided by `pb-6 border-b border-[var(--border-color)]`.
```jsx
<div className="text-center pb-6 border-b border-[var(--border-color)]">
  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider mb-4"
       style={{ backgroundColor: 'var(--expedia-navy)', color: 'white', opacity: 0.85 }}>
    Gate 2: Step X
  </div>
  <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Title</h2>
  <p className="text-[var(--text-secondary)]">Subtitle.</p>
</div>
```

**Top-left back link** (consistent across all steps):
```jsx
<button onClick={onBack} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1">← Back</button>
```

**Cards:** `p-4 rounded-xl border` (not `rounded-lg`), with `var(--bg-secondary)` background and `var(--border-color)` border. Selected state uses `border-2 border-[var(--expedia-navy)] bg-[var(--expedia-navy)]/5 shadow-md`. Hover: `hover:border-[var(--expedia-navy)]/50 hover:shadow-sm transition-all`.

**Buttons:** use the project's `.btn-secondary` / `.btn-outline` / `.btn-edit` classes (defined in globals.css). Custom inline button styling is the exception, not the rule.

**Section dividers between content blocks:** `pt-4 border-t border-[var(--border-color)]`.

**Text colour discipline:** every text element explicitly sets `text-[var(--text-primary)]` / `text-[var(--text-secondary)]` / `text-[var(--text-muted)]` — never relies on defaults.

**Loading state in buttons:** SVG spinner + "Generating..." text inside the button while async ops run.

**Card-as-button selection pattern** (BrandAlignment, AudienceMenu): a card with radio indicator inside, full-card click target, selected state styled with navy border + tinted background + shadow.

**Animations:** fadeSlideIn on freshly generated content (CreativeTenets).

### Gaps in the Vault step components

Every one of the six Vault steps fails on the same set of points:

| Gap | Severity | Affects |
|---|---|---|
| No Gate-style header pill badge | Important | All 6 |
| No centered header with border-b divider | Important | All 6 |
| No top-left back link in the established style | Important | All 6 except Decision/Picker where it's "back to previous step" implicitly via the page-level FloatingNavButtons |
| Container clash — sets own `max-w-Xxl mx-auto px-6 py-8` instead of letting parent handle layout | Critical | All 6 |
| Uses `rounded-lg` instead of `rounded-xl` for cards | Important | Decision, AudiencePicker, MatchList, NarrativeDraft, Export |
| Uses inline button classes instead of `.btn-secondary`/`.btn-outline` | Important | All 6 |
| Missing hover/transition/shadow effects on interactive cards | Important | AudiencePicker, MatchList |
| Inconsistent text colour discipline — many `text-` without `var(--text-...)` | Minor | Most |
| Card selection pattern doesn't match BrandAlignment/AudienceMenu | Important | AudiencePicker, MatchList |
| No loading spinner in async buttons | Minor | Export |
| Textareas in NarrativeDraft are plain rather than the "card with edit affordance" pattern from PersonificationReview | Important | NarrativeDraft |
| Missing animations | Minor | All 6 |

### Recommendation

A focused UI refresh pass on all six Vault components, applying the established design language. This will take roughly one focused session — every change is mechanical (no logic touched). Acceptance: a user walking through the existing tool then into the Vault flow should not perceive a stylistic break.

This is a **gating issue** for the 29 May review — Tim, Kirsty, Cynthia will all notice the visual break and it will distract from reviewing the Vault concept itself.

---

## Section 2 — Refactor preservation audit

*To be filled in.*

## Section 3 — Vault data integrity audit

*To be filled in.*

## Section 4 — API endpoint deep test

*To be filled in.*

## Section 5 — End-to-end functional walkthroughs

*To be filled in.*

## Section 6 — Specific edge cases & invariants

*To be filled in.*

---

## Summary

| Section | Status | Severity |
|---|---|---|
| 1 — CSS / design language | ❌ Significant inconsistency | Critical for review |
| 2 — Refactor preservation | _pending_ | — |
| 3 — Vault data integrity | _pending_ | — |
| 4 — API endpoint deep test | _pending_ | — |
| 5 — E2E walkthroughs | _pending_ | — |
| 6 — Edge cases & invariants | _pending_ | — |
