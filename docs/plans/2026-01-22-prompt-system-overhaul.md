# Prompt System Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Overhaul the Pitch Pack Tool's prompt system to align with Richard's comprehensive prompt guide and Expedia's quality rubric, adding Budget as a new section, implementing four-option spectrum for section builders, and two-step audience generation.

**Architecture:**
- Prompts use multi-persona approach for triage ("preserve chaos, don't mask it")
- Section builders return 4 options (Lifted Directly → Light Edits → Inspired Coherence → Ruthless Clarity)
- Audience uses two-step flow: generate 5 segment menu → personify selected segment
- Human truths follow 12-truth spectrum with specific patterns
- All changes covered by Vitest unit and integration tests

**Tech Stack:** Next.js 16, TypeScript, Vitest, React 19, Anthropic SDK

**Reference Documents:**
- `ventures/audience-strategies/Context/Expedia Creative Brief Process.md` - Richard's prompt guide
- `ventures/audience-strategies/Context/Untitled Document (1).pdf` - Expedia rubric

---

## Phase 1: Test Infrastructure Setup

### Task 1.1: Install Vitest and Testing Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install dependencies**

Run:
```bash
cd /Users/will.bainbridge/Desktop/Claude\ Projects/alive-test/ventures/audience-strategies/pitch-pack-tool
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom
```

**Step 2: Update package.json scripts**

Add to `package.json` scripts:
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui"
  }
}
```

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add vitest testing dependencies"
```

---

### Task 1.2: Configure Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`

**Step 1: Create Vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Step 2: Create test setup file**

Create `src/test/setup.ts`:
```typescript
import '@testing-library/dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

**Step 3: Run test command to verify setup**

Run: `npm run test:run`
Expected: "No test files found" (success - config works)

**Step 4: Commit**

```bash
git add vitest.config.ts src/test/setup.ts
git commit -m "chore: configure vitest for testing"
```

---

## Phase 2: Types & Data Model Updates

### Task 2.1: Add Budget Section to Types

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/types.test.ts`

**Step 1: Write the failing test**

Create `src/lib/types.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { SECTION_KEYS, SECTION_CONFIG, SectionKey } from './types';

describe('Section Configuration', () => {
  it('should include budget as the first section', () => {
    expect(SECTION_KEYS[0]).toBe('budget');
  });

  it('should have 8 sections total', () => {
    expect(SECTION_KEYS.length).toBe(8);
  });

  it('should have budget config with order 0', () => {
    expect(SECTION_CONFIG.budget).toEqual({ name: 'Budget', order: 0 });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run src/lib/types.test.ts`
Expected: FAIL - budget not in SECTION_KEYS

**Step 3: Update types.ts to add Budget section**

In `src/lib/types.ts`, update:

```typescript
export type SectionKey =
  | 'budget'
  | 'objective'
  | 'creative_task'
  | 'audience'
  | 'human_truths'
  | 'creative_tenets'
  | 'media_strategy'
  | 'research_stimuli';

export const SECTION_CONFIG: Record<SectionKey, { name: string; order: number }> = {
  budget: { name: 'Budget', order: 0 },
  objective: { name: 'Objective', order: 1 },
  creative_task: { name: 'Creative Task', order: 2 },
  audience: { name: 'Audience', order: 3 },
  human_truths: { name: 'Human Truths', order: 4 },
  creative_tenets: { name: 'Creative Tenets', order: 5 },
  media_strategy: { name: 'Media Strategy', order: 6 },
  research_stimuli: { name: 'Research Stimuli', order: 7 },
};

export const SECTION_KEYS: SectionKey[] = [
  'budget',
  'objective',
  'creative_task',
  'audience',
  'human_truths',
  'creative_tenets',
  'media_strategy',
  'research_stimuli',
];
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run src/lib/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/types.test.ts
git commit -m "feat: add budget as section 0"
```

---

### Task 2.2: Add Four-Option Response Types

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/types.test.ts`

**Step 1: Write the failing test**

Add to `src/lib/types.test.ts`:
```typescript
import { SectionOption, SectionOptionsResponse } from './types';

describe('Four-Option Response Types', () => {
  it('should have SectionOption with required fields', () => {
    const option: SectionOption = {
      level: 'lifted',
      content: 'Test content',
      reasoning: 'Why this option',
      watchFor: 'What to watch for',
      whenToChoose: 'When to choose this',
    };
    expect(option.level).toBe('lifted');
  });

  it('should have SectionOptionsResponse with 4 options', () => {
    const response: SectionOptionsResponse = {
      currentState: 'Current state text',
      alignmentCheck: 'Alignment assessment',
      options: [
        { level: 'lifted', content: '', reasoning: '', watchFor: '', whenToChoose: '' },
        { level: 'light', content: '', reasoning: '', watchFor: '', whenToChoose: '' },
        { level: 'inspired', content: '', reasoning: '', watchFor: '', whenToChoose: '' },
        { level: 'ruthless', content: '', reasoning: '', watchFor: '', whenToChoose: '' },
      ],
    };
    expect(response.options.length).toBe(4);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run src/lib/types.test.ts`
Expected: FAIL - SectionOption not found

**Step 3: Add types to types.ts**

Add to `src/lib/types.ts`:
```typescript
export type OptionLevel = 'lifted' | 'light' | 'inspired' | 'ruthless';

export interface SectionOption {
  level: OptionLevel;
  content: string;
  reasoning: string;
  watchFor: string;
  whenToChoose: string;
}

export interface SectionOptionsResponse {
  currentState: string;
  alignmentCheck?: string;
  options: SectionOption[];
  questions?: string[];
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run src/lib/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/types.test.ts
git commit -m "feat: add four-option response types"
```

---

### Task 2.3: Add Two-Step Audience Types

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/types.test.ts`

**Step 1: Write the failing test**

Add to `src/lib/types.test.ts`:
```typescript
import { AudienceSegmentMenu, PersonificationResponse } from './types';

describe('Two-Step Audience Types', () => {
  it('should have AudienceSegmentMenu with 5 segments', () => {
    const menu: AudienceSegmentMenu = {
      intro: 'Based on everything...',
      segments: [
        { id: 1, name: 'Reckonings', needsValues: 'desc', demographics: 'demo' },
        { id: 2, name: 'Inheritors', needsValues: 'desc', demographics: 'demo' },
        { id: 3, name: 'Collectors', needsValues: 'desc', demographics: 'demo' },
        { id: 4, name: 'Rewilders', needsValues: 'desc', demographics: 'demo' },
        { id: 5, name: 'Contrarians', needsValues: 'desc', demographics: 'demo' },
      ],
    };
    expect(menu.segments.length).toBe(5);
  });

  it('should have PersonificationResponse with narrative', () => {
    const response: PersonificationResponse = {
      intro: 'Thanks. Based on everything...',
      narrative: 'Rich 150-300 word description...',
    };
    expect(response.narrative).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run src/lib/types.test.ts`
Expected: FAIL - AudienceSegmentMenu not found

**Step 3: Add types to types.ts**

Add to `src/lib/types.ts`:
```typescript
export interface AudienceSegment {
  id: number;
  name: string;         // Snappy 1-2 word name
  needsValues: string;  // Rich description of needs/values/motivations
  demographics: string; // Observable behaviors/demographics
}

export interface AudienceSegmentMenu {
  intro: string;
  segments: AudienceSegment[];
}

export interface PersonificationResponse {
  intro: string;
  narrative: string;  // 150-300 word vivid human sketch
}
```

Also update the existing `Segment` interface to match or deprecate it:
```typescript
// Deprecate old Segment, use AudienceSegment instead
export type Segment = AudienceSegment;
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run src/lib/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/types.test.ts
git commit -m "feat: add two-step audience types"
```

---

### Task 2.4: Add Enhanced Triage Response Types

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/types.test.ts`

**Step 1: Write the failing test**

Add to `src/lib/types.test.ts`:
```typescript
import { TriageSectionResult, EnhancedTriageResponse } from './types';

describe('Enhanced Triage Types', () => {
  it('should have TriageSectionResult with all required fields', () => {
    const result: TriageSectionResult = {
      key: 'objective',
      status: 'amber',
      synthesizedContent: 'What the brief says...',
      contradictions: ['Contradiction 1'],
      vagueness: ['Vague point 1'],
      verbatimQuotes: ['Quote 1'],
      whyThisRating: 'Specific rationale',
      whatNeeded: 'What would improve',
      realityCheck: 'Assessment of impact',
      questions: ['Question 1'],
    };
    expect(result.whyThisRating).toBeDefined();
  });

  it('should have EnhancedTriageResponse with replay and assessment', () => {
    const response: EnhancedTriageResponse = {
      synthesizedReplay: {
        budget: { content: '', contradictions: [], vagueness: [], quotes: [] },
        objective: { content: '', contradictions: [], vagueness: [], quotes: [] },
        // ... other sections
      },
      triageAssessment: [],
      overallBriefHealth: 'Summary...',
    };
    expect(response.overallBriefHealth).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run src/lib/types.test.ts`
Expected: FAIL - TriageSectionResult not found

**Step 3: Add types to types.ts**

Add to `src/lib/types.ts`:
```typescript
export interface SynthesizedSection {
  content: string;
  contradictions: string[];
  vagueness: string[];
  quotes: string[];
}

export interface TriageSectionResult {
  key: SectionKey;
  status: Status;
  synthesizedContent: string;
  contradictions: string[];
  vagueness: string[];
  verbatimQuotes: string[];
  whyThisRating: string;
  whatNeeded?: string;
  realityCheck: string;
  questions: string[];
}

export interface EnhancedTriageResponse {
  synthesizedReplay: Record<SectionKey, SynthesizedSection>;
  triageAssessment: TriageSectionResult[];
  overallBriefHealth: string;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run src/lib/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/types.test.ts
git commit -m "feat: add enhanced triage response types"
```

---

## Phase 3: Prompt Rewrites

### Task 3.1: Create Budget Prompt

**Files:**
- Create: `prompts/budget.json`
- Create: `src/lib/prompts.test.ts`

**Step 1: Write the failing test**

Create `src/lib/prompts.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { loadPrompt, buildSystemPrompt } from './prompts';

describe('Prompt Loading', () => {
  it('should load budget prompt', () => {
    const prompt = loadPrompt('budget');
    expect(prompt.section).toBe('budget');
    expect(prompt.displayName).toBe('Budget');
  });

  it('should build system prompt with all sections', () => {
    const prompt = loadPrompt('budget');
    const system = buildSystemPrompt(prompt.assess);
    expect(system).toContain('Role');
    expect(system).toContain('Task');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run src/lib/prompts.test.ts`
Expected: FAIL - budget.json not found

**Step 3: Create budget.json**

Create `prompts/budget.json`:
```json
{
  "section": "budget",
  "displayName": "Budget",

  "assess": {
    "role": "You are a Budget Realist who pressure-tests ambition against resources and flags mismatches early. You understand that budget fundamentally constrains what's achievable and must be realistic before any other planning begins.",

    "task": "Assess whether a budget is stated, realistic for the objective, and provides enough context to evaluate feasibility. Be direct about fantasy gaps between ambition and means.",

    "logic": "GREEN = Budget clearly stated and realistic for the objective. AMBER = Budget mentioned but unclear, or some mismatch between budget and ambition. RED = No budget provided, or budget wildly misaligned with objective.\n\nBudget Benchmarks:\n- Under $250k: Single market, tactical activation, conversion focus only\n- $250k-$500k: Single market, integrated campaign, awareness + conversion\n- $500k-$1m: 2-3 markets, integrated campaign with media support\n- $1m-$2m: 3-5 markets, full funnel campaign\n- $2m+: 5+ markets, brand-building awareness campaign",

    "inputs": {
      "brief": "The full brief text"
    },

    "outputs": {
      "status": "green/amber/red",
      "synthesizedContent": "What budget information is stated (preserve exact figures)",
      "contradictions": "Array of any budget/objective mismatches",
      "vagueness": "Array of unclear budget elements",
      "verbatimQuotes": "Array of exact budget quotes from brief",
      "whyThisRating": "Specific rationale for the rating",
      "whatNeeded": "What budget information would improve this (if amber/red)",
      "realityCheck": "Assessment of whether objective is achievable with this budget",
      "questions": "Array of 2-4 questions to clarify budget"
    },

    "examples": [],

    "escapeHatch": "If no budget mentioned at all, return RED and list what budget information is essential."
  },

  "reassess": {
    "role": "You are a Budget Realist.",
    "task": "Re-evaluate budget given new information from the user.",
    "logic": "Apply same criteria. If new info clarifies budget or resolves mismatches, upgrade status.",
    "inputs": {
      "brief": "Original brief",
      "currentContent": "Previously extracted content",
      "additionalContext": "New information from user"
    },
    "outputs": {
      "status": "green/amber/red",
      "content": "Updated budget content",
      "feedback": "Updated explanation",
      "questions": "Array of remaining questions"
    },
    "examples": [],
    "escapeHatch": "If new info doesn't help, explain what's still needed."
  },

  "generate": {
    "role": "You are a Budget Realist helping define realistic budget parameters.",
    "task": "Based on the objective and creative task, suggest what budget range would be appropriate.",
    "logic": "Use the budget benchmarks to recommend a realistic range. Be honest if the objective seems too ambitious for any reasonable budget.",
    "inputs": {
      "brief": "The full brief",
      "objective": "The finalized objective",
      "creativeTask": "The finalized creative task"
    },
    "outputs": {
      "currentState": "Assessment of what's implied about budget",
      "options": "Array of 4 budget range options from conservative to ambitious",
      "questions": "Clarifying questions about budget constraints"
    },
    "examples": [],
    "escapeHatch": "If objective is unclear, provide general budget guidance for different ambition levels."
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:run src/lib/prompts.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add prompts/budget.json src/lib/prompts.test.ts
git commit -m "feat: add budget prompt"
```

---

### Task 3.2: Rewrite Triage Prompt (Multi-Persona Approach)

**Files:**
- Modify: `prompts/triage.json`
- Modify: `src/lib/prompts.test.ts`

**Step 1: Write the failing test**

Add to `src/lib/prompts.test.ts`:
```typescript
describe('Triage Prompt', () => {
  it('should have multi-persona role', () => {
    const prompt = loadPrompt('triage');
    expect(prompt.assess.role).toContain('Strategic Planner');
    expect(prompt.assess.role).toContain('Creative Strategist');
    expect(prompt.assess.role).toContain('Brief Architect');
    expect(prompt.assess.role).toContain('Behavioral Psychologist');
    expect(prompt.assess.role).toContain('Budget Realist');
  });

  it('should include preserve chaos principle', () => {
    const prompt = loadPrompt('triage');
    const system = buildSystemPrompt(prompt.assess);
    expect(system).toContain('preserve');
    expect(system).toContain('chaos');
  });

  it('should assess 8 sections including budget', () => {
    const prompt = loadPrompt('triage');
    expect(prompt.assess.outputs.sections).toContain('budget');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run src/lib/prompts.test.ts`
Expected: FAIL - doesn't contain multi-persona role

**Step 3: Rewrite triage.json with Richard's approach**

Replace `prompts/triage.json` with the full multi-persona prompt from Richard's guide (this is a large file - see reference document `Expedia Creative Brief Process.md` section 2.1 for full content).

Key elements to include:
- Multi-persona ROLE (Strategic Planner, Creative Strategist, Brief Architect, Behavioral Psychologist, Budget Realist)
- "CRITICAL: Preserve chaos, don't mask it" principle
- Two-part output: Synthesized Brief Replay + Triage Assessment
- 8 sections (budget + original 7)
- Reality checks for each section
- The Test checklist

**Step 4: Run test to verify it passes**

Run: `npm run test:run src/lib/prompts.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add prompts/triage.json src/lib/prompts.test.ts
git commit -m "feat: rewrite triage prompt with multi-persona approach"
```

---

### Task 3.3: Rewrite Objective Prompt (Four-Option Spectrum)

**Files:**
- Modify: `prompts/objective.json`
- Modify: `src/lib/prompts.test.ts`

**Step 1: Write the failing test**

Add to `src/lib/prompts.test.ts`:
```typescript
describe('Objective Prompt', () => {
  it('should have four-option generate output', () => {
    const prompt = loadPrompt('objective');
    expect(prompt.generate.outputs.options).toContain('lifted');
    expect(prompt.generate.outputs.options).toContain('light');
    expect(prompt.generate.outputs.options).toContain('inspired');
    expect(prompt.generate.outputs.options).toContain('ruthless');
  });

  it('should include current state in generate output', () => {
    const prompt = loadPrompt('objective');
    expect(prompt.generate.outputs.currentState).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run src/lib/prompts.test.ts`
Expected: FAIL - doesn't have four-option output

**Step 3: Rewrite objective.json**

Update `prompts/objective.json` with the four-option spectrum approach from Richard's guide (section 3.1). Key elements:
- Assess stays similar but enhanced
- Generate returns 4 options: Lifted Directly, Light Edits, Inspired Coherence, Ruthless Clarity
- Each option has: content, reasoning, watchFor, whenToChoose

**Step 4: Run test to verify it passes**

Run: `npm run test:run src/lib/prompts.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add prompts/objective.json
git commit -m "feat: rewrite objective prompt with four-option spectrum"
```

---

### Task 3.4: Rewrite Creative Task Prompt (Four-Option Spectrum)

**Files:**
- Modify: `prompts/creative-task.json`

**Step 1: Add test for creative task**

Add to `src/lib/prompts.test.ts`:
```typescript
describe('Creative Task Prompt', () => {
  it('should have four-option generate output', () => {
    const prompt = loadPrompt('creative-task');
    expect(prompt.generate.outputs.options).toContain('lifted');
  });

  it('should include alignment check', () => {
    const prompt = loadPrompt('creative-task');
    expect(prompt.generate.outputs.alignmentCheck).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run src/lib/prompts.test.ts`
Expected: FAIL

**Step 3: Rewrite creative-task.json**

Update with four-option spectrum from Richard's guide section 3.2. Include:
- Alignment Check against finalized Objective
- Four options with clear progression

**Step 4: Run test to verify it passes**

Run: `npm run test:run src/lib/prompts.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add prompts/creative-task.json src/lib/prompts.test.ts
git commit -m "feat: rewrite creative-task prompt with four-option spectrum"
```

---

### Task 3.5: Rewrite Audience Prompt (Two-Step Flow)

**Files:**
- Modify: `prompts/audience.json`

**Step 1: Add test for audience two-step**

Add to `src/lib/prompts.test.ts`:
```typescript
describe('Audience Prompt', () => {
  it('should have generate step for segment menu', () => {
    const prompt = loadPrompt('audience');
    expect(prompt.generate.outputs.segments).toBeDefined();
    expect(prompt.generate.outputs.intro).toBeDefined();
  });

  it('should have personify step', () => {
    const prompt = loadPrompt('audience');
    expect(prompt.personify).toBeDefined();
    expect(prompt.personify.outputs.narrative).toBeDefined();
  });

  it('should avoid overused segment names', () => {
    const prompt = loadPrompt('audience');
    const system = buildSystemPrompt(prompt.generate);
    expect(system).toContain('Cultural Explorers');
    expect(system).toContain('avoid');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run src/lib/prompts.test.ts`
Expected: FAIL - personify not defined

**Step 3: Rewrite audience.json with two-step approach**

Update `prompts/audience.json` with Richard's approach from section 3.3:
- Step 1 (generate): Create 5 segment menu with snappy names
- Step 2 (personify): Rich 150-300 word narrative personification
- Naming rules: avoid "Cultural Explorers", "Globe Trotters", etc.

**Step 4: Run test to verify it passes**

Run: `npm run test:run src/lib/prompts.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add prompts/audience.json
git commit -m "feat: rewrite audience prompt with two-step flow"
```

---

### Task 3.6: Rewrite Human Truths Prompt (12-Truth Spectrum)

**Files:**
- Modify: `prompts/human-truths.json`

**Step 1: Add test for human truths**

Add to `src/lib/prompts.test.ts`:
```typescript
describe('Human Truths Prompt', () => {
  it('should specify 12 truths', () => {
    const prompt = loadPrompt('human-truths');
    const system = buildSystemPrompt(prompt.generate);
    expect(system).toContain('12');
    expect(system).toContain('truths');
  });

  it('should define safer/sharper/bolder zones', () => {
    const prompt = loadPrompt('human-truths');
    const system = buildSystemPrompt(prompt.generate);
    expect(system).toContain('1-4');
    expect(system).toContain('5-8');
    expect(system).toContain('9-12');
  });

  it('should require rhetorical questions', () => {
    const prompt = loadPrompt('human-truths');
    const system = buildSystemPrompt(prompt.generate);
    expect(system).toContain('rhetorical');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run src/lib/prompts.test.ts`
Expected: FAIL

**Step 3: Rewrite human-truths.json**

Update with Richard's approach from section 3.4:
- 12 truths exactly
- Truths 1-4: Safer Zone (clichés OK)
- Truths 5-8: Sharper Zone
- Truths 9-12: Bolder Zone
- At least 2 rhetorical questions
- Max 14 words per truth

**Step 4: Run test to verify it passes**

Run: `npm run test:run src/lib/prompts.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add prompts/human-truths.json
git commit -m "feat: rewrite human-truths prompt with 12-truth spectrum"
```

---

### Task 3.7: Rewrite Remaining Section Prompts (Four-Option Spectrum)

**Files:**
- Modify: `prompts/creative-tenets.json`
- Modify: `prompts/media-strategy.json`
- Modify: `prompts/research-stimuli.json`

**Step 1: Add tests for remaining prompts**

Add to `src/lib/prompts.test.ts`:
```typescript
describe('Section Builder Prompts', () => {
  const sectionBuilders = ['creative-tenets', 'media-strategy', 'research-stimuli'];

  sectionBuilders.forEach((section) => {
    it(`${section} should have four-option generate output`, () => {
      const prompt = loadPrompt(section);
      expect(prompt.generate.outputs.options).toBeDefined();
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm run test:run src/lib/prompts.test.ts`
Expected: FAIL

**Step 3: Update all three prompts with four-option spectrum**

Apply the same four-option pattern to each:
- creative-tenets.json
- media-strategy.json
- research-stimuli.json

**Step 4: Run tests to verify they pass**

Run: `npm run test:run src/lib/prompts.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add prompts/creative-tenets.json prompts/media-strategy.json prompts/research-stimuli.json
git commit -m "feat: rewrite remaining section prompts with four-option spectrum"
```

---

## Phase 4: API Route Updates

### Task 4.1: Update Triage Route for Enhanced Response

**Files:**
- Modify: `src/app/api/triage/route.ts`
- Create: `src/app/api/triage/route.test.ts`

**Step 1: Write the failing test**

Create `src/app/api/triage/route.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';

// Mock the claude module
vi.mock('@/lib/claude', () => ({
  callClaudeJSON: vi.fn(),
}));

describe('Triage API Route', () => {
  it('should return enhanced triage response with 8 sections', async () => {
    // Test will be implemented with actual route testing
    expect(true).toBe(true); // Placeholder
  });
});
```

**Step 2: Update triage route**

Update `src/app/api/triage/route.ts` to:
- Return EnhancedTriageResponse type
- Include all 8 sections (budget first)
- Include synthesized replay and triage assessment

**Step 3: Run build to verify no errors**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/api/triage/route.ts src/app/api/triage/route.test.ts
git commit -m "feat: update triage route for enhanced response"
```

---

### Task 4.2: Create Section Builder Route (Four-Option Response)

**Files:**
- Create: `src/app/api/section/builder/route.ts`

**Step 1: Create new route for section building**

Create `src/app/api/section/builder/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { callClaudeJSON } from '@/lib/claude';
import { loadPrompt, buildSystemPrompt } from '@/lib/prompts';
import { SectionOptionsResponse, SectionKey } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sectionKey, brief, previousSections, additionalContext } = body;

    if (!sectionKey || !brief) {
      return NextResponse.json(
        { error: 'sectionKey and brief are required' },
        { status: 400 }
      );
    }

    const promptFileName = sectionKey.replace('_', '-');
    const promptConfig = loadPrompt(promptFileName);
    const systemPrompt = buildSystemPrompt(promptConfig.generate);

    let userMessage = `Brief:\n${brief}\n\n`;

    if (previousSections) {
      userMessage += `Previous sections already finalized:\n${JSON.stringify(previousSections, null, 2)}\n\n`;
    }

    if (additionalContext) {
      userMessage += `Additional context:\n${additionalContext}\n\n`;
    }

    userMessage += `Please generate 4 options for the ${sectionKey} section.`;

    const response = await callClaudeJSON<SectionOptionsResponse>(
      systemPrompt,
      userMessage,
      { endpoint: `section:${sectionKey}:build` }
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error('Section builder error:', error);
    return NextResponse.json(
      { error: 'Failed to build section options' },
      { status: 500 }
    );
  }
}
```

**Step 2: Run build to verify**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/api/section/builder/route.ts
git commit -m "feat: add section builder route for four-option response"
```

---

### Task 4.3: Update Audience Route for Two-Step Flow

**Files:**
- Modify: `src/app/api/generate/audience/route.ts`

**Step 1: Update audience route**

Update `src/app/api/generate/audience/route.ts` to handle:
- Step 1: Generate segment menu (when no selectedSegment provided)
- Step 2: Personify segment (when selectedSegment provided)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { callClaudeJSON } from '@/lib/claude';
import { loadPrompt, buildSystemPrompt } from '@/lib/prompts';
import { AudienceSegmentMenu, PersonificationResponse, AudienceSegment } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { brief, additionalContext, selectedSegment } = await request.json();

    if (!brief) {
      return NextResponse.json({ error: 'Brief is required' }, { status: 400 });
    }

    const promptConfig = loadPrompt('audience');

    if (selectedSegment) {
      // Step 2: Personify the selected segment
      const systemPrompt = buildSystemPrompt(promptConfig.personify);
      const userMessage = `Brief:\n${brief}\n\nSelected segment:\n${JSON.stringify(selectedSegment, null, 2)}\n\nPlease personify this segment.`;

      const response = await callClaudeJSON<PersonificationResponse>(
        systemPrompt,
        userMessage,
        { endpoint: 'audience:personify' }
      );

      return NextResponse.json(response);
    } else {
      // Step 1: Generate segment menu
      const systemPrompt = buildSystemPrompt(promptConfig.generate);
      const userMessage = `Brief:\n${brief}\n\n${additionalContext ? `Additional context:\n${additionalContext}\n\n` : ''}Please generate 5 audience segments.`;

      const response = await callClaudeJSON<AudienceSegmentMenu>(
        systemPrompt,
        userMessage,
        { endpoint: 'audience:generate' }
      );

      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('Audience generation error:', error);
    return NextResponse.json(
      { error: 'Failed to process audience' },
      { status: 500 }
    );
  }
}
```

**Step 2: Run build to verify**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/api/generate/audience/route.ts
git commit -m "feat: update audience route for two-step flow"
```

---

## Phase 5: UI Updates

### Task 5.1: Update State Types for New Flow

**Files:**
- Modify: `src/lib/types.ts`

**Step 1: Update SessionState interface**

Add to `src/lib/types.ts`:
```typescript
export interface SessionState {
  step: Step;
  brief: string;
  additionalContext: string;

  // Enhanced triage
  triageResult: EnhancedTriageResponse | null;

  // Section building with options
  sections: Section[];
  currentSectionIndex: number;
  currentSectionOptions: SectionOptionsResponse | null;
  selectedOptionLevel: OptionLevel | null;

  // Two-step audience
  audienceMenu: AudienceSegmentMenu | null;
  selectedAudienceSegment: AudienceSegment | null;
  personification: PersonificationResponse | null;

  // Human truths
  truthOptions: Truth[];
  selectedTruths: Truth[];

  error: string | null;
  loading: boolean;
}
```

**Step 2: Update createInitialState**

```typescript
export function createInitialState(): SessionState {
  return {
    step: 'upload',
    brief: '',
    additionalContext: '',
    triageResult: null,
    sections: SECTION_KEYS.map((key) => ({
      key,
      name: SECTION_CONFIG[key].name,
      status: 'red' as Status,
      content: '',
      feedback: '',
    })),
    currentSectionIndex: 0,
    currentSectionOptions: null,
    selectedOptionLevel: null,
    audienceMenu: null,
    selectedAudienceSegment: null,
    personification: null,
    truthOptions: [],
    selectedTruths: [],
    error: null,
    loading: false,
  };
}
```

**Step 3: Run build to verify**

Run: `npm run build`
Expected: Build may fail due to page.tsx mismatches (expected)

**Step 4: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: update session state types for new flow"
```

---

### Task 5.2: Create Section Options Component

**Files:**
- Create: `src/components/SectionOptions.tsx`

**Step 1: Create the component**

Create `src/components/SectionOptions.tsx`:
```typescript
'use client';

import { SectionOption, OptionLevel } from '@/lib/types';

interface SectionOptionsProps {
  currentState: string;
  alignmentCheck?: string;
  options: SectionOption[];
  selectedLevel: OptionLevel | null;
  onSelect: (level: OptionLevel) => void;
  onConfirm: () => void;
  loading: boolean;
}

const LEVEL_LABELS: Record<OptionLevel, { title: string; description: string }> = {
  lifted: { title: 'Option 1: Lifted Directly', description: 'Verbatim from brief' },
  light: { title: 'Option 2: Light Edits', description: 'Tightened for clarity' },
  inspired: { title: 'Option 3: Inspired Coherence', description: 'Interpreted for coherence' },
  ruthless: { title: 'Option 4: Ruthless Clarity', description: 'Bold strategic reframe' },
};

export function SectionOptions({
  currentState,
  alignmentCheck,
  options,
  selectedLevel,
  onSelect,
  onConfirm,
  loading,
}: SectionOptionsProps) {
  return (
    <div className="space-y-6">
      {/* Current State */}
      <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
        <h3 className="font-semibold text-[var(--text-primary)] mb-2">Current State</h3>
        <p className="text-sm text-[var(--text-secondary)]">{currentState}</p>
        {alignmentCheck && (
          <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
            <p className="text-xs font-medium text-[var(--text-muted)]">Alignment Check</p>
            <p className="text-sm text-[var(--text-secondary)]">{alignmentCheck}</p>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--text-primary)]">Choose an approach:</h3>
        {options.map((option) => (
          <div
            key={option.level}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              selectedLevel === option.level
                ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]/5'
                : 'border-[var(--border-color)] hover:border-[var(--border-hover)]'
            }`}
            onClick={() => onSelect(option.level)}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-medium text-[var(--text-primary)]">
                  {LEVEL_LABELS[option.level].title}
                </h4>
                <p className="text-xs text-[var(--text-muted)]">
                  {LEVEL_LABELS[option.level].description}
                </p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedLevel === option.level
                  ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]'
                  : 'border-[var(--border-color)]'
              }`}>
                {selectedLevel === option.level && (
                  <span className="text-white text-xs">✓</span>
                )}
              </div>
            </div>

            <div className="mt-3 p-3 bg-white rounded-lg">
              <p className="text-sm text-[var(--text-primary)]">{option.content}</p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="font-medium text-[var(--text-muted)]">Why this option:</p>
                <p className="text-[var(--text-secondary)]">{option.reasoning}</p>
              </div>
              <div>
                <p className="font-medium text-[var(--text-muted)]">Watch for:</p>
                <p className="text-[var(--text-secondary)]">{option.watchFor}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Confirm */}
      <button
        onClick={onConfirm}
        disabled={!selectedLevel || loading}
        className="btn-secondary w-full"
      >
        {loading ? 'Processing...' : 'Confirm Selection & Continue'}
      </button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/SectionOptions.tsx
git commit -m "feat: add SectionOptions component for four-option UI"
```

---

### Task 5.3: Create Audience Menu Component

**Files:**
- Create: `src/components/AudienceMenu.tsx`

**Step 1: Create the component**

Create `src/components/AudienceMenu.tsx`:
```typescript
'use client';

import { AudienceSegment, AudienceSegmentMenu } from '@/lib/types';

interface AudienceMenuProps {
  menu: AudienceSegmentMenu;
  onSelect: (segment: AudienceSegment) => void;
  loading: boolean;
}

export function AudienceMenu({ menu, onSelect, loading }: AudienceMenuProps) {
  return (
    <div className="space-y-6">
      <div className="text-center pb-6 border-b border-[var(--border-color)]">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Choose Your Audience
        </h2>
        <p className="text-[var(--text-secondary)]">{menu.intro}</p>
      </div>

      <div className="space-y-3">
        {menu.segments.map((segment) => (
          <div
            key={segment.id}
            className="p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--expedia-navy)] hover:shadow-md cursor-pointer transition-all group"
            onClick={() => !loading && onSelect(segment)}
          >
            <h3 className="font-semibold text-lg text-[var(--expedia-navy)] group-hover:underline mb-2">
              {segment.name}
            </h3>
            <p className="text-[var(--text-primary)] mb-2">{segment.needsValues}</p>
            <p className="text-sm text-[var(--text-muted)]">{segment.demographics}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/AudienceMenu.tsx
git commit -m "feat: add AudienceMenu component for two-step flow"
```

---

### Task 5.4: Create Personification Review Component

**Files:**
- Create: `src/components/PersonificationReview.tsx`

**Step 1: Create the component**

Create `src/components/PersonificationReview.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { AudienceSegment, PersonificationResponse } from '@/lib/types';

interface PersonificationReviewProps {
  segment: AudienceSegment;
  personification: PersonificationResponse;
  onConfirm: (editedNarrative: string) => void;
  onBack: () => void;
  loading: boolean;
}

export function PersonificationReview({
  segment,
  personification,
  onConfirm,
  onBack,
  loading,
}: PersonificationReviewProps) {
  const [narrative, setNarrative] = useState(personification.narrative);

  return (
    <div className="space-y-6">
      <div className="text-center pb-6 border-b border-[var(--border-color)]">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Review Audience Profile
        </h2>
        <p className="text-[var(--text-secondary)]">
          {personification.intro}{' '}
          <strong className="text-[var(--expedia-navy)]">{segment.name}</strong>
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-[var(--text-secondary)]">
          Audience Personification
        </label>
        <p className="text-xs text-[var(--text-muted)]">
          Feel free to edit this narrative to better match your understanding of the audience.
        </p>
        <textarea
          className="textarea-field"
          style={{ minHeight: '300px' }}
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onConfirm(narrative)}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          Confirm & Generate Human Truths
          <span>→</span>
        </button>
        <button onClick={onBack} disabled={loading} className="btn-outline">
          ← Back to Segments
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/PersonificationReview.tsx
git commit -m "feat: add PersonificationReview component"
```

---

### Task 5.5: Update Main Page with New Flow

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Update page.tsx**

This is the largest change. Update `src/app/page.tsx` to:
1. Import new components (SectionOptions, AudienceMenu, PersonificationReview)
2. Update state to use new types
3. Add Budget to the section flow
4. Implement four-option selection for sections
5. Implement two-step audience flow
6. Keep GlobalProgressBar updated for 8 sections

Key changes:
- `renderTriageStep()` - Show enhanced triage with synthesized replay
- `renderSectionStep()` - Show four options instead of direct edit
- `renderAudienceStep()` - Two-step flow (menu → personification)
- Update `SECTION_KEYS` references to include budget

**Step 2: Run build to verify**

Run: `npm run build`
Expected: PASS

**Step 3: Run locally to test**

Run: `npm run dev`
Test the flow manually

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: update main page with new prompt flow"
```

---

### Task 5.6: Update GlobalProgressBar for 8 Sections

**Files:**
- Modify: `src/app/page.tsx` (GlobalProgressBar component)

**Step 1: Update steps array**

In GlobalProgressBar, update the steps to reflect budget:
```typescript
const steps = [
  { key: 'upload', label: 'Upload' },
  { key: 'triage', label: 'Triage' },
  { key: 'budget', label: 'Budget' },
  { key: 'sections', label: 'Sections' },
  { key: 'audience', label: 'Audience' },
  { key: 'truths', label: 'Truths' },
  { key: 'output', label: 'Output' },
];
```

**Step 2: Run build**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: update progress bar for 8 sections"
```

---

## Phase 6: Integration Testing

### Task 6.1: Add Integration Tests

**Files:**
- Create: `src/test/integration/flow.test.ts`

**Step 1: Create integration test file**

Create `src/test/integration/flow.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { SECTION_KEYS, SECTION_CONFIG, createInitialState } from '@/lib/types';

describe('Integration: Full Flow', () => {
  it('should have 8 sections starting with budget', () => {
    expect(SECTION_KEYS.length).toBe(8);
    expect(SECTION_KEYS[0]).toBe('budget');
  });

  it('should create initial state with all sections', () => {
    const state = createInitialState();
    expect(state.sections.length).toBe(8);
    expect(state.sections[0].key).toBe('budget');
  });

  it('should have correct section order', () => {
    const expectedOrder = [
      'budget',
      'objective',
      'creative_task',
      'audience',
      'human_truths',
      'creative_tenets',
      'media_strategy',
      'research_stimuli',
    ];
    expect(SECTION_KEYS).toEqual(expectedOrder);
  });
});
```

**Step 2: Run tests**

Run: `npm run test:run`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/test/integration/flow.test.ts
git commit -m "test: add integration tests for full flow"
```

---

### Task 6.2: Final Build and Deploy Verification

**Step 1: Run all tests**

Run: `npm run test:run`
Expected: All tests PASS

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Run locally and test flow**

Run: `npm run dev`
Manual test:
1. Upload a brief
2. Verify triage shows 8 sections with enhanced format
3. Verify sections show 4 options
4. Verify audience has two-step flow
5. Verify human truths generate 12 with correct spectrum

**Step 4: Deploy to Railway**

Run: `railway up --detach`
Expected: Deploy succeeds

**Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete prompt system overhaul"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1.1-1.2 | Test infrastructure (Vitest) |
| 2 | 2.1-2.4 | Types & data model updates |
| 3 | 3.1-3.7 | Prompt rewrites |
| 4 | 4.1-4.3 | API route updates |
| 5 | 5.1-5.6 | UI updates |
| 6 | 6.1-6.2 | Integration testing & deploy |

**Total estimated tasks:** 19 tasks across 6 phases

**Key architectural changes:**
- Budget added as Section 0
- Four-option spectrum for all section builders
- Two-step audience flow (menu → personify)
- Multi-persona triage with "preserve chaos" principle
- 12-truth spectrum with specific patterns

**Reference files for prompt content:**
- `ventures/audience-strategies/Context/Expedia Creative Brief Process.md`
- `ventures/audience-strategies/Context/Untitled Document (1).pdf`
