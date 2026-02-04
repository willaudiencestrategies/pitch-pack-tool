# Brand Criteria Integration — Design Document

**Date:** 2026-02-04
**Status:** Ready for Implementation
**Version:** v1.5

---

## Overview

Integrate rich brand criteria (Expedia/Hotels.com/Vrbo audience definitions) into the Pitch Pack Tool. This enables:

1. **Better brand selection UX** — Rich cards showing target audience profiles
2. **AI-powered validation** — Warn when brief doesn't align with selected brand's audience
3. **Smarter AI prompts** — Brand context in Audience Insights and Creative Tenets generation

---

## Source Material

Brand criteria extracted from E Studio materials received 2026-02-04:
- `Brand Expedia Audience and markets.pptx`
- `Hotels.comBlueprint (1).pptx`
- `VRBOblueprint.pptx`

Reference document: `clients/expedia/brand-criteria.md`

---

## Design

### 1. Data Model

**New file: `src/lib/brand-criteria.ts`**

Single source of truth for brand criteria, replacing hardcoded `BRAND_INFO` in `BrandAlignment.tsx`.

```typescript
import { ExpediaBrand } from './types';

export interface BrandTargetAudience {
  name: string;           // "Quality Seekers"
  description: string;    // 2-3 sentence psychographic
  avgAge: number;
  percentOfTravelers: number;
  percentOfSpend: number;
  keyValues: string[];    // ["Control", "Intelligent tools", "Flexibility"]
}

export interface BrandPillar {
  name: string;
  description: string;
}

export interface BrandCriteria {
  key: ExpediaBrand;
  name: string;
  tagline: string;
  targetAudience: BrandTargetAudience;
  brandPillars: BrandPillar[];
  reasonsToBuy: string[];
}

export const BRAND_CRITERIA: Record<ExpediaBrand, BrandCriteria> = {
  expedia: {
    key: 'expedia',
    name: 'Expedia',
    tagline: 'Your co-Pilot for confident & in-control travel',
    targetAudience: {
      name: 'Quality Seekers',
      description: 'Savvy travel planners who value platforms that match their level of expertise. These professionals with high disposable income want flexible, smart tools that give them a sense of control, value, and confidence. They\'re not looking for an easy travel platform; they\'re looking for a powerful, seamless one.',
      avgAge: 43,
      percentOfTravelers: 17,
      percentOfSpend: 26,
      keyValues: ['Control', 'Intelligent tools', 'Flexibility', 'Rewards', 'Seamless experience'],
    },
    brandPillars: [
      { name: 'All-in-One Travel Shop', description: 'Bundle & Save, Flexible Add-On Benefits, Most Complete Marketplace' },
      { name: 'Intelligent Travel Tools', description: 'Price Tracking, Price Drop Protection, Property Compare' },
      { name: 'Rewarding Travel Partner', description: 'One Key Loyalty Rewards, Frequent Flyer Flexibility, 24/7 Support' },
    ],
    reasonsToBuy: ['Bundle & Save', 'Price Tracking', 'One Key Loyalty Rewards', '24/7 Support'],
  },
  hotels_com: {
    key: 'hotels_com',
    name: 'Hotels.com',
    tagline: 'Simply the Best Way to Hotel',
    targetAudience: {
      name: 'Savvy Trip Takers',
      description: 'Young professionals who travel frequently including leisure, business and bleisure. They need an OTA they can trust to provide a hassle-free experience and a variety of good value options. They take advantage of loyalty programs and choose destinations that will make their friends and followers jealous.',
      avgAge: 31,
      percentOfTravelers: 19,
      percentOfSpend: 20,
      keyValues: ['Simplicity', 'Flexibility', 'Rewards', 'Transparency', 'Value'],
    },
    brandPillars: [
      { name: 'Simple', description: 'Price Confidence Tools, Hotel Comparison, No Hidden Fees' },
      { name: 'Flexible', description: 'Free Cancellation, Flex Date Search, Payment Options' },
      { name: 'Rewards', description: '10:1 rewards, No Restrictions, Member Prices' },
    ],
    reasonsToBuy: ['Price Confidence Tools', 'Free Cancellation', '10:1 Rewards', 'Member Prices'],
  },
  vrbo: {
    key: 'vrbo',
    name: 'Vrbo',
    tagline: 'Travel is about connecting with loved ones',
    targetAudience: {
      name: 'Group Planners',
      description: 'Avid planners intent on organizing trips that please the whole family. Planning gives them peace of mind so they can relax and have a better time during the trip. They are value-driven and will actively research special offers and deals.',
      avgAge: 46,
      percentOfTravelers: 14,
      percentOfSpend: 13,
      keyValues: ['Family focus', 'Planning', 'Value', 'Togetherness', 'Experiences'],
    },
    brandPillars: [
      { name: 'Family-Focused', description: 'Whole-home rentals, Space for everyone, Kid-friendly options' },
      { name: 'Value-Driven', description: 'Package deals, Early booking savings, Group cost-sharing' },
      { name: 'Experience-Oriented', description: 'Activities for all ages, Memory-making, Destination variety' },
    ],
    reasonsToBuy: ['Whole-home rentals', 'Family-friendly', 'Group travel', 'Package deals'],
  },
};

// Helper to get brand context for prompts
export function getBrandContextForPrompt(brand: ExpediaBrand): string {
  const criteria = BRAND_CRITERIA[brand];
  const ta = criteria.targetAudience;

  return `This is a ${criteria.name} campaign targeting ${ta.name}.

${ta.description}

Key values this audience prioritises: ${ta.keyValues.join(', ')}

Brand pillars: ${criteria.brandPillars.map(p => p.name).join(', ')}`;
}
```

---

### 2. Brand Selection UI

**Updated: `src/components/BrandAlignment.tsx`**

Rich cards showing full audience profile. Uses `frontend-design` skill for implementation.

**Card layout:**

```
┌─────────────────────────────────────────────────────┐
│  ◉ Expedia                                          │
│                                                     │
│  "Your co-Pilot for confident travel"               │
│                                                     │
│  Target: Quality Seekers                            │
│  Savvy travel planners who want flexible, smart     │
│  tools that give them control, value, and           │
│  confidence.                                        │
│                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │ Age 43  │ │ 17%     │ │ 26%     │               │
│  │ avg     │ │travelers│ │ spend   │               │
│  └─────────┘ └─────────┘ └─────────┘               │
│                                                     │
│  They value: Control · Intelligent tools · Rewards  │
└─────────────────────────────────────────────────────┘
```

**Key changes:**
- Import from `brand-criteria.ts` instead of hardcoded `BRAND_INFO`
- Show demographic stats as pills
- Show key values as tags
- Display brand tagline

---

### 3. AI-Powered Brand Fit Assessment

**New API: `/api/brand-fit/route.ts`**

Triggered when user selects a brand. Compares brief content against brand's target audience.

**Request:**
```typescript
interface BrandFitRequest {
  brand: ExpediaBrand;
  briefAudienceContent: string;
  briefObjectiveContent: string;
}
```

**Response:**
```typescript
interface BrandFitResponse {
  fitLevel: 'strong' | 'moderate' | 'weak';
  reasoning: string;
  suggestion?: string;
  alternativeBrand?: ExpediaBrand;
}
```

**New prompt: `prompts/brand-fit.json`**

```json
{
  "section": "brand_fit",
  "displayName": "Brand Fit Assessment",

  "assess": {
    "role": "You are a brand strategist at Expedia Group assessing whether a campaign brief aligns with a specific brand's target audience.",
    "task": "Compare the brief's audience and objective against the brand's target audience profile. Determine fit level and provide reasoning.",
    "logic": "STRONG: Brief audience clearly matches brand target (psychographics, values, behaviours align). MODERATE: Some alignment but gaps or tensions exist. WEAK: Clear mismatch between brief audience and brand target.",
    "inputs": {
      "brand": "Selected brand key",
      "brandCriteria": "Full brand criteria object",
      "briefAudienceContent": "Audience section from brief triage",
      "briefObjectiveContent": "Objective section from brief triage"
    },
    "outputs": {
      "fitLevel": "strong/moderate/weak",
      "reasoning": "2-3 sentences explaining the assessment",
      "suggestion": "Only if moderate/weak - what to consider",
      "alternativeBrand": "Only if weak - which brand might be better fit"
    }
  }
}
```

**UI behaviour in BrandAlignment.tsx:**
- `strong`: Green checkmark, proceed enabled
- `moderate`: Amber warning with reasoning, checkbox to acknowledge
- `weak`: Red warning with suggestion + alternative, checkbox required

**Loading UX:**

Add to `loading-config.ts`:
```typescript
export const BRAND_FIT_STAGES: StageConfig[] = [
  { stage: 'checking_fit', message: 'Checking brand alignment', subMessage: 'Comparing audience to brand targets...', percent: 50, minDuration: 2000 },
  { stage: 'complete', message: 'Assessment ready', percent: 100, minDuration: 500 },
];
```

Add to `types.ts`:
```typescript
| 'checking_fit'  // Brand fit assessment stage
```

---

### 4. Brand Context in Prompts

**Updated: `prompts/audience-insights.json`**

Add brand context injection point:

```json
{
  "generate": {
    "role": "...",
    "task": "Generate psychological insights for the target audience.\n\n{brandContext}\n\nGenerate insights that resonate with this brand's target audience psychology.",
    ...
  }
}
```

**Updated: `prompts/creative-tenets.json`**

Same pattern — inject brand context so tenets ladder up to brand positioning.

**Updated API routes:**

`/api/generate/truths/route.ts`:
```typescript
import { getBrandContextForPrompt } from '@/lib/brand-criteria';

// In handler:
const brandContext = brandAlignment?.brand
  ? getBrandContextForPrompt(brandAlignment.brand)
  : '';

// Inject into prompt
const promptWithBrand = prompt.replace('{brandContext}', brandContext);
```

`/api/generate/tenets/route.ts`:
Same pattern.

---

### 5. Type Updates

**Updated: `src/lib/types.ts`**

```typescript
// Add to exports
export interface BrandFitRequest {
  brand: ExpediaBrand;
  briefAudienceContent: string;
  briefObjectiveContent: string;
}

export interface BrandFitResponse {
  fitLevel: 'strong' | 'moderate' | 'weak';
  reasoning: string;
  suggestion?: string;
  alternativeBrand?: ExpediaBrand;
}

// Add to LoadingStage union
| 'checking_fit'
```

---

## Files Changed

**New files:**
| File | Purpose |
|------|---------|
| `src/lib/brand-criteria.ts` | Brand criteria data + helper |
| `src/app/api/brand-fit/route.ts` | Fit assessment endpoint |
| `prompts/brand-fit.json` | Fit assessment prompt |

**Updated files:**
| File | Change |
|------|--------|
| `src/components/BrandAlignment.tsx` | Rich cards, fit assessment UI, loading |
| `src/lib/types.ts` | Add `BrandFitRequest`, `BrandFitResponse`, loading stage |
| `src/lib/loading-config.ts` | Add `BRAND_FIT_STAGES` |
| `prompts/audience-insights.json` | Add `{brandContext}` injection point |
| `prompts/creative-tenets.json` | Add `{brandContext}` injection point |
| `src/app/api/generate/truths/route.ts` | Inject brand context |
| `src/app/api/generate/tenets/route.ts` | Inject brand context |
| `src/app/page.tsx` | Wire up brand fit check, pass brand to routes |

---

## Implementation Notes

1. **MUST use `frontend-design` skill** for all UI work on `BrandAlignment.tsx`
2. **Git pull required** before starting — v1.4.1 changes need to be merged
3. **Test each brand** — Verify fit assessment works for Expedia, Hotels.com, and Vrbo
4. **Loading UX consistency** — Use same `LoadingProgress` pattern as triage/audience/insights

---

## Not In Scope

- Triage changes (brand not selected yet)
- Media Context prompt changes (tactical, not brand-driven)
- Output validation (user has already made decision by then)
- DG match rules (still waiting on E Studio)
- Coherence checking (still waiting on parameters)
