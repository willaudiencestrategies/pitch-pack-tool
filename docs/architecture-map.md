# Pitch Pack Tool — Architecture Map

**Last Updated:** 2026-01-29
**Codebase Location:** `/Users/will.bainbridge/Desktop/alive/ventures/audience-strategies/clients/expedia/pitch-pack-tool/`
**Live URL:** https://pitch-pack-tool-production.up.railway.app

---

## 1. System Overview

The Pitch Pack Tool is a **human-in-the-loop brief improvement assistant** built with Next.js that guides strategic teams through a 6-step workflow to transform sparse seller briefs into quality Pitch Packs.

**Architecture Layers:**
```
┌─ Client (React + Tailwind) ─────────────────────┐
│  page.tsx (state management)                     │
│  Components: FileUpload, AudienceMenu, etc.      │
└─────────────────┬─────────────────────────────────┘
                  │
┌─ API Routes ────┴─────────────────────────────────┐
│  /api/triage                                      │
│  /api/section                                     │
│  /api/generate/audience                           │
│  /api/generate/truths                             │
│  /api/output                                      │
└─────────────────┬─────────────────────────────────┘
                  │
┌─ Anthropic SDK ─┴─────────────────────────────────┐
│  claude-sonnet-4-20250514 (model)                            │
│  Prompt orchestration                            │
└────────────────────────────────────────────────────┘
```

---

## 2. Component Map

All components in `src/components/` are client-side React components.

### FileUpload.tsx

**Purpose:** File upload and text input for brief submission.

**Props:**
```typescript
interface FileUploadProps {
  onFileContent: (content: string, filename: string) => void;
  disabled?: boolean;
}
```

**Renders:** Drag-drop zone, file type indicator, state display (idle → processing → success/error)

**Dependencies:** `file-parser.ts` (Word → text via mammoth)

---

### AudienceMenu.tsx

**Purpose:** Display 5 audience segments, allow selection/editing/regeneration.

**Props:**
```typescript
interface AudienceMenuProps {
  menu: AudienceSegmentMenu;
  onSelect: (segments: AudienceSegment[]) => void;
  onRegenerate: (feedback: string) => void;
  onBack: () => void;
  loading: boolean;
}
```

**Features:**
- Multi-select (1+ segments merge into unified profile)
- In-place editing
- Feedback/regeneration

---

### PersonificationReview.tsx

**Purpose:** Display personified audience, allow editing before truths generation.

**Props:**
```typescript
interface PersonificationReviewProps {
  segment: AudienceSegment;
  personification: PersonificationResponse;
  onConfirm: (editedNarrative: string) => void;
  onBack: () => void;
  loading: boolean;
}
```

---

### SectionOptions.tsx

**Purpose:** Show 4 strategic options (Lifted/Light/Inspired/Ruthless).

**Props:**
```typescript
interface SectionOptionsProps {
  currentState: string;
  alignmentCheck?: string;
  options: SectionOption[];
  selectedLevel: OptionLevel | null;
  onSelect: (level: OptionLevel) => void;
  onConfirm: () => void;
  loading: boolean;
}
```

**Note:** Currently unused in main flow.

---

## 3. Page Flow & State Management

### Main Component: page.tsx

**Primary State:**
```typescript
interface SessionState {
  step: Step;  // 'upload' | 'triage' | 'sections' | 'audience' | 'truths' | 'output'
  brief: string;
  additionalContext: string;
  triageResult: EnhancedTriageResponse | null;
  sections: Section[];
  currentSectionIndex: number;
  audienceMenu: AudienceSegmentMenu | null;
  selectedAudienceSegment: AudienceSegment | null;
  personification: PersonificationResponse | null;
  truthOptions: Truth[];
  selectedTruths: Truth[];
  outputMarkdown: string | null;
  error: string | null;
  loading: boolean;
}
```

### Step Flow

1. **UPLOAD** — User uploads/pastes brief → `handleTriage()` → TRIAGE
2. **TRIAGE** — Shows 8 sections (green/amber/red) → user continues → SECTIONS
3. **SECTIONS** — Iterate through sections, reassess/generate → at audience section → AUDIENCE
4. **AUDIENCE** — Generate 5 segments → select → personify → TRUTHS
5. **TRUTHS** — Select from 12 truths → continue sections → OUTPUT
6. **OUTPUT** — Compile markdown, copy/download

---

## 4. API Routes

### /api/triage [POST]

**Purpose:** Initial assessment of brief across 8 sections.

**Request:** `{ brief: string }`

**Response:**
```typescript
{
  synthesizedReplay: Record<SectionKey, SynthesizedSection>;
  triageAssessment: TriageSectionResult[];
  overallBriefHealth: string;
}
```

**Prompt:** `prompts/triage.json` → `assess`

---

### /api/section [POST]

**Purpose:** Reassess or generate for a single section.

**Request:**
```typescript
{
  sectionKey: SectionKey;
  brief: string;
  currentContent: string;
  additionalContext: string;
  action: 'reassess' | 'generate';
}
```

**Response:**
```typescript
{
  status: Status;
  content: string;
  feedback: string;
  suggestion?: string;
  questions?: string[];
}
```

**Prompt:** `prompts/{sectionKey}.json`

---

### /api/generate/audience [POST]

**Purpose:** Two-step audience generation.

**Step 1 (no selectedSegment):** Returns 5 segments
**Step 2 (with selectedSegment):** Returns personification narrative

**Prompt:** `prompts/audience.json` → `generate` or `personify`

---

### /api/generate/truths [POST]

**Purpose:** Generate 12 human truths.

**Request:**
```typescript
{
  audience: { name, description, demographics };
  personification: string;
}
```

**Response:** `{ truths: Truth[] }` (12 truths, levels assigned by index)

**Prompt:** `prompts/human-truths.json` → `generate`

---

### /api/output [POST]

**Purpose:** Compile final markdown.

**Request:** `{ sections, audience?, personification?, selectedTruths? }`

**Response:** `{ markdown: string }`

**Prompt:** `prompts/output.json` → `generate`

---

## 5. Prompt System

**Location:** `prompts/*.json`

**Structure:**
```typescript
interface SectionPrompts {
  section: string;
  displayName: string;
  assess: PromptConfig;
  reassess: PromptConfig;
  generate: PromptConfig;
  personify?: PromptConfig;  // audience only
}

interface PromptConfig {
  role: string;
  task: string;
  logic: string;
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  examples?: Array<{input, output}>;
  escapeHatch: string;
}
```

**Loading:** `src/lib/prompts.ts` → `loadPrompt(promptName)`

**Prompt Files:**
- `triage.json` — 8-section initial assessment
- `budget.json`, `objective.json`, `creative-task.json` — Section prompts
- `audience.json` — Segment generation + personification
- `human-truths.json` — 12 truths (safer/sharper/bolder)
- `creative-tenets.json`, `media-strategy.json`, `research-stimuli.json`
- `output.json` — Final markdown compilation

---

## 6. Types Reference

**Location:** `src/lib/types.ts`

### Core Types

```typescript
type Status = 'green' | 'amber' | 'red';
type Step = 'upload' | 'triage' | 'sections' | 'audience' | 'truths' | 'output';
type SectionKey = 'budget' | 'objective' | 'creative_task' | 'audience'
  | 'human_truths' | 'creative_tenets' | 'media_strategy' | 'research_stimuli';

interface Section {
  key: SectionKey;
  name: string;
  status: Status;
  content: string;
  feedback: string;
  suggestion?: string;
  gaps?: string[];
  questions?: string[];
}

interface AudienceSegment {
  id: number;
  name: string;
  needsValues: string;
  demographics: string;
}

interface Truth {
  id: number;
  text: string;
  level: 'safer' | 'sharper' | 'bolder';
}
```

### Section Config

```typescript
const SECTION_CONFIG: Record<SectionKey, { name: string; order: number }> = {
  budget: { name: 'Budget', order: 0 },
  objective: { name: 'Objective', order: 1 },
  creative_task: { name: 'Creative Task', order: 2 },
  audience: { name: 'Audience', order: 3 },
  human_truths: { name: 'Human Truths', order: 4 },
  creative_tenets: { name: 'Creative Tenets', order: 5 },
  media_strategy: { name: 'Media Strategy', order: 6 },
  research_stimuli: { name: 'Research Stimuli', order: 7 },
};
```

---

## 7. Key Handlers

### page.tsx

| Handler | Purpose |
|---------|---------|
| `handleTriage()` | POST /api/triage, populate sections |
| `handleSectionReassess(info)` | POST /api/section (reassess) |
| `handleSectionGenerate()` | POST /api/section (generate) |
| `acceptSuggestion()` | Move suggestion to content |
| `goToNextSection()` | Increment currentSectionIndex |
| `handleGenerateAudience(feedback?)` | POST /api/generate/audience (Step 1) |
| `handleSelectAudience(segments)` | POST /api/generate/audience (Step 2) |
| `handleGenerateTruths()` | POST /api/generate/truths |
| `handleCompileOutput()` | POST /api/output |
| `handleNavigateToStep(step)` | Progress bar navigation |

---

## 8. File Structure

```
pitch-pack-tool/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main UI, state management
│   │   ├── layout.tsx            # App shell
│   │   └── api/
│   │       ├── triage/route.ts
│   │       ├── section/route.ts
│   │       └── generate/
│   │           ├── audience/route.ts
│   │           └── truths/route.ts
│   ├── components/
│   │   ├── FileUpload.tsx
│   │   ├── AudienceMenu.tsx
│   │   ├── PersonificationReview.tsx
│   │   └── SectionOptions.tsx
│   └── lib/
│       ├── types.ts              # All TypeScript interfaces
│       ├── prompts.ts            # Prompt loading
│       ├── claude.ts             # Anthropic API wrapper
│       └── file-parser.ts        # Document parsing
├── prompts/                      # JSON prompt configs
│   ├── triage.json
│   ├── budget.json
│   ├── objective.json
│   ├── creative-task.json
│   ├── audience.json
│   ├── human-truths.json
│   ├── creative-tenets.json
│   ├── media-strategy.json
│   ├── research-stimuli.json
│   └── output.json
└── docs/
    ├── DEVELOPMENT.md
    └── plans/
```

---

## 9. Patterns

### State Updates
```typescript
const updateState = (updates: Partial<SessionState>) => {
  setState((prev) => ({ ...prev, ...updates }));
};
```

### Async Operations
```typescript
updateState({ loading: true, error: null });
try {
  const response = await fetch(...);
  updateState({ loading: false, ...results });
} catch (err) {
  updateState({ loading: false, error: err.message });
}
```

### Defensive Data
```typescript
const items = Array.isArray(data) ? data : [];
```

---

## 10. Critical Refactoring Rules

From `DEVELOPMENT.md`:

1. **API contract = source of truth** — Update ALL consumers when changing routes
2. **Never trust Claude's output structure** — Defensive checks always
3. **Keep Claude output simple** — Transform to complex types in route
4. **Be explicit about JSON format** — "NOT numbered", "JSON array of strings"
5. **Update types.ts FIRST** — Everything else follows

---

## 11. Quick Reference

| What | Where |
|------|-------|
| Main state | `src/app/page.tsx` |
| Types | `src/lib/types.ts` |
| Prompts | `prompts/*.json` |
| Claude calls | `src/lib/claude.ts` |
| File parsing | `src/lib/file-parser.ts` |
| Components | `src/components/` |
| API routes | `src/app/api/` |
