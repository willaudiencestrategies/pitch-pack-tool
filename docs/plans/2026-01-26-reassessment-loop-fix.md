# Re-Assessment Loop Fix - Implementation Plan

> **For Claude:** This is the CRITICAL fix. Read this file first after any context reset.

**Goal:** Fix the core iteration loop so users can provide additional info, get AI suggestions, accept/reject, and iterate until happy.

**Priority:** CRITICAL - This is the main functionality of the entire tool.

---

## The Problem

When user clicks "Re-assess with Info" button:
1. Button shows spinner (loading state works)
2. API is called (probably working)
3. **BUT user sees no visible change** - this is broken

Users cannot tell if:
- The API returned anything
- The content was updated
- There's a suggestion to review
- They should iterate more or move on

---

## Expected User Journey

```
SECTION VIEW:

┌─────────────────────────────────────────┐
│ Section 1 of 8: Budget     [RED: Missing]│
├─────────────────────────────────────────┤
│ Current Content:                         │
│ ┌─────────────────────────────────────┐ │
│ │ Tier 1: 35K Tier 2: 50K...          │ │
│ │ (verbatim from brief)               │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ ✗ AI Analysis                            │
│ Critical budget contradictions remain... │
│                                          │
│ Questions:                               │
│ • Are the tier labels incorrect?         │
│ • What is the channel breakdown?         │
├─────────────────────────────────────────┤
│ Add extra context:                       │
│ ┌─────────────────────────────────────┐ │
│ │ [User types answers here]           │ │
│ └─────────────────────────────────────┘ │
│ [Re-assess with Info]                    │
├─────────────────────────────────────────┤
│                    [Confirm & Continue →]│
└─────────────────────────────────────────┘

AFTER RE-ASSESS (what SHOULD happen):

┌─────────────────────────────────────────┐
│ Section 1 of 8: Budget   [AMBER: Needs Work]│  ← Status updated
├─────────────────────────────────────────┤
│ Current Content:                         │
│ ┌─────────────────────────────────────┐ │
│ │ (same verbatim from brief)          │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ ✓ AI Suggestion (NEW!)                   │  ← THIS SHOULD APPEAR
│ ┌─────────────────────────────────────┐ │
│ │ Based on your clarification, the    │ │
│ │ budget structure is:                │ │
│ │ - Tier 1: $350K (not $35K)          │ │
│ │ - Tier 2: $500K                     │ │
│ │ - Tier 3: $750K                     │ │
│ │                                     │ │
│ │ [Accept Suggestion] [Dismiss]       │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ 💡 AI Analysis (updated)                 │
│ Budget is now clearer. Remaining issue:  │
│ channel allocations don't add up...      │
│                                          │
│ Questions (updated):                     │
│ • How do allocations sum to tier total?  │
├─────────────────────────────────────────┤
│ ✓ Re-assessment complete                 │  ← SUCCESS FEEDBACK
│ Add extra context:                       │
│ ┌─────────────────────────────────────┐ │
│ │ [CLEARED - ready for more input]    │ │
│ └─────────────────────────────────────┘ │
│ [Re-assess with Info]                    │
├─────────────────────────────────────────┤
│                    [Confirm & Continue →]│
└─────────────────────────────────────────┘
```

---

## Investigation Steps

### Step 1: Check if API is being called

Add console.log to `handleSectionReassess` in page.tsx:
```tsx
const handleSectionReassess = async (additionalInfo: string) => {
  console.log('=== REASSESS CALLED ===');
  console.log('Section:', state.sections[state.currentSectionIndex].key);
  console.log('Additional info:', additionalInfo);
  // ... existing code

  const data: SectionResponse = await response.json();
  console.log('=== API RESPONSE ===');
  console.log('Status:', data.status);
  console.log('Content:', data.content);
  console.log('Feedback:', data.feedback);
  console.log('Suggestion:', data.suggestion);
  console.log('Questions:', data.questions);
```

### Step 2: Check prompt outputs

The reassess prompts in `prompts/*.json` define what fields are returned:

**budget.json reassess outputs:**
```json
"outputs": {
  "status": "green/amber/red",
  "content": "Updated budget content",
  "feedback": "Updated explanation",
  "questions": "Array of remaining questions"
}
```

**PROBLEM FOUND:** No `suggestion` field in the reassess outputs!

The prompts are returning `content` (updated version) but NOT `suggestion` (proposed improvement for user to accept/reject).

---

## Root Cause

The reassess prompts return `content` directly as the "improved" version, but the UI expects:
- `content` = the original/current content
- `suggestion` = the AI's proposed improvement

When reassess runs, it:
1. Gets new `content` from API
2. Updates `section.content` with this new content
3. But since there's no `suggestion`, the suggestion box doesn't appear
4. User's original content is overwritten without their approval!

**This breaks the iteration model:** User should REVIEW suggestions before accepting.

---

## Fix Plan

### Fix 1: Update all reassess prompts to return `suggestion`

Change reassess outputs from:
```json
"outputs": {
  "status": "...",
  "content": "Updated content",
  "feedback": "..."
}
```

To:
```json
"outputs": {
  "status": "...",
  "content": "PRESERVE the original/current content",
  "suggestion": "Your improved version based on additional context",
  "feedback": "...",
  "questions": "..."
}
```

**Files to update:**
- prompts/budget.json
- prompts/objective.json
- prompts/creative-task.json
- prompts/audience.json
- prompts/human-truths.json
- prompts/creative-tenets.json
- prompts/media-strategy.json
- prompts/research-stimuli.json

### Fix 2: Update handleSectionReassess to NOT overwrite content

Change from:
```tsx
updatedSections[state.currentSectionIndex] = {
  ...section,
  status: data.status,
  content: data.content,      // WRONG: overwrites original
  feedback: data.feedback,
  suggestion: data.suggestion,
  questions: data.questions,
};
```

To:
```tsx
updatedSections[state.currentSectionIndex] = {
  ...section,
  status: data.status,
  // content stays as-is until user accepts suggestion
  feedback: data.feedback,
  suggestion: data.suggestion,  // This shows in suggestion box
  questions: data.questions,
};
```

### Fix 3: Add visual feedback

After successful reassess:
1. Clear the additionalInfo textarea
2. Show a brief "Updated!" message or highlight
3. Scroll to show the new suggestion box if it appeared

```tsx
// In handleSectionReassess, after updating state:
setAdditionalInfo(''); // Clear input
// Maybe: showToast('Re-assessment complete');
```

But wait - `additionalInfo` is local state in SectionStepContent, not in parent. Need to either:
- Pass a callback to clear it
- Or move the state up

### Fix 4: Ensure suggestion box is visible

The suggestion box code already exists in SectionStepContent:
```tsx
{section.suggestion && (
  <div className="space-y-3 p-5 rounded-xl bg-[var(--expedia-navy)]/5...">
    <label>AI Suggestion</label>
    <textarea value={section.suggestion} ... />
    <button onClick={onAcceptSuggestion}>Accept Suggestion</button>
  </div>
)}
```

This should work IF `section.suggestion` is populated. The fix is ensuring the API returns it.

---

## Implementation Order

1. **Update prompts** - Add `suggestion` field to all reassess outputs
2. **Update API route** - Ensure suggestion is passed through (already does this)
3. **Update handleSectionReassess** - Don't overwrite content, only set suggestion
4. **Add visual feedback** - Clear input, show success message
5. **Test the full loop** - Verify iteration works

---

## Files Summary

| File | What to change |
|------|----------------|
| `prompts/budget.json` | Add `suggestion` to reassess outputs |
| `prompts/objective.json` | Add `suggestion` to reassess outputs |
| `prompts/creative-task.json` | Add `suggestion` to reassess outputs |
| `prompts/audience.json` | Add `suggestion` to reassess outputs |
| `prompts/human-truths.json` | Add `suggestion` to reassess outputs |
| `prompts/creative-tenets.json` | Add `suggestion` to reassess outputs |
| `prompts/media-strategy.json` | Add `suggestion` to reassess outputs |
| `prompts/research-stimuli.json` | Add `suggestion` to reassess outputs |
| `src/app/page.tsx` | Don't overwrite content, add feedback, clear input |

---

## Test Plan

1. Load app, upload Azerbaijan brief
2. Go to Budget section (should be RED)
3. Type "Tier 1 is $350K, Tier 2 is $500K, Tier 3 is $750K"
4. Click "Re-assess with Info"
5. **VERIFY:** Suggestion box appears with AI's improved budget text
6. **VERIFY:** Status may change to AMBER
7. **VERIFY:** Input textarea is cleared
8. **VERIFY:** Some visual feedback shown
9. Click "Accept Suggestion" - content updates
10. Click "Confirm & Continue" - move to next section
