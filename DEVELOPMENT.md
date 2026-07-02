# Pitch Pack Tool — Development Guide

Codebase-specific best practices, patterns, and reference.

---

## Critical: Refactoring Rules

**Read `docs/2026-01-22-prompt-overhaul-debugging-lessons.md` before any refactor.**

Key principles learned from debugging:

1. **API contract = source of truth** — When changing what a route returns, update ALL consumers (frontend handlers, types)
2. **Never trust Claude's output structure** — Always add defensive checks (`Array.isArray()`, optional chaining, fallbacks)
3. **Keep Claude output simple** — Ask for strings/basic objects, transform to complex types in the route
4. **Be explicit about JSON format in prompts** — Say "NOT numbered", "JSON array of strings", etc.
5. **Specify Node.js version** — In package.json, .nvmrc, AND railway.toml
6. **Configure timeouts for long API calls** — Enhanced prompts = longer responses = need longer timeouts

---

## Code Structure

```
pitch-pack-tool/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main UI — all steps in one component
│   │   ├── layout.tsx            # App shell
│   │   └── api/
│   │       ├── triage/route.ts   # Initial assessment (multi-persona)
│   │       ├── section/
│   │       │   ├── route.ts      # Section reassess/generate
│   │       │   └── builder/route.ts  # Four-option builder
│   │       └── generate/
│   │           ├── audience/     # Two-step: menu + personify
│   │           └── truths/       # 12 human truths (safer→bolder)
│   ├── components/
│   │   ├── FileUpload.tsx        # Drag-drop file upload
│   │   ├── SectionOptions.tsx    # Four-option selection UI
│   │   ├── AudienceMenu.tsx      # Segment selection + feedback
│   │   └── PersonificationReview.tsx
│   └── lib/
│       ├── types.ts              # All TypeScript interfaces
│       ├── file-parser.ts        # Word/md/txt parsing (mammoth.js)
│       ├── claude.ts             # Claude API wrapper (max_tokens: 16384)
│       └── prompts.ts            # Load prompts from JSON
├── prompts/                      # JSON prompt configs (editable)
│   └── [section].json            # Each has assess/reassess/generate
└── vitest.config.ts              # Test configuration
```

**Tests**: 47 total (11 type + 18 prompt + 6 integration + 12 file-parser)

---

## Patterns

### Four-Option Spectrum
All section builders return 4 options:
1. **Lifted Directly** — Verbatim from brief
2. **Light Edits** — Targeted clarity improvements
3. **Inspired Coherence** — Interpretation finding coherence
4. **Ruthless Clarity** — Bold strategic reframe

### Streamed Triage (NDJSON keep-alive)
`/api/triage` does NOT return plain JSON. It streams newline-delimited JSON via
`streamJsonResponse` (`src/lib/stream-response.ts`): an immediate heartbeat, then a
heartbeat every 10s, then one terminal `{type:'result',data}` or `{type:'error',message}`.
This keeps the connection alive through the ~60-90s Claude call so a proxy/edge can't
idle-kill it (the old 502/504 → "fail to load, retry"), and it surfaces the REAL error.
Consume it with `readJsonStream` (`src/lib/read-json-stream.ts`) — never `response.json()`.
The underlying call streams from Claude (`src/lib/claude.ts`) and guards `stop_reason ===
'max_tokens'`. If you add another long route, reuse the same two helpers.

### Two-Step Audience Flow
1. Generate 5-segment menu (snappy names + brief descriptions)
2. User picks/merges segments
3. Personify selected segment (150-300 word narrative)

### Multi-Persona Triage
5 expert personas working in concert:
- Strategic Planner — Feasibility, brief logic
- Creative Strategist — Creative potential
- Brief Architect — Structural coherence
- Behavioural Psychologist — Audience understanding
- Budget Realist — Resource/ambition alignment

---

## The Flow

```
1. Upload brief (file upload OR paste text)
   └─ Supports: Word (.docx), Markdown (.md), Text (.txt)
         ↓
2. Initial triage (traffic light per section)
         ↓
3. "Do you have anything else?" (before sections)
         ↓
4. Section-by-section:
   ├─ GREEN: Playback understanding → confirm → next
   ├─ AMBER: Gaps identified → "do you have more info?" → re-check
   └─ RED: Severely lacking → user provides or flags and continues
         ↓
5. Generation (for Audience/Human Truths when needed)
         ↓
6. Final Pitch Pack output (inline preview + copy/download)
```

---

## Human Truths Structure

Each truth contains (in one sentence, max 14 words):
1. A default behaviour/mindset being rejected
2. A contrasting behaviour/mindset being chosen
3. The payoff (emotional, intellectual, or social gain)
4. An implicit creative lever

**The spectrum (12 truths):**
- **Safer (1-4)**: Broad appeal, gentle contrast
- **Sharper (5-8)**: Clearer trade-offs, stronger perspective
- **Bolder (9-12)**: Provocative, potentially divisive

---

## Audience Generation Constraints

- **Personified, not quantified** — Rich descriptions of needs/values/motivations
- **5-option menu** — User picks/merges/revises
- **Snappy names** — 1-2 words max, stimulate interest
- **Avoid generic labels**: "Cultural Explorers", "Globe Trotters", "Adventure Seekers"
- **Banned words**: authentic, unique, unforgettable, hidden gem, off the beaten track, wanderlust, immerse, discover

---

## Test Expectations

**Germany brief** (`context/examples/germany-city-life-pitch-pack.txt`):
- Should pass most sections with GREEN
- Has psychographic personas, competitor analysis, specific asks
- The "good" example

**Azerbaijan brief** (`context/examples/azerbaijan-pitch-pack.txt`):
- Should flag multiple sections as AMBER/RED
- Generic positioning, demographics not personas
- The "bad" example

---

## Commands

```bash
npm run dev      # Start development server
npm test         # Run tests (Vitest)
npm run build    # Production build
```
