# UI Consistency Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. CRITICAL: Use `frontend-design` skill for ALL tasks.

**Goal:** Apply the polished frontend-design aesthetic from new components (BrandAlignment, GateTransition, CreativeTenets, GoodExamplePrompt) to all legacy UI components for visual consistency.

**Architecture:** Update each legacy component with: staggered fade-in animations, refined shadows/borders, uppercase tracking labels, consistent card patterns, smooth hover transitions, and proper loading states. No functionality changes—pure visual polish.

**Tech Stack:** Next.js 14, TypeScript, React, Tailwind CSS, CSS-in-JS (style jsx)

---

## Target Aesthetic Patterns

Reference these patterns from new components:

### 1. Headers
```tsx
<div className="text-center pb-6 border-b border-[var(--border-color)]">
  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider mb-4"
    style={{ backgroundColor: 'var(--expedia-navy)', color: 'white', opacity: 0.85 }}>
    Step Label
  </div>
  <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Title</h2>
  <p className="text-[var(--text-secondary)]">Description</p>
</div>
```

### 2. Cards with Icon Badges
```tsx
<div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0"
      style={{ backgroundColor: 'var(--expedia-navy)', color: 'white' }}>
      A
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-[var(--text-primary)] mb-1">Label</p>
      <p className="text-sm text-[var(--text-secondary)]">Content</p>
    </div>
  </div>
</div>
```

### 3. Section Labels
```tsx
<h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
  Section Label
</h3>
```

### 4. Staggered Fade-In Animation
```tsx
<div style={{ animation: 'fadeSlideIn 0.3s ease-out forwards', animationDelay: `${index * 100}ms`, opacity: 0 }}>
  ...
</div>

<style jsx>{`
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
`}</style>
```

### 5. Hover States on Cards
```tsx
className="transition-all hover:border-[var(--expedia-navy)]/50 hover:shadow-sm"
```

### 6. Loading Spinner
```tsx
<svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
</svg>
```

---

## Task 1: Upgrade FileUpload.tsx

**Files:**
- Modify: `src/components/FileUpload.tsx`

**IMPORTANT:** Use `frontend-design` skill for this task.

**Changes:**
1. Add refined drop zone with subtle gradient background on hover
2. Add success state animation (checkmark scales in)
3. Add staggered icon animation for processing state (three dots)
4. Improve typography with tracking-wider on labels
5. Add subtle shadow on hover

**Step 1: Update the component**

Apply these visual improvements:
- Replace simple border with gradient border effect on drag
- Add scale-in animation for success/error icons
- Use refined loading animation matching CreativeTenets pattern
- Add hover shadow: `hover:shadow-md transition-shadow`

**Step 2: Commit**

```bash
git add src/components/FileUpload.tsx && git commit -m "$(cat <<'EOF'
style(FileUpload): apply frontend-design aesthetic

- Add gradient border effect on drag
- Refined loading animation with three-dot bounce
- Success/error icon scale-in animation
- Hover shadow and smooth transitions

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Upgrade SectionOptions.tsx

**Files:**
- Modify: `src/components/SectionOptions.tsx`

**IMPORTANT:** Use `frontend-design` skill for this task.

**Changes:**
1. Add uppercase tracking-wider section labels
2. Add card hover states matching new pattern
3. Add staggered fade-in for options
4. Improve radio button styling with Expedia navy
5. Add subtle shadow on selected card

**Step 1: Update the component**

- Add section header with uppercase tracking
- Replace simple hover with `hover:border-[var(--expedia-navy)]/50 hover:shadow-sm`
- Add fadeSlideIn animation with staggered delays
- Use icon badge pattern for option numbers

**Step 2: Commit**

```bash
git add src/components/SectionOptions.tsx && git commit -m "$(cat <<'EOF'
style(SectionOptions): apply frontend-design aesthetic

- Uppercase tracking-wider section labels
- Card hover with shadow and navy accent
- Staggered fade-in animation for options
- Icon badge pattern for option numbers

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Upgrade PersonificationReview.tsx

**Files:**
- Modify: `src/components/PersonificationReview.tsx`

**IMPORTANT:** Use `frontend-design` skill for this task.

**Changes:**
1. Add Gate 2 step badge in header
2. Add card styling for textarea container
3. Improve button layout with proper gap
4. Add subtle focus animation on textarea

**Step 1: Update the component**

- Add step badge: "Gate 2: Step 2" in navy rounded pill
- Wrap textarea in styled card with proper padding
- Add hint text with lightbulb icon
- Improve button styling consistency

**Step 2: Commit**

```bash
git add src/components/PersonificationReview.tsx && git commit -m "$(cat <<'EOF'
style(PersonificationReview): apply frontend-design aesthetic

- Add Gate 2 step badge in header
- Textarea in styled card container
- Improved button layout and styling

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Upgrade page.tsx Inline Components (Part 1 - StatusBadge, Spinner, LoadingOverlay)

**Files:**
- Modify: `src/app/page.tsx` (lines 43-131)

**IMPORTANT:** Use `frontend-design` skill for this task.

**Changes to StatusBadge:**
- Add subtle icon animation on render
- Improve badge styling with consistent padding

**Changes to Spinner:**
- Match new LoadingSpinner pattern from CreativeTenets

**Changes to LoadingOverlay:**
- Add fade-in animation
- Improve progress bar with gradient
- Add subtle pulse on dots

**Step 1: Update the inline components**

Focus on StatusBadge, Spinner, LoadingOverlay only.

**Step 2: Commit**

```bash
git add src/app/page.tsx && git commit -m "$(cat <<'EOF'
style(page): upgrade StatusBadge, Spinner, LoadingOverlay

- StatusBadge with subtle icon animation
- Spinner matches new pattern
- LoadingOverlay with fade-in and gradient progress

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Upgrade page.tsx Inline Components (Part 2 - ErrorBanner, ProgressBar, BackButton)

**Files:**
- Modify: `src/app/page.tsx` (lines 133-212)

**IMPORTANT:** Use `frontend-design` skill for this task.

**Changes to ErrorBanner:**
- Add shake animation on error
- Improve button styling

**Changes to ProgressBar:**
- Add gradient fill
- Smooth transition on progress change

**Changes to BackButton:**
- Match pattern from new components: `text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1`

**Step 1: Update the inline components**

Focus on ErrorBanner, ProgressBar, BackButton only.

**Step 2: Commit**

```bash
git add src/app/page.tsx && git commit -m "$(cat <<'EOF'
style(page): upgrade ErrorBanner, ProgressBar, BackButton

- ErrorBanner with shake animation
- ProgressBar with gradient and smooth transitions
- BackButton matches new component pattern

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Upgrade page.tsx GlobalProgressBar

**Files:**
- Modify: `src/app/page.tsx` (GlobalProgressBar function, ~lines 214-280)

**IMPORTANT:** Use `frontend-design` skill for this task.

**Changes:**
- Add step pill badges similar to header pattern
- Improve active step highlight with subtle glow
- Add smooth transition between steps
- Better visual hierarchy for completed vs pending

**Step 1: Update GlobalProgressBar**

- Use navy background for active step
- Completed steps get checkmark icon
- Add connecting line between steps with gradient
- Smooth scale animation on active step

**Step 2: Commit**

```bash
git add src/app/page.tsx && git commit -m "$(cat <<'EOF'
style(page): upgrade GlobalProgressBar

- Navy pill for active step
- Checkmark icons for completed steps
- Gradient connecting lines
- Scale animation on active step

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Upgrade page.tsx SectionStepContent

**Files:**
- Modify: `src/app/page.tsx` (SectionStepContent function, ~lines 346-530)

**IMPORTANT:** Use `frontend-design` skill for this task.

**Changes:**
- Add fade-in animation for content
- Improve suggestion card styling
- Better button hover states
- Add subtle animations to action buttons

**Step 1: Update SectionStepContent**

- Add fadeSlideIn animation on mount
- Suggestion box with yellow left border (like GoodExamplePrompt)
- Button hover states consistent with btn-outline/btn-secondary
- Gap between elements using space-y-6

**Step 2: Commit**

```bash
git add src/app/page.tsx && git commit -m "$(cat <<'EOF'
style(page): upgrade SectionStepContent

- Fade-in animation on mount
- Suggestion box with accent border
- Consistent button hover states
- Improved spacing throughout

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Upgrade Triage Step Rendering

**Files:**
- Modify: `src/app/page.tsx` (renderTriageStep function)

**IMPORTANT:** Use `frontend-design` skill for this task.

**Changes:**
- Add staggered fade-in for section cards
- Improve section card hover states
- Add gate badge to header
- Better visual hierarchy

**Step 1: Update triage step rendering**

- Each section card fades in with stagger
- Hover shows shadow and navy border accent
- Gate 1 badge in header
- Status icons with subtle animation

**Step 2: Commit**

```bash
git add src/app/page.tsx && git commit -m "$(cat <<'EOF'
style(page): upgrade triage step rendering

- Staggered fade-in for section cards
- Hover shadow and navy accent
- Gate 1 badge in header
- Animated status icons

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Upgrade Output Step Rendering

**Files:**
- Modify: `src/app/page.tsx` (renderOutputStep function)

**IMPORTANT:** Use `frontend-design` skill for this task.

**Changes:**
- Add success celebration animation
- Improve output card styling
- Better copy button feedback
- Add subtle gradient background

**Step 1: Update output step rendering**

- Success checkmark with scale-in animation
- Output card with elevated shadow
- Copy button with ripple effect on click
- Subtle navy gradient accent in background

**Step 2: Commit**

```bash
git add src/app/page.tsx && git commit -m "$(cat <<'EOF'
style(page): upgrade output step rendering

- Success celebration animation
- Elevated output card styling
- Copy button with ripple feedback
- Subtle gradient background accent

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Final Polish and Consistency Check

**Files:**
- Review: All modified files

**Step 1: Run the app locally**

```bash
cd /Users/will.bainbridge/Desktop/alive/ventures/audience-strategies/clients/expedia/pitch-pack-tool && npm run dev
```

**Step 2: Manual visual review**

Check each step in the flow for:
- Consistent animations
- Matching hover states
- Proper spacing
- No jarring transitions

**Step 3: Run tests**

```bash
npm test
```

**Step 4: Build**

```bash
npm run build
```

**Step 5: Final commit if any touch-ups needed**

```bash
git add . && git commit -m "$(cat <<'EOF'
style: final polish and consistency fixes

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Deploy

**Step 1: Push to trigger Railway deploy**

```bash
git push origin main
```

---

## Summary

| Task | Component | Key Changes |
|------|-----------|-------------|
| 1 | FileUpload.tsx | Gradient border, refined animations |
| 2 | SectionOptions.tsx | Staggered fade-in, icon badges |
| 3 | PersonificationReview.tsx | Gate badge, card styling |
| 4 | page.tsx (part 1) | StatusBadge, Spinner, LoadingOverlay |
| 5 | page.tsx (part 2) | ErrorBanner, ProgressBar, BackButton |
| 6 | page.tsx GlobalProgressBar | Step pills, gradient lines |
| 7 | page.tsx SectionStepContent | Fade-in, suggestion styling |
| 8 | page.tsx Triage | Staggered cards, gate badge |
| 9 | page.tsx Output | Celebration animation, elevated card |
| 10 | All | Visual review, tests, build |
| 11 | Deploy | Push to Railway |
