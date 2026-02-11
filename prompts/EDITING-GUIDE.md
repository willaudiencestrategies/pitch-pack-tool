# Prompts Editing Guide

How to customise the AI prompts that power the Pitch Pack Tool.

## What Each File Controls

| File | Controls | When It Runs |
|------|----------|--------------|
| `triage.json` | Initial brief assessment — section ratings, gaps, feedback | After brief upload |
| `objective.json` | Objective section assessment and reassessment | When reviewing/editing Objective |
| `budget.json` | Budget section assessment and reassessment | When reviewing/editing Budget |
| `audience.json` | Audience segment generation and personification | Gate 2: Audience step |
| `audience-insights.json` | Audience insight/truth generation | Gate 2: Insights step |
| `creative-tenets.json` | Creative tenet generation (headline + dots + differentiator) | Gate 2: Tenets step |
| `creative-task.json` | Creative task assessment and reassessment | When reviewing/editing Creative Task |
| `media-context.json` | Media strategy/context assessment and reassessment | When reviewing/editing Media Context |
| `brand-alignment.json` | Brand selection assessment (which Expedia Group brand) | Brand selection step |
| `brand-fit.json` | Brand audience fit assessment (strong/moderate/weak) | Gate 2: Brand Fit step |
| `output.json` | Final Pitch Pack compilation | Export step |
| `research-stimuli.json` | Research stimuli assessment and generation | Research Stimuli step |

## JSON Structure

Each prompt file has this structure:

```json
{
  "section": "section_name",
  "displayName": "Human-Readable Name",
  "assess": {
    "role": "Who the AI is (e.g. 'You are an expert brief strategist')",
    "task": "What to do",
    "logic": "Detailed assessment criteria and rules",
    "examples": "Good/bad examples for calibration",
    "escapeHatch": "What to do if brief doesn't fit normal patterns",
    "inputs": "What data the AI receives",
    "outputs": "Expected JSON response format"
  },
  "reassess": { "..." },
  "generate": { "..." }
}
```

Most files have three operations:
- **`assess`** — Initial evaluation of what's in the brief
- **`reassess`** — Re-evaluation after the user adds context
- **`generate`** — AI creates new content (audience segments, tenets, etc.)

Some files only use one or two of these.

## How to Edit Safely

1. **Only change text** within the `role`, `task`, `logic`, `examples`, `escapeHatch` fields
2. **Don't change field names** — `role`, `task`, `logic`, `inputs`, `outputs` must stay exactly as-is
3. **Don't change JSON structure** — keep all quotes, commas, brackets intact
4. **Don't edit** `inputs` or `outputs` — these define the data contract with the code
5. **Don't change** `section` or `displayName` — the code uses these to find the right prompt

## Testing Changes

1. Run the tool locally: `npm run dev`
2. Open `http://localhost:3000`
3. Upload a test brief
4. Check if the output matches your expectations
5. If something breaks, revert your change and try again

## Common Edits

**Make objective assessment less strict:**
Edit `objective.json` > `assess` > `logic`. Find the GREEN/AMBER/RED criteria and adjust thresholds.

**Change triage feedback tone:**
Edit `triage.json` > `assess` > `logic`. Look for language around ratings and adjust wording.

**Add new examples to calibrate quality:**
Edit the `examples` field in any prompt. Add real brief excerpts showing what "good" looks like.

**Adjust brand fit strictness:**
Edit `brand-fit.json` > `assess` > `logic`. Modify what constitutes strong/moderate/weak alignment.

**Change audience segment style:**
Edit `audience.json` > `generate` > `logic`. Adjust naming principles or add/remove example segments.

**Tweak creative tenet quality bar:**
Edit `creative-tenets.json` > `generate` > `logic`. Modify what makes a strong tenet or adjust the differentiator test.

## Warning

Do NOT edit:
- `src/` files — these are code, not prompts
- `types.ts` — changing types will break the application
- API routes (`src/app/api/`) — these parse prompt responses
