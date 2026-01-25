# Tim & Richard Feedback Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 12 UX improvements based on Tim's Loom walkthrough and Richard's written feedback to make the Pitch Pack Tool clearer and more intuitive.

**Architecture:** UI-focused changes across page.tsx and AudienceMenu.tsx, plus prompt updates for formatting. Multi-select audience merges selected segments into a unified persona before personification.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS

---

## Summary of Changes

| # | Change | Files |
|---|--------|-------|
| 1 | Remove "Generate Suggestion" button | page.tsx |
| 2 | Audience multi-select with merge | AudienceMenu.tsx, page.tsx, audience/route.ts |
| 3 | Em-dash → space-hyphen-space in prompts | All prompts/*.json |
| 4 | Output page: clickable section navigation | page.tsx |
| 5 | Output page: status summary at top | page.tsx |
| 6 | Better triage prompts (research suggestions) | page.tsx |
| 7 | Clearer section instructions | page.tsx |
| 8 | Creative tenets: clarify these are AI-generated | page.tsx |
| 9 | Research stimuli: clarify URLs not verified | page.tsx |

---

## Task 1: Remove "Generate Suggestion" Button

**Files:**
- Modify: `src/app/page.tsx:475-492`

**Step 1: Remove the Generate Suggestion button from SectionStepContent**

Find this code block (around line 475-492):

```tsx
<div className="flex gap-3 flex-wrap">
  <button
    onClick={() => onReassess(additionalInfo)}
    disabled={loading || !additionalInfo.trim()}
    className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
  >
    {loading && <Spinner className="text-white" />}
    Re-assess with Info
  </button>
  <button
    onClick={onGenerate}
    disabled={loading}
    className="btn-outline text-sm px-4 py-2 flex items-center gap-2"
  >
    {loading && <Spinner />}
    {section.status === 'green' ? 'Get AI Suggestions' : 'Generate Suggestion'}
  </button>
</div>
```

Replace with:

```tsx
<button
  onClick={() => onReassess(additionalInfo)}
  disabled={loading || !additionalInfo.trim()}
  className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
>
  {loading && <Spinner className="text-white" />}
  Re-assess with Info
</button>
```

**Step 2: Update the label text above the textarea**

Find (around line 460-472):

```tsx
<label className="block text-sm font-medium text-[var(--text-secondary)]">
  {section.status === 'green'
    ? 'Want to improve this section further?'
    : 'Do you have any additional information?'}
</label>
```

Replace with:

```tsx
<label className="block text-sm font-medium text-[var(--text-secondary)]">
  Add extra context to improve this section
</label>
```

**Step 3: Update placeholder text**

Find (around line 469-471):

```tsx
placeholder={section.status === 'green'
  ? "Add context or notes if you'd like AI to suggest improvements..."
  : "Add any extra context, notes, or information that might help..."}
```

Replace with:

```tsx
placeholder="Paste additional context, client notes, website content, or other information that could help improve this section..."
```

**Step 4: Remove unused onGenerate prop from SectionStepContent interface and component call**

Remove `onGenerate` from the interface (around line 333):
```tsx
// DELETE this line:
onGenerate: () => void;
```

Remove from component call in renderSectionStep (around line 1041):
```tsx
// DELETE this line:
onGenerate={handleSectionGenerate}
```

**Step 5: Verify and commit**

Run: `npm run build`
Expected: Build succeeds

```bash
git add src/app/page.tsx
git commit -m "fix: remove confusing Generate Suggestion button

Tim and Richard both found the button confusing - it triggered
spinners but produced no visible output. Users should use
Re-assess with Info instead."
```

---

## Task 2: Audience Multi-Select with Merge

**Files:**
- Modify: `src/components/AudienceMenu.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/api/generate/audience/route.ts`
- Modify: `prompts/audience.json`

**Step 1: Update AudienceMenu to support multi-select**

Replace the entire `AudienceMenu.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import { AudienceSegment, AudienceSegmentMenu } from '@/lib/types';

interface AudienceMenuProps {
  menu: AudienceSegmentMenu;
  onSelect: (segments: AudienceSegment[]) => void;
  onRegenerate: (feedback: string) => void;
  onBack: () => void;
  loading: boolean;
}

interface EditedSegment extends AudienceSegment {
  isEdited?: boolean;
}

export function AudienceMenu({ menu, onSelect, onRegenerate, onBack, loading }: AudienceMenuProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [editingSegment, setEditingSegment] = useState<EditedSegment | null>(null);
  const [editedSegments, setEditedSegments] = useState<Record<number, EditedSegment>>({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const handleRegenerateClick = () => {
    if (feedback.trim()) {
      onRegenerate(feedback);
      setFeedback('');
      setShowFeedback(false);
    }
  };

  const handleEditSave = () => {
    if (editingSegment) {
      setEditedSegments({
        ...editedSegments,
        [editingSegment.id]: { ...editingSegment, isEdited: true },
      });
      setEditingSegment(null);
    }
  };

  const getSegmentToDisplay = (original: AudienceSegment): EditedSegment => {
    return editedSegments[original.id] || original;
  };

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleConfirmSelection = () => {
    if (loading || selectedIds.size === 0) return;
    const selectedSegments = menu.segments
      .filter(s => selectedIds.has(s.id))
      .map(s => editedSegments[s.id] || s);
    onSelect(selectedSegments);
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 mb-4"
      >
        ← Back to Sections
      </button>

      <div className="text-center pb-6 border-b border-[var(--border-color)]">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Choose Your Audience
        </h2>
        <p className="text-[var(--text-secondary)]">{menu.intro}</p>
        <p className="text-sm text-[var(--text-muted)] mt-2">
          Select one or more segments. If you select multiple, we'll merge them into a unified audience profile.
        </p>
      </div>

      <div className="space-y-3">
        {menu.segments.map((original) => {
          const segment = getSegmentToDisplay(original);
          const isEdited = editedSegments[original.id]?.isEdited;
          const isSelected = selectedIds.has(original.id);

          return (
            <div
              key={original.id}
              onClick={() => toggleSelection(original.id)}
              className={`p-4 rounded-xl border-2 transition-all group relative cursor-pointer ${
                isSelected
                  ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]/5'
                  : 'border-[var(--border-color)] hover:border-[var(--expedia-navy)]/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-1 transition-colors ${
                  isSelected
                    ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]'
                    : 'border-[var(--border-color)]'
                }`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg text-[var(--expedia-navy)]">
                      {segment.name}
                    </h3>
                    {isEdited && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--expedia-navy)]/10 text-[var(--expedia-navy)]">
                        (edited)
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--text-primary)] mb-2">{segment.needsValues}</p>
                  <p className="text-sm text-[var(--text-muted)]">{segment.demographics}</p>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingSegment({ ...segment });
                }}
                className="absolute top-4 right-4 text-xs px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--expedia-navy)] hover:text-[var(--expedia-navy)] transition-colors"
              >
                Edit
              </button>
            </div>
          );
        })}
      </div>

      {/* Selection Summary & Confirm */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
        <span className="text-sm text-[var(--text-muted)]">
          {selectedIds.size === 0
            ? 'Select at least one segment'
            : selectedIds.size === 1
            ? '1 segment selected'
            : `${selectedIds.size} segments selected - will be merged`}
        </span>
        <button
          onClick={handleConfirmSelection}
          disabled={loading || selectedIds.size === 0}
          className="btn-secondary flex items-center gap-2"
        >
          {loading ? 'Processing...' : 'Confirm & Continue'}
          <span>→</span>
        </button>
      </div>

      {/* Feedback and Regenerate Section */}
      <div className="pt-4 border-t border-[var(--border-color)]">
        {!showFeedback ? (
          <button
            onClick={() => setShowFeedback(true)}
            disabled={loading}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--expedia-navy)] transition-colors"
          >
            Not quite right? Give feedback & regenerate
          </button>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-[var(--text-secondary)]">
              What would you like to change about these options?
            </label>
            <textarea
              className="w-full p-3 rounded-lg border border-[var(--border-color)] focus:border-[var(--expedia-navy)] focus:outline-none resize-none text-sm"
              rows={3}
              placeholder="e.g., 'Focus more on business travellers' or 'These feel too generic, make them more specific to families'"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={handleRegenerateClick}
                disabled={loading || !feedback.trim()}
                className="px-4 py-2 text-sm font-medium bg-[var(--expedia-navy)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Regenerating...' : 'Regenerate with Feedback'}
              </button>
              <button
                onClick={() => {
                  setShowFeedback(false);
                  setFeedback('');
                }}
                className="px-4 py-2 text-sm font-medium border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:border-[var(--expedia-navy)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Segment Modal */}
      {editingSegment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Edit Segment
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  className="w-full p-2 rounded-lg border border-[var(--border-color)] focus:border-[var(--expedia-navy)] focus:outline-none text-sm"
                  value={editingSegment.name}
                  onChange={(e) =>
                    setEditingSegment({ ...editingSegment, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Needs & Values
                </label>
                <textarea
                  className="w-full p-3 rounded-lg border border-[var(--border-color)] focus:border-[var(--expedia-navy)] focus:outline-none text-sm resize-y"
                  style={{ minHeight: '120px' }}
                  value={editingSegment.needsValues}
                  onChange={(e) =>
                    setEditingSegment({ ...editingSegment, needsValues: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Demographics
                </label>
                <textarea
                  className="w-full p-3 rounded-lg border border-[var(--border-color)] focus:border-[var(--expedia-navy)] focus:outline-none text-sm resize-y"
                  style={{ minHeight: '80px' }}
                  value={editingSegment.demographics}
                  onChange={(e) =>
                    setEditingSegment({ ...editingSegment, demographics: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleEditSave}
                className="px-4 py-2 text-sm font-medium bg-[var(--expedia-navy)] text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingSegment(null)}
                className="px-4 py-2 text-sm font-medium border border-[var(--border-color)] text-[var(--text-secondary)] rounded-lg hover:border-[var(--expedia-navy)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Update page.tsx to handle multi-select**

Find `handleSelectAudience` (around line 704) and replace:

```tsx
const handleSelectAudience = async (segment: AudienceSegment) => {
  updateState({ loading: true, error: null, selectedAudienceSegment: segment });
  setLastAction(() => () => handleSelectAudience(segment));
```

With:

```tsx
const handleSelectAudience = async (segments: AudienceSegment[]) => {
  // If multiple segments selected, we'll merge them
  // For single segment, use it directly
  const segmentToPersonify = segments.length === 1
    ? segments[0]
    : {
        id: 0,
        name: segments.map(s => s.name).join(' + '),
        needsValues: segments.map(s => s.needsValues).join('\n\n'),
        demographics: segments.map(s => s.demographics).join('\n\n'),
      };

  updateState({ loading: true, error: null, selectedAudienceSegment: segmentToPersonify });
  setLastAction(() => () => handleSelectAudience(segments));
```

Update the API call body to include merge flag:

```tsx
body: JSON.stringify({
  brief: state.brief,
  additionalContext: state.additionalContext,
  selectedSegment: segmentToPersonify,
  isMerged: segments.length > 1,
}),
```

**Step 3: Update audience API route to handle merged segments**

In `src/app/api/generate/audience/route.ts`, update the personify section:

```tsx
if (selectedSegment) {
  // Step 2: Personify the selected segment(s)
  if (!promptConfig.personify) {
    return NextResponse.json(
      { error: 'Personify prompt not configured' },
      { status: 500 }
    );
  }
  const systemPrompt = buildSystemPrompt(promptConfig.personify);

  const isMerged = request.json().isMerged;
  let userMessage = `Brief:\n${brief}\n\n`;

  if (isMerged) {
    userMessage += `The user has selected MULTIPLE segments to merge into a unified audience profile:\n\n`;
    userMessage += `Combined Name: ${selectedSegment.name}\n\n`;
    userMessage += `Combined Needs & Values:\n${selectedSegment.needsValues}\n\n`;
    userMessage += `Combined Demographics:\n${selectedSegment.demographics}\n\n`;
    userMessage += `Please create a unified personification that captures the essence of these overlapping segments. Find the common threads and tensions that unite them.`;
  } else {
    userMessage += `Selected segment:\nName: ${selectedSegment.name}\nNeeds & Values: ${selectedSegment.needsValues}\nDemographics: ${selectedSegment.demographics}\n\nPlease personify this segment.`;
  }

  const response = await callClaudeJSON<PersonificationResponse>(
    systemPrompt,
    userMessage,
    { endpoint: 'audience:personify' }
  );

  return NextResponse.json(response);
}
```

**Step 4: Verify and commit**

Run: `npm run build`
Expected: Build succeeds

```bash
git add src/components/AudienceMenu.tsx src/app/page.tsx src/app/api/generate/audience/route.ts
git commit -m "feat: audience multi-select with merge

Users can now select multiple audience segments. When multiple
are selected, they're merged into a unified profile before
personification. Addresses Tim's confusion about single-select."
```

---

## Task 3: Fix Em-Dashes in All Prompts

**Files:**
- Modify: All files in `prompts/*.json`

**Step 1: Search and replace em-dashes**

In each prompt file, replace:
- `—` (em-dash) with ` - ` (space-hyphen-space)
- `–` (en-dash) with ` - ` (space-hyphen-space)

Files to check:
- `prompts/audience.json`
- `prompts/budget.json`
- `prompts/creative-task.json`
- `prompts/creative-tenets.json`
- `prompts/human-truths.json`
- `prompts/media-strategy.json`
- `prompts/objective.json`
- `prompts/output.json`
- `prompts/research-stimuli.json`
- `prompts/triage.json`

Use find/replace in each file.

**Step 2: Commit**

```bash
git add prompts/
git commit -m "style: replace em-dashes with space-hyphen-space

Tim requested cleaner formatting in AI outputs.
Changed — to - throughout all prompts."
```

---

## Task 4: Output Page - Clickable Section Navigation

**Files:**
- Modify: `src/app/page.tsx:1384-1401`

**Step 1: Add navigation handler**

Add this function inside `renderOutputStep` (before the return):

```tsx
const navigateToSection = (sectionKey: string) => {
  const sectionIndex = state.sections.findIndex(s => s.key === sectionKey);
  if (sectionIndex >= 0) {
    updateState({
      step: 'sections',
      currentSectionIndex: sectionIndex,
      outputMarkdown: null, // Clear output so they can re-export after changes
    });
  }
};
```

**Step 2: Make section rows clickable**

Replace the section list (around line 1384-1401):

```tsx
<div className="rounded-xl border border-[var(--border-color)] overflow-hidden">
  {state.sections.map((section, index) => (
    <div
      key={section.key}
      onClick={() => navigateToSection(section.key)}
      className={`p-4 cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors ${
        index !== state.sections.length - 1 ? 'border-b border-[var(--border-color)]' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-[var(--text-primary)] hover:text-[var(--expedia-navy)] hover:underline">
          {section.name}
        </span>
        <StatusBadge status={section.status} />
      </div>
      <p className="text-sm text-[var(--text-muted)] line-clamp-2">
        {section.content || '(not provided)'}
      </p>
    </div>
  ))}
</div>
```

**Step 3: Add helper text**

Below the section list, add:

```tsx
<p className="text-xs text-[var(--text-muted)] text-center mt-2">
  Click any section to go back and edit it
</p>
```

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: clickable section navigation on output page

Users can now click any section on the output page to go back
and edit it. Addresses Richard's hyperlink suggestion."
```

---

## Task 5: Output Page - Status Summary at Top

**Files:**
- Modify: `src/app/page.tsx` (renderOutputStep function)

**Step 1: Add status summary component**

At the start of renderOutputStep (before the loading check), add:

```tsx
const getStatusSummary = () => {
  const red = state.sections.filter(s => s.status === 'red');
  const amber = state.sections.filter(s => s.status === 'amber');
  const green = state.sections.filter(s => s.status === 'green');

  return { red, amber, green };
};
```

**Step 2: Add summary box after the header**

After the `<div className="text-center pb-6...">` header section, add:

```tsx
{/* Status Summary */}
{(() => {
  const { red, amber, green } = getStatusSummary();
  const hasIssues = red.length > 0 || amber.length > 0;

  return (
    <div className={`p-4 rounded-xl border-l-4 mb-6 ${
      red.length > 0
        ? 'bg-[var(--status-red-bg)] border-[var(--status-red)]'
        : amber.length > 0
        ? 'bg-[var(--status-amber)]/10 border-[var(--status-amber)]'
        : 'bg-[var(--status-green)]/10 border-[var(--status-green)]'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">
          {red.length > 0 ? '⚠️' : amber.length > 0 ? '💡' : '✓'}
        </span>
        <span className="font-semibold text-[var(--text-primary)]">
          {red.length > 0
            ? 'Some sections need attention'
            : amber.length > 0
            ? 'Almost there'
            : 'Looking good!'}
        </span>
      </div>

      <div className="text-sm text-[var(--text-secondary)] space-y-1">
        {red.length > 0 && (
          <p>
            <span className="font-medium text-[var(--status-red)]">Missing ({red.length}):</span>{' '}
            {red.map(s => s.name).join(', ')}
          </p>
        )}
        {amber.length > 0 && (
          <p>
            <span className="font-medium text-[var(--status-amber)]">Needs work ({amber.length}):</span>{' '}
            {amber.map(s => s.name).join(', ')}
          </p>
        )}
        {green.length > 0 && (
          <p>
            <span className="font-medium text-[var(--status-green)]">Good ({green.length}):</span>{' '}
            {green.map(s => s.name).join(', ')}
          </p>
        )}
      </div>

      {hasIssues && (
        <p className="text-xs text-[var(--text-muted)] mt-3 pt-3 border-t border-current/10">
          Click any section below to go back and improve it
        </p>
      )}
    </div>
  );
})()}
```

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add status summary to output page

Shows counts of good/needs work/missing sections at top of
output page with guidance on what to do next. Addresses Tim
and Richard's feedback about unclear next steps."
```

---

## Task 6: Better Triage Prompts (Research Suggestions)

**Files:**
- Modify: `src/app/page.tsx` (renderTriageStep function)

**Step 1: Update the additional context section**

Find the additional context textarea section (around line 1003-1018) and replace:

```tsx
<div className="p-5 rounded-xl bg-[var(--bg-secondary)]">
  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
    Before we go section by section...
  </label>
  <p className="text-sm text-[var(--text-muted)] mb-3">
    Do you have any additional context? (Other documents, website content, client notes)
  </p>
```

With:

```tsx
<div className="p-5 rounded-xl bg-[var(--bg-secondary)]">
  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
    Before we continue, gather more context
  </label>
  <div className="text-sm text-[var(--text-muted)] mb-4 space-y-2">
    <p>To get the best results, consider checking:</p>
    <ul className="list-disc list-inside space-y-1 ml-2">
      <li>The destination's official website and YouTube channel</li>
      <li>Recent press releases or news articles</li>
      <li>Competitor campaigns or positioning</li>
      <li>Any existing research or customer insights</li>
      <li>Previous campaign materials or brand guidelines</li>
    </ul>
    <p className="pt-2">Paste anything useful below:</p>
  </div>
```

**Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add research prompts before section review

Suggests specific sources users should check (YouTube, website,
press releases, etc.) before continuing. Addresses Tim's request
for better guidance."
```

---

## Task 7: Clearer Section Instructions

**Files:**
- Modify: `src/app/page.tsx` (SectionStepContent)

**Step 1: Add instructional text for amber/red sections**

After the section header (around line 375), add conditional guidance:

```tsx
{/* Section-specific guidance */}
{section.status !== 'green' && (
  <div className="p-4 rounded-lg bg-[var(--bg-tertiary)] text-sm">
    <p className="font-medium text-[var(--text-primary)] mb-2">How to improve this section:</p>
    <ol className="list-decimal list-inside space-y-1 text-[var(--text-secondary)]">
      <li>Review the AI Analysis below to understand what's missing</li>
      <li>Add any extra information you have in the text box at the bottom</li>
      <li>Click "Re-assess with Info" to get an updated assessment</li>
      <li>Repeat until you're happy, then click "Confirm & Continue"</li>
    </ol>
  </div>
)}
```

**Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add clearer instructions for section improvement

Step-by-step guidance for amber/red sections telling users
exactly what to do. Addresses Richard's feedback about being
more prescriptive."
```

---

## Task 8: Creative Tenets - Clarify AI-Generated

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add special handling for creative_tenets section**

In the `SectionStepContent` component, after the section header, add:

```tsx
{/* Creative Tenets special note */}
{section.key === 'creative_tenets' && (
  <div className="p-4 rounded-lg bg-[var(--expedia-navy)]/5 border border-[var(--expedia-navy)]/20 text-sm">
    <p className="font-medium text-[var(--expedia-navy)] mb-1">
      Note: Creative Tenets are generated, not extracted
    </p>
    <p className="text-[var(--text-secondary)]">
      Unlike other sections, Creative Tenets are typically not in the original brief.
      They're strategic principles we'll help you develop based on everything we've
      learned so far. The content below is a starting point for you to refine.
    </p>
  </div>
)}
```

**Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: clarify creative tenets are AI-generated

Adds note explaining that creative tenets are developed by
the tool, not extracted from the brief. Addresses Tim's
confusion about this section."
```

---

## Task 9: Research Stimuli - Clarify URLs Not Verified

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add special handling for research_stimuli section**

Similar to creative tenets, add after the section header:

```tsx
{/* Research Stimuli note */}
{section.key === 'research_stimuli' && (
  <div className="p-4 rounded-lg bg-[var(--status-amber)]/10 border border-[var(--status-amber)]/30 text-sm">
    <p className="font-medium text-[var(--status-amber)] mb-1">
      Note: URLs are extracted, not verified
    </p>
    <p className="text-[var(--text-secondary)]">
      Any URLs shown below were extracted from the brief. We haven't checked if they
      still work or verified their content. Please check any links before including
      them in your final Pitch Pack.
    </p>
  </div>
)}
```

**Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: clarify research stimuli URLs are not verified

Adds note explaining that URLs are extracted from the brief
but not checked. Addresses Tim's question about whether we
actually fetch URL content."
```

---

## Final Task: Integration Test & Push

**Step 1: Run full build**

```bash
npm run build
```

Expected: Build succeeds

**Step 2: Run tests**

```bash
npm test
```

Expected: All tests pass

**Step 3: Push to remote**

```bash
git push origin main
```

**Step 4: Verify deployment**

Wait for Railway to auto-deploy, then test at:
https://pitch-pack-tool-production.up.railway.app

---

## Checklist for Manual Testing

After deployment, test:

- [ ] Section step: "Generate Suggestion" button is gone
- [ ] Section step: Only "Re-assess with Info" button remains
- [ ] Audience step: Can select multiple segments (checkboxes visible)
- [ ] Audience step: Shows "X segments selected - will be merged" text
- [ ] Audience step: Merged segments produce unified personification
- [ ] Output page: Status summary appears at top
- [ ] Output page: Clicking a section navigates back to edit it
- [ ] Triage page: Research suggestions appear (YouTube, website, etc.)
- [ ] Creative Tenets: Shows "generated, not extracted" note
- [ ] Research Stimuli: Shows "URLs not verified" note
- [ ] All AI outputs: No em-dashes (should be space-hyphen-space)
