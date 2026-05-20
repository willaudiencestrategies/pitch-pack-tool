# Re-Assessment Loop Fix - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the re-assessment iteration loop so users can provide additional info, see AI suggestions, accept/reject them, and iterate until satisfied.

**Architecture:** The current reassess prompts return `content` which overwrites the original without user approval. We need to:
1. Update all 8 reassess prompts to return a `suggestion` field (AI's proposed improvement)
2. Modify `handleSectionReassess` to NOT overwrite `content` - only populate `suggestion`
3. Add visual feedback: clear input, show success message

**Tech Stack:** Next.js 16, React 19, TypeScript, JSON prompt files

---

## Root Cause Analysis

**The Problem:** When user clicks "Re-assess with Info":
1. API call works correctly
2. Response comes back with `content` (the AI's improved version)
3. `handleSectionReassess` overwrites `section.content` with this new `content`
4. Since no `suggestion` is returned, the suggestion box never appears
5. User's original content is silently replaced without their approval

**The Fix:**
- Prompts should return `suggestion` (not `content`) for the AI's proposed improvement
- Frontend should NOT overwrite `content` on reassess - only populate `suggestion`
- When user clicks "Accept Suggestion", THEN `content` gets updated

---

## Task 1: Update budget.json reassess outputs

**Files:**
- Modify: `prompts/budget.json:33-49`

**Step 1: Read the current reassess config**

Current outputs in budget.json:
```json
"outputs": {
  "status": "green/amber/red",
  "content": "Updated budget content",
  "feedback": "Updated explanation",
  "questions": "Array of remaining questions"
}
```

**Step 2: Update to return suggestion instead of content**

Change the reassess outputs to:
```json
"outputs": {
  "status": "green/amber/red",
  "suggestion": "Your improved version of the budget section based on the additional context. This will be presented to the user for review - they can accept or reject it.",
  "feedback": "Updated explanation of what has improved and what still needs work",
  "questions": "Array of 2-4 remaining questions if any gaps remain"
}
```

**Step 3: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('prompts/budget.json'))"`
Expected: No output (valid JSON)

**Step 4: Commit**

```bash
git add prompts/budget.json
git commit -m "fix(prompts): budget reassess returns suggestion not content"
```

---

## Task 2: Update objective.json reassess outputs

**Files:**
- Modify: `prompts/objective.json:23-40`

**Step 1: Update reassess outputs**

Change from:
```json
"outputs": {
  "status": "green/amber/red",
  "content": "Updated objective content",
  "feedback": "Updated explanation",
  "gaps": "Remaining gaps if any",
  "questions": "Array of 2-4 specific questions..."
}
```

To:
```json
"outputs": {
  "status": "green/amber/red",
  "suggestion": "Your improved version of the objective based on the additional context. Present as a clear, specific, measurable objective statement.",
  "feedback": "Updated explanation of improvements and remaining issues",
  "questions": "Array of 2-4 specific questions the user could answer to further improve this section"
}
```

**Step 2: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('prompts/objective.json'))"`
Expected: No output (valid JSON)

**Step 3: Commit**

```bash
git add prompts/objective.json
git commit -m "fix(prompts): objective reassess returns suggestion not content"
```

---

## Task 3: Update creative-task.json reassess outputs

**Files:**
- Modify: `prompts/creative-task.json`

**Step 1: Read current file to find reassess section**

**Step 2: Update reassess outputs to return suggestion**

Same pattern:
```json
"outputs": {
  "status": "green/amber/red",
  "suggestion": "Your improved version of the creative task based on the additional context. Present as clear deliverables and scope.",
  "feedback": "Updated explanation of improvements and remaining issues",
  "questions": "Array of 2-4 specific questions to further clarify the creative task"
}
```

**Step 3: Verify JSON and commit**

```bash
node -e "JSON.parse(require('fs').readFileSync('prompts/creative-task.json'))"
git add prompts/creative-task.json
git commit -m "fix(prompts): creative-task reassess returns suggestion not content"
```

---

## Task 4: Update audience.json reassess outputs

**Files:**
- Modify: `prompts/audience.json`

**Step 1: Update reassess outputs to return suggestion**

```json
"outputs": {
  "status": "green/amber/red",
  "suggestion": "Your improved version of the audience section based on the additional context. Focus on psychographics (values, motivations, needs) not just demographics.",
  "feedback": "Updated explanation of improvements and remaining issues",
  "questions": "Array of 2-4 specific questions to further clarify the target audience"
}
```

**Step 2: Verify JSON and commit**

```bash
node -e "JSON.parse(require('fs').readFileSync('prompts/audience.json'))"
git add prompts/audience.json
git commit -m "fix(prompts): audience reassess returns suggestion not content"
```

---

## Task 5: Update human-truths.json reassess outputs

**Files:**
- Modify: `prompts/human-truths.json`

**Step 1: Update reassess outputs to return suggestion**

```json
"outputs": {
  "status": "green/amber/red",
  "suggestion": "Your improved version of the human truths based on the additional context. Present as psychological insights that bridge audience understanding to creative direction.",
  "feedback": "Updated explanation of improvements and remaining issues",
  "questions": "Array of 2-4 specific questions to further develop the human truths"
}
```

**Step 2: Verify JSON and commit**

```bash
node -e "JSON.parse(require('fs').readFileSync('prompts/human-truths.json'))"
git add prompts/human-truths.json
git commit -m "fix(prompts): human-truths reassess returns suggestion not content"
```

---

## Task 6: Update creative-tenets.json reassess outputs

**Files:**
- Modify: `prompts/creative-tenets.json`

**Step 1: Update reassess outputs to return suggestion**

```json
"outputs": {
  "status": "green/amber/red",
  "suggestion": "Your improved version of the creative tenets based on the additional context. Present as distinctive, actionable principles that guide creative work.",
  "feedback": "Updated explanation of improvements and remaining issues",
  "questions": "Array of 2-4 specific questions to further refine the creative tenets"
}
```

**Step 2: Verify JSON and commit**

```bash
node -e "JSON.parse(require('fs').readFileSync('prompts/creative-tenets.json'))"
git add prompts/creative-tenets.json
git commit -m "fix(prompts): creative-tenets reassess returns suggestion not content"
```

---

## Task 7: Update media-strategy.json reassess outputs

**Files:**
- Modify: `prompts/media-strategy.json`

**Step 1: Update reassess outputs to return suggestion**

```json
"outputs": {
  "status": "green/amber/red",
  "suggestion": "Your improved version of the media strategy based on the additional context. Include channels, timing, and market priorities.",
  "feedback": "Updated explanation of improvements and remaining issues",
  "questions": "Array of 2-4 specific questions to further clarify the media strategy"
}
```

**Step 2: Verify JSON and commit**

```bash
node -e "JSON.parse(require('fs').readFileSync('prompts/media-strategy.json'))"
git add prompts/media-strategy.json
git commit -m "fix(prompts): media-strategy reassess returns suggestion not content"
```

---

## Task 8: Update research-stimuli.json reassess outputs

**Files:**
- Modify: `prompts/research-stimuli.json`

**Step 1: Update reassess outputs to return suggestion**

```json
"outputs": {
  "status": "green/amber/red",
  "suggestion": "Your improved version of the research stimuli based on the additional context. Include relevant background research, competitor examples, and inspiration sources.",
  "feedback": "Updated explanation of improvements and remaining issues",
  "questions": "Array of 2-4 specific questions to further develop the research stimuli"
}
```

**Step 2: Verify JSON and commit**

```bash
node -e "JSON.parse(require('fs').readFileSync('prompts/research-stimuli.json'))"
git add prompts/research-stimuli.json
git commit -m "fix(prompts): research-stimuli reassess returns suggestion not content"
```

---

## Task 9: Update handleSectionReassess to NOT overwrite content

**Files:**
- Modify: `src/app/page.tsx:616-659`

**Step 1: Read the current handleSectionReassess function**

Current code (lines 638-646):
```tsx
const updatedSections = [...state.sections];
updatedSections[state.currentSectionIndex] = {
  ...section,
  status: data.status,
  content: data.content,      // <-- PROBLEM: overwrites original
  feedback: data.feedback,
  suggestion: data.suggestion,
  questions: data.questions,
};
```

**Step 2: Update to NOT overwrite content**

Change to:
```tsx
const updatedSections = [...state.sections];
updatedSections[state.currentSectionIndex] = {
  ...section,
  status: data.status,
  // content stays as-is until user accepts suggestion
  feedback: data.feedback,
  suggestion: data.suggestion,  // This shows in the suggestion box
  questions: data.questions,
};
```

**Step 3: Run tests to verify no regressions**

Run: `npm test`
Expected: All 47 tests pass

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "fix(reassess): don't overwrite content, only set suggestion"
```

---

## Task 10: Add visual feedback after reassess

**Files:**
- Modify: `src/app/page.tsx` (SectionStepContent component, lines 327-529)

**Step 1: Add state for success message**

In SectionStepContent, add state:
```tsx
const [reassessSuccess, setReassessSuccess] = useState(false);
```

**Step 2: Update onReassess callback to clear input and show success**

The current `onReassess` prop is called with `additionalInfo`. We need to:
1. Clear the textarea after successful reassess
2. Show a brief success message

Modify the button's onClick to:
```tsx
<button
  onClick={async () => {
    await onReassess(additionalInfo);
    setAdditionalInfo('');  // Clear input
    setReassessSuccess(true);
    setTimeout(() => setReassessSuccess(false), 3000);  // Hide after 3s
  }}
  disabled={loading || !additionalInfo.trim()}
  className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
>
  {loading && <Spinner className="text-white" />}
  Re-assess with Info
</button>
```

**Step 3: Add success message display**

Below the button, add:
```tsx
{reassessSuccess && (
  <p className="text-sm text-[var(--status-green)] mt-2 flex items-center gap-1">
    <span>✓</span> Re-assessment complete - check the suggestion above
  </p>
)}
```

**Step 4: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(ux): add visual feedback after reassess (clear input, success message)"
```

---

## Task 11: Build and test the full flow

**Files:**
- None (testing only)

**Step 1: Build the application**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Start dev server and test manually**

Run: `npm run dev`

Test flow:
1. Upload Azerbaijan brief (or paste it)
2. Go through triage
3. Go to Budget section (likely RED)
4. Type "Tier 1 is $350K, Tier 2 is $500K, Tier 3 is $750K" in the additional info box
5. Click "Re-assess with Info"
6. **VERIFY:** Input textarea is cleared
7. **VERIFY:** Success message appears briefly
8. **VERIFY:** Suggestion box appears with AI's improved budget text
9. **VERIFY:** Status may change to AMBER
10. Click "Accept Suggestion" - content updates
11. Click "Confirm & Continue" - move to next section

**Step 3: Run full test suite**

Run: `npm test`
Expected: All 47 tests pass

**Step 4: Commit build verification**

```bash
git add -A
git commit -m "test: verify reassessment loop fix works end-to-end"
```

---

## Task 12: Push to main and deploy

**Files:**
- None (deployment only)

**Step 1: Push all commits**

Run: `git push origin main`
Expected: Push succeeds

**Step 2: Verify Railway auto-deploy**

Railway should auto-deploy from main branch.
Check: https://pitch-pack-tool-production.up.railway.app

**Step 3: Test on production**

Same test flow as Task 11, but on production URL.

---

## Summary of Changes

| File | Change |
|------|--------|
| `prompts/budget.json` | reassess outputs `suggestion` not `content` |
| `prompts/objective.json` | reassess outputs `suggestion` not `content` |
| `prompts/creative-task.json` | reassess outputs `suggestion` not `content` |
| `prompts/audience.json` | reassess outputs `suggestion` not `content` |
| `prompts/human-truths.json` | reassess outputs `suggestion` not `content` |
| `prompts/creative-tenets.json` | reassess outputs `suggestion` not `content` |
| `prompts/media-strategy.json` | reassess outputs `suggestion` not `content` |
| `prompts/research-stimuli.json` | reassess outputs `suggestion` not `content` |
| `src/app/page.tsx` | Don't overwrite content on reassess + add visual feedback |

---

## Expected Behavior After Fix

```
BEFORE:
1. User types info → clicks "Re-assess" → content silently replaced → user confused

AFTER:
1. User types info → clicks "Re-assess"
2. Input clears, success message shows
3. Suggestion box appears with AI's proposed improvement
4. User reviews, edits if needed
5. User clicks "Accept Suggestion" → content updates
6. User can iterate more or continue to next section
```
