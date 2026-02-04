# Prompts Guide

This folder contains all the AI prompts that power the Pitch Pack Tool. You can edit these directly on GitHub to change how the AI behaves.

---

## Quick Start

1. Click on any `.json` file
2. Click the pencil icon (top right) to edit
3. Make your changes
4. Click "Commit changes" (green button)
5. Wait ~2 minutes for Railway to deploy

**Important:** If GitHub shows a red error banner, your JSON syntax is broken. Fix it before committing.

---

## What Each File Does

| File | Purpose | When It Runs |
|------|---------|--------------|
| `triage.json` | Analyses the uploaded brief and scores each section | After brief upload |
| `budget.json` | Evaluates the budget section | Gate 1 |
| `objective.json` | Evaluates campaign objectives | Gate 1 |
| `creative-task.json` | Evaluates creative deliverables | Gate 1 |
| `audience.json` | Generates audience segments and personifications | Gate 1 |
| `brand-alignment.json` | Handles brand selection (Expedia/Hotels.com/Vrbo) | Gate 2 |
| `brand-fit.json` | Checks if brief matches brand's target audience | Gate 2 |
| `audience-insights.json` | Generates the 12 psychological insights | Gate 2 |
| `creative-tenets.json` | Generates creative principles | Gate 2 |
| `media-context.json` | Evaluates media strategy | Gate 2 |
| `research-stimuli.json` | Evaluates research/inspiration section | Appendix |
| `output.json` | Compiles the final output document | End |

---

## Prompt Structure Explained

Each prompt file has the same basic structure:

```json
{
  "section": "section_name",
  "displayName": "What Users See",

  "assess": { ... },    // How to score existing content
  "reassess": { ... },  // How to re-score after user adds info
  "generate": { ... }   // How to create new content (not all have this)
}
```

### Inside Each Block

| Field | What It Does | Example |
|-------|--------------|---------|
| `role` | Who the AI pretends to be | "You are a Brief Quality Specialist" |
| `task` | What the AI should do | "Evaluate the budget section for clarity" |
| `logic` | Rules for GREEN/AMBER/RED scoring | "GREEN: Clear budget with breakdown..." |
| `inputs` | What data the AI receives | brief, additionalContext |
| `outputs` | What format the AI returns | status, content, feedback |
| `examples` | Sample outputs to guide the AI | Optional |
| `escapeHatch` | What to do in edge cases | "If missing, recommend asking client" |

---

## Common Edits

### Change the scoring rules

Find the `logic` field and edit the GREEN/AMBER/RED criteria:

```json
"logic": "GREEN: Has specific measurable objective. AMBER: Has objective but vague. RED: No clear objective."
```

### Change the AI's persona

Edit the `role` field:

```json
"role": "You are a senior creative strategist with 20 years of experience in travel advertising."
```

### Change what the AI generates

Edit the `task` field in the `generate` block:

```json
"task": "Generate exactly 12 audience insights that reveal deeper motivations..."
```

### Add examples

Add to the `examples` array:

```json
"examples": [
  { "zone": "bolder", "insight": "Your example insight here." },
  { "zone": "safer", "insight": "Another example." }
]
```

---

## JSON Syntax Rules

**Must follow these or the tool breaks:**

1. **All text in double quotes** — Use `"text"` not `'text'`
2. **Commas between items** — But NO comma after the last item
3. **Curly braces must match** — Every `{` needs a `}`
4. **Square brackets for lists** — `["item1", "item2"]`
5. **No trailing commas** — `["a", "b"]` not `["a", "b",]`

### Valid Example
```json
{
  "name": "Example",
  "items": ["one", "two", "three"],
  "active": true
}
```

### Invalid Example (spot the errors)
```json
{
  'name': 'Example',      // Wrong quotes
  "items": ["one", "two",], // Trailing comma
  "active": true,         // Trailing comma
}
```

---

## Testing Your Changes

After committing:

1. Wait ~2 minutes for deploy
2. Go to https://pitch-pack-tool-production.up.railway.app
3. Upload a test brief
4. Check that your changes are reflected

If something breaks, you can revert on GitHub:
1. Go to the file
2. Click "History"
3. Find the previous version
4. Click "..." → "Revert"

---

## Key Files Deep Dive

### audience-insights.json

This generates the 12 psychological insights. Key sections:

- **Progression Architecture**: Insights 1-4 are bolder, 5-8 sharper, 9-12 safer
- **Length**: 10-20 words per insight
- **Language rules**: No demographics, no "they", speak to behaviour

### creative-tenets.json

Generates creative principles. The `{brandContext}` placeholder gets replaced with the selected brand's audience profile automatically.

### triage.json

The initial assessment uses a 5-persona panel approach. Each "expert" evaluates different aspects of the brief.

---

## Need Help?

If you break something or need a complex change, contact Will. Some changes require code updates, not just prompt edits.

---

**Last Updated:** 2026-02-05
