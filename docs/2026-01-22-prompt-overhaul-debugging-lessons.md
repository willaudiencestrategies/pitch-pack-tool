# Prompt System Overhaul — Debugging Lessons

**Date:** 2026-01-22
**Context:** Major refactor of triage system, section builders, audience flow, and human truths generation.

---

## Summary

After completing a 22-task prompt system overhaul, the deployed app crashed with multiple errors. This document captures each error and the fix, to prevent repeating these mistakes in future refactors.

---

## Error 1: Railway Container SIGTERM

### Symptom
```
Stopping Container
npm error signal SIGTERM
```
Container started successfully ("Ready in 598ms") then immediately died.

### Root Cause
Railway's default healthcheck timeout (~30s) was shorter than Claude API calls (~60-70s for enhanced triage). Container appeared unhealthy and got killed.

### Fix
Created `railway.toml` with extended timeout:
```toml
[deploy]
healthcheckPath = "/"
healthcheckTimeout = 300
```

### Lesson
**When adding heavy API calls, always configure appropriate timeouts.** Enhanced prompts = longer responses = longer API calls.

---

## Error 2: API Response Type Mismatch

### Symptom
```
Cannot read properties of undefined (reading 'length')
```
App loaded, brief submitted, API returned success, then frontend crashed.

### Root Cause
Triage route was updated to return `EnhancedTriageResponse`:
```typescript
{ synthesizedReplay, triageAssessment, overallBriefHealth }
```

But frontend `handleTriage` still expected old `TriageResponse`:
```typescript
{ sections, summary }
```

Frontend tried to access `data.sections` which was undefined.

### Fix
Updated `handleTriage` to:
1. Use `EnhancedTriageResponse` type
2. Transform `triageAssessment` → `Section[]`

```typescript
const sections: Section[] = data.triageAssessment.map((result) => ({
  key: result.key,
  name: SECTION_CONFIG[result.key].name,
  status: result.status,
  content: result.synthesizedContent,
  feedback: result.whyThisRating,
  questions: result.questions,
}));
```

### Lesson
**When changing API response structure, update ALL consumers.** The route and frontend must agree on the contract. After changing any API route's return type:
1. Search for all usages of that endpoint
2. Update the types being used
3. Update any data transformations
4. Test the full flow, not just the API

---

## Error 3: Missing Defensive Checks

### Symptom
Same "Cannot read properties of undefined" error even after type fix.

### Root Cause
If Claude returns unexpected JSON structure (missing `triageAssessment` array), the code crashed when calling `.find()` or `.map()` on undefined.

### Fix
Added defensive checks in both route and frontend:

**Route:**
```typescript
const rawTriageAssessment = Array.isArray(response.triageAssessment)
  ? response.triageAssessment
  : [];
```

**Frontend:**
```typescript
const triageAssessment = Array.isArray(data.triageAssessment)
  ? data.triageAssessment
  : [];

if (sections.length === 0) {
  throw new Error('No sections returned from triage');
}
```

### Lesson
**Never trust Claude to return exactly the structure you expect.** Always:
1. Mark response types as optional (`triageAssessment?`)
2. Check `Array.isArray()` before iterating
3. Provide fallback empty arrays/objects
4. Throw clear errors when data is missing rather than crashing on undefined

---

## Error 4: Node.js Version Mismatch

### Symptom
```
You are using Node.js 18.20.5. For Next.js, Node.js version ">=20.9.0" is required.
```
Build failed on Railway.

### Root Cause
Next.js 16 requires Node.js 20+, but Railway defaulted to Node 18.

### Fix
Added Node version specification in three places:

**package.json:**
```json
"engines": {
  "node": ">=20.9.0"
}
```

**.nvmrc:**
```
20
```

**railway.toml:**
```toml
[build.nixpacks]
node_version = "20"
```

### Lesson
**Always specify Node.js version explicitly.** Don't rely on platform defaults. When upgrading frameworks (e.g., Next.js), check Node requirements.

---

## Error 5: Invalid JSON from Claude (Numbered Lists)

### Symptom
```
Failed to parse Claude response as JSON: { "truths": [ 1. "You've collected...", 2. "The best discoveries...
```
Truths generation crashed with JSON parse error.

### Root Cause
The prompt said:
```
"truths": "Array of exactly 12 truths, numbered 1-12, progressing from safer to bolder"
```

The phrase "numbered 1-12" made Claude output numbered list format (`1. "text"`) instead of valid JSON array (`["text"]`).

### Fix
1. Updated prompt to clarify format:
```json
"format": "JSON object with a 'truths' array containing exactly 12 string elements",
"truths": "Array of exactly 12 truth strings (NOT numbered - just the text)"
```

2. Added cleanup in route to strip any numbered prefixes:
```typescript
const cleanText = text.replace(/^\d+[\.\)]\s*/, '').trim();
```

3. Route transforms strings → full `Truth` objects (adding `id`, `level`).

### Lesson
**Be extremely explicit about JSON format in prompts.**
- Say "NOT numbered" if you don't want numbers
- Specify "JSON array of strings" not "list"
- Always add defensive cleanup for common Claude formatting quirks
- Transform simple Claude output into complex types in the route, don't ask Claude for complex structures

---

## Error 6: Type Definition vs Prompt Output Mismatch

### Symptom
Route expected `Truth[]` with `{ id, text, level }` but Claude returned `string[]`.

### Root Cause
Prompt asked for simple strings, but TypeScript type expected full objects.

### Fix
Route transforms the response:
```typescript
const truths: Truth[] = rawTruths.map((text, index) => {
  let level: 'safer' | 'sharper' | 'bolder';
  if (index < 4) level = 'safer';
  else if (index < 8) level = 'sharper';
  else level = 'bolder';

  return { id: index + 1, text: cleanText, level };
});
```

### Lesson
**Keep Claude's output simple, transform in code.** It's more reliable to:
1. Ask Claude for simple data (strings, basic objects)
2. Transform/enrich in your route (add IDs, computed fields, levels)

Than to ask Claude for complex nested structures with specific field names.

---

## Refactoring Checklist

Use this checklist when doing major refactors:

### Before Coding
- [ ] Document the API contract changes (old vs new response shapes)
- [ ] List all files that consume each changed API
- [ ] Check Node.js / framework version requirements

### API Routes
- [ ] Mark all response fields as optional in the type (`field?`)
- [ ] Add `Array.isArray()` checks before iterating
- [ ] Provide fallback values for missing data
- [ ] Log the raw response for debugging
- [ ] Keep Claude's output simple, transform in route

### Frontend
- [ ] Update types to match new API response
- [ ] Add defensive checks for undefined data
- [ ] Transform API response to UI-expected format explicitly
- [ ] Add clear error messages when data is missing

### Prompts
- [ ] Be explicit about JSON format ("JSON array of strings", "NOT numbered")
- [ ] Add cleanup code for common Claude quirks (numbered lists, markdown)
- [ ] Test prompts manually before integrating

### Deployment
- [ ] Specify Node.js version in package.json, .nvmrc, and railway.toml
- [ ] Configure appropriate timeouts for long-running API calls
- [ ] Test in production-like environment before deploying

### Testing
- [ ] Test the full user flow, not just individual endpoints
- [ ] Test with real briefs (Germany, Azerbaijan examples)
- [ ] Hard refresh browser to avoid cached JS issues

---

## Files Changed in This Debug Session

| File | Change |
|------|--------|
| `railway.toml` | Added with timeout config + Node version |
| `.nvmrc` | Created with Node 20 |
| `package.json` | Added engines.node |
| `src/app/page.tsx` | Transform EnhancedTriageResponse → Section[] |
| `src/app/api/triage/route.ts` | Defensive checks for undefined arrays |
| `src/app/api/generate/truths/route.ts` | Transform string[] → Truth[], cleanup numbered prefixes |
| `prompts/human-truths.json` | Clarified JSON format, removed "numbered" |

---

## Key Principle

> **The API route is the contract.** When you change what a route returns, you must update every consumer. When Claude's output might vary, transform it to a reliable shape in the route before sending to the frontend.
