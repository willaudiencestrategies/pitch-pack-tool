# Brand Criteria Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate rich brand criteria into the Pitch Pack Tool with AI-powered fit assessment and brand-aware prompt generation.

**Architecture:** New `brand-criteria.ts` as single source of truth, `/api/brand-fit` endpoint for AI assessment, brand context injection into Audience Insights and Creative Tenets prompts.

**Tech Stack:** Next.js, TypeScript, Anthropic Claude API, Tailwind CSS

**Design Document:** `docs/plans/2026-02-04-brand-criteria-integration.md`

---

## Pre-Implementation

### Task 0: Git Sync

**Step 1: Pull latest changes**

```bash
cd /Users/will.bainbridge/Desktop/alive/ventures/audience-strategies/clients/expedia/pitch-pack-tool
git pull origin main
```

Expected: v1.4.1 changes merged, no conflicts

**Step 2: Verify clean state**

```bash
git status
```

Expected: "nothing to commit, working tree clean"

---

## Theme A: Data Model (Tasks 1-2)

### Task 1: Add Types for Brand Fit

**Files:**
- Modify: `src/lib/types.ts`

**Step 1: Add BrandFitRequest and BrandFitResponse types**

Add after line ~270 (after `OutputResponse`):

```typescript
// Brand Fit Assessment
export interface BrandFitRequest {
  brand: ExpediaBrand;
  briefAudienceContent: string;
  briefObjectiveContent: string;
}

export type BrandFitLevel = 'strong' | 'moderate' | 'weak';

export interface BrandFitResponse {
  fitLevel: BrandFitLevel;
  reasoning: string;
  suggestion?: string;
  alternativeBrand?: ExpediaBrand;
}
```

**Step 2: Add loading stage**

Find the `LoadingStage` type union and add:

```typescript
  // Brand fit assessment stage
  | 'checking_fit'
```

**Step 3: Run type check**

```bash
npm run build
```

Expected: Build passes

**Step 4: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add BrandFitRequest, BrandFitResponse, checking_fit stage"
```

---

### Task 2: Create Brand Criteria Data Model

**Files:**
- Create: `src/lib/brand-criteria.ts`
- Test: `src/lib/__tests__/brand-criteria.test.ts`

**Step 1: Write failing test**

Create `src/lib/__tests__/brand-criteria.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { BRAND_CRITERIA, getBrandContextForPrompt } from '../brand-criteria';

describe('BRAND_CRITERIA', () => {
  it('should have all three brands defined', () => {
    expect(BRAND_CRITERIA.expedia).toBeDefined();
    expect(BRAND_CRITERIA.hotels_com).toBeDefined();
    expect(BRAND_CRITERIA.vrbo).toBeDefined();
  });

  it('should have required fields for each brand', () => {
    const brands = Object.values(BRAND_CRITERIA);
    brands.forEach((brand) => {
      expect(brand.name).toBeTruthy();
      expect(brand.tagline).toBeTruthy();
      expect(brand.targetAudience.name).toBeTruthy();
      expect(brand.targetAudience.description).toBeTruthy();
      expect(brand.targetAudience.avgAge).toBeGreaterThan(0);
      expect(brand.targetAudience.keyValues.length).toBeGreaterThan(0);
      expect(brand.brandPillars.length).toBeGreaterThan(0);
    });
  });
});

describe('getBrandContextForPrompt', () => {
  it('should return formatted context for Expedia', () => {
    const context = getBrandContextForPrompt('expedia');
    expect(context).toContain('Expedia');
    expect(context).toContain('Quality Seekers');
    expect(context).toContain('Control');
  });

  it('should return formatted context for Hotels.com', () => {
    const context = getBrandContextForPrompt('hotels_com');
    expect(context).toContain('Hotels.com');
    expect(context).toContain('Savvy Trip Takers');
  });

  it('should return formatted context for Vrbo', () => {
    const context = getBrandContextForPrompt('vrbo');
    expect(context).toContain('Vrbo');
    expect(context).toContain('Group Planners');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test src/lib/__tests__/brand-criteria.test.ts
```

Expected: FAIL - module not found

**Step 3: Create brand-criteria.ts**

Create `src/lib/brand-criteria.ts`:

```typescript
import { ExpediaBrand } from './types';

export interface BrandTargetAudience {
  name: string;
  description: string;
  avgAge: number;
  percentOfTravelers: number;
  percentOfSpend: number;
  keyValues: string[];
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
      description:
        "Savvy travel planners who value platforms that match their level of expertise. These professionals with high disposable income want flexible, smart tools that give them a sense of control, value, and confidence. They're not looking for an easy travel platform; they're looking for a powerful, seamless one.",
      avgAge: 43,
      percentOfTravelers: 17,
      percentOfSpend: 26,
      keyValues: ['Control', 'Intelligent tools', 'Flexibility', 'Rewards', 'Seamless experience'],
    },
    brandPillars: [
      {
        name: 'All-in-One Travel Shop',
        description: 'Bundle & Save, Flexible Add-On Benefits, Most Complete Marketplace',
      },
      {
        name: 'Intelligent Travel Tools',
        description: 'Price Tracking, Price Drop Protection, Property Compare',
      },
      {
        name: 'Rewarding Travel Partner',
        description: 'One Key Loyalty Rewards, Frequent Flyer Flexibility, 24/7 Support',
      },
    ],
    reasonsToBuy: ['Bundle & Save', 'Price Tracking', 'One Key Loyalty Rewards', '24/7 Support'],
  },
  hotels_com: {
    key: 'hotels_com',
    name: 'Hotels.com',
    tagline: 'Simply the Best Way to Hotel',
    targetAudience: {
      name: 'Savvy Trip Takers',
      description:
        'Young professionals who travel frequently including leisure, business and bleisure. They need an OTA they can trust to provide a hassle-free experience and a variety of good value options. They take advantage of loyalty programs and choose destinations that will make their friends and followers jealous.',
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
      description:
        'Avid planners intent on organizing trips that please the whole family. Planning gives them peace of mind so they can relax and have a better time during the trip. They are value-driven and will actively research special offers and deals.',
      avgAge: 46,
      percentOfTravelers: 14,
      percentOfSpend: 13,
      keyValues: ['Family focus', 'Planning', 'Value', 'Togetherness', 'Experiences'],
    },
    brandPillars: [
      {
        name: 'Family-Focused',
        description: 'Whole-home rentals, Space for everyone, Kid-friendly options',
      },
      {
        name: 'Value-Driven',
        description: 'Package deals, Early booking savings, Group cost-sharing',
      },
      {
        name: 'Experience-Oriented',
        description: 'Activities for all ages, Memory-making, Destination variety',
      },
    ],
    reasonsToBuy: ['Whole-home rentals', 'Family-friendly', 'Group travel', 'Package deals'],
  },
};

export function getBrandContextForPrompt(brand: ExpediaBrand): string {
  const criteria = BRAND_CRITERIA[brand];
  const ta = criteria.targetAudience;

  return `This is a ${criteria.name} campaign targeting ${ta.name}.

${ta.description}

Key values this audience prioritises: ${ta.keyValues.join(', ')}

Brand pillars: ${criteria.brandPillars.map((p) => p.name).join(', ')}`;
}
```

**Step 4: Run tests to verify pass**

```bash
npm test src/lib/__tests__/brand-criteria.test.ts
```

Expected: All 5 tests pass

**Step 5: Commit**

```bash
git add src/lib/brand-criteria.ts src/lib/__tests__/brand-criteria.test.ts
git commit -m "feat: add brand criteria data model with tests"
```

---

## Theme B: Brand Fit API (Tasks 3-5)

### Task 3: Add Loading Config for Brand Fit

**Files:**
- Modify: `src/lib/loading-config.ts`

**Step 1: Add BRAND_FIT_STAGES**

Add after the existing stage configs:

```typescript
export const BRAND_FIT_STAGES: StageConfig[] = [
  {
    stage: 'checking_fit',
    message: 'Checking brand alignment',
    subMessage: 'Comparing audience to brand targets...',
    percent: 50,
    minDuration: 2000,
  },
  { stage: 'complete', message: 'Assessment ready', percent: 100, minDuration: 500 },
];
```

**Step 2: Run type check**

```bash
npm run build
```

Expected: Build passes

**Step 3: Commit**

```bash
git add src/lib/loading-config.ts
git commit -m "feat: add BRAND_FIT_STAGES loading config"
```

---

### Task 4: Create Brand Fit Prompt

**Files:**
- Create: `prompts/brand-fit.json`

**Step 1: Create prompt file**

Create `prompts/brand-fit.json`:

```json
{
  "section": "brand_fit",
  "displayName": "Brand Fit Assessment",

  "assess": {
    "role": "You are a brand strategist at Expedia Group assessing whether a campaign brief aligns with a specific brand's target audience. You understand the distinct positioning of Expedia (Quality Seekers), Hotels.com (Savvy Trip Takers), and Vrbo (Group Planners).",

    "task": "Compare the brief's audience description and campaign objective against the selected brand's target audience profile. Determine how well the brief aligns with the brand's core audience.\n\nConsider:\n- Does the brief's target audience match the brand's psychographic profile?\n- Do the stated objectives align with what this brand's audience values?\n- Are there any tensions or mismatches that could weaken the campaign?",

    "logic": "STRONG: Brief audience clearly matches brand target - psychographics, values, and behaviours align well. The campaign would resonate with this brand's core audience.\n\nMODERATE: Some alignment exists but there are gaps or tensions. The brief might be trying to reach an audience segment that only partially overlaps with the brand's core target.\n\nWEAK: Clear mismatch between the brief's audience and the brand's target. A different Expedia Group brand might be more appropriate, or the audience framing needs significant adjustment.",

    "inputs": {
      "brand": "Selected brand key (expedia, hotels_com, or vrbo)",
      "brandCriteria": "Full brand criteria object including target audience profile",
      "briefAudienceContent": "The audience section content from the brief triage",
      "briefObjectiveContent": "The objective section content from the brief triage"
    },

    "outputs": {
      "fitLevel": "One of: strong, moderate, weak",
      "reasoning": "2-3 sentences explaining why this fit level was assigned. Be specific about what aligns or doesn't align.",
      "suggestion": "Only include if fitLevel is moderate or weak. Specific advice on what to consider - either adjusting the audience framing or considering a different brand.",
      "alternativeBrand": "Only include if fitLevel is weak. Which other Expedia Group brand might be a better fit (expedia, hotels_com, or vrbo)."
    },

    "examples": [
      {
        "input": {
          "brand": "expedia",
          "briefAudienceContent": "Budget-conscious backpackers looking for the cheapest flights and hostels",
          "briefObjectiveContent": "Drive bookings among price-sensitive young travellers"
        },
        "output": {
          "fitLevel": "weak",
          "reasoning": "Expedia targets Quality Seekers - premium travellers who value control and intelligent tools over price. Budget-conscious backpackers seeking the cheapest options represent the opposite end of the value spectrum.",
          "suggestion": "Consider whether Hotels.com might be more appropriate for value-focused messaging, or reframe the audience to emphasise smart value (getting more for your money) rather than cheapest price.",
          "alternativeBrand": "hotels_com"
        }
      },
      {
        "input": {
          "brand": "vrbo",
          "briefAudienceContent": "Solo business travellers needing quick hotel bookings near conference centres",
          "briefObjectiveContent": "Increase midweek business travel bookings"
        },
        "output": {
          "fitLevel": "weak",
          "reasoning": "Vrbo targets Group Planners - families and groups seeking whole-home rentals for shared experiences. Solo business travellers with quick-turnaround hotel needs are not aligned with Vrbo's family-focused, whole-home positioning.",
          "suggestion": "Hotels.com is specifically positioned for business travellers with its Unmanaged Business Traveller segment. Consider switching brands or pivoting to group business travel if Vrbo is required.",
          "alternativeBrand": "hotels_com"
        }
      }
    ],

    "escapeHatch": "If the brief lacks sufficient audience or objective detail to make a meaningful assessment, return fitLevel 'moderate' with reasoning explaining what information would help make a stronger assessment."
  }
}
```

**Step 2: Commit**

```bash
git add prompts/brand-fit.json
git commit -m "feat: add brand-fit prompt configuration"
```

---

### Task 5: Create Brand Fit API Route

**Files:**
- Create: `src/app/api/brand-fit/route.ts`

**Step 1: Create API route**

Create `src/app/api/brand-fit/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { loadPrompt } from '@/lib/prompts';
import { BrandFitRequest, BrandFitResponse, ExpediaBrand } from '@/lib/types';
import { BRAND_CRITERIA } from '@/lib/brand-criteria';

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const body: BrandFitRequest = await request.json();
    const { brand, briefAudienceContent, briefObjectiveContent } = body;

    if (!brand || !briefAudienceContent) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const promptConfig = await loadPrompt('brand-fit');
    const brandCriteria = BRAND_CRITERIA[brand];

    const systemPrompt = `${promptConfig.assess.role}\n\n${promptConfig.assess.task}\n\n${promptConfig.assess.logic}`;

    const userPrompt = `Assess the brand fit for this campaign:

SELECTED BRAND: ${brandCriteria.name}

BRAND TARGET AUDIENCE:
- Name: ${brandCriteria.targetAudience.name}
- Profile: ${brandCriteria.targetAudience.description}
- Key Values: ${brandCriteria.targetAudience.keyValues.join(', ')}
- Avg Age: ${brandCriteria.targetAudience.avgAge}

BRIEF AUDIENCE SECTION:
${briefAudienceContent || 'Not provided'}

BRIEF OBJECTIVE SECTION:
${briefObjectiveContent || 'Not provided'}

Respond with a JSON object containing:
- fitLevel: "strong" | "moderate" | "weak"
- reasoning: string (2-3 sentences)
- suggestion: string (only if moderate/weak)
- alternativeBrand: "expedia" | "hotels_com" | "vrbo" (only if weak)`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Extract JSON from response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result: BrandFitResponse = JSON.parse(jsonMatch[0]);

    // Validate response structure
    if (!['strong', 'moderate', 'weak'].includes(result.fitLevel)) {
      result.fitLevel = 'moderate'; // Default fallback
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Brand fit assessment error:', error);
    return NextResponse.json(
      { error: 'Failed to assess brand fit', details: String(error) },
      { status: 500 }
    );
  }
}
```

**Step 2: Run build to verify**

```bash
npm run build
```

Expected: Build passes

**Step 3: Commit**

```bash
git add src/app/api/brand-fit/route.ts
git commit -m "feat: add /api/brand-fit endpoint for AI-powered fit assessment"
```

---

## Theme C: Brand Selection UI (Tasks 6-7)

### Task 6: Update BrandAlignment Component - Data

**Files:**
- Modify: `src/components/BrandAlignment.tsx`

**Step 1: Update imports and remove hardcoded data**

Replace the imports and BRAND_INFO at the top of the file:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { BrandAlignment as BrandAlignmentType, ExpediaBrand, BrandFitResponse } from '@/lib/types';
import { BRAND_CRITERIA, BrandCriteria } from '@/lib/brand-criteria';
import { BRAND_FIT_STAGES } from '@/lib/loading-config';
import { useLoadingProgress } from '@/hooks/useLoadingProgress';
import { LoadingProgress } from './LoadingProgress';

const BRANDS: ExpediaBrand[] = ['expedia', 'hotels_com', 'vrbo'];
```

**Step 2: Remove the old BRAND_INFO constant**

Delete the entire `BRAND_INFO` object (approximately lines 12-28 in the original file).

**Step 3: Update props interface**

```typescript
interface BrandAlignmentProps {
  onConfirm: (alignment: BrandAlignmentType) => void;
  onBack: () => void;
  initialValue?: BrandAlignmentType | null;
  briefAudienceContent?: string;
  briefObjectiveContent?: string;
}
```

**Step 4: Commit partial progress**

```bash
git add src/components/BrandAlignment.tsx
git commit -m "refactor(BrandAlignment): switch to brand-criteria.ts data source"
```

---

### Task 7: Update BrandAlignment Component - UI & Fit Assessment

**REQUIRED:** Use `frontend-design` skill for this task.

**Files:**
- Modify: `src/components/BrandAlignment.tsx`

**Step 1: Add state and fit check logic**

Inside the component, replace existing state with:

```typescript
export function BrandAlignment({
  onConfirm,
  onBack,
  initialValue,
  briefAudienceContent,
  briefObjectiveContent,
}: BrandAlignmentProps) {
  const [selectedBrand, setSelectedBrand] = useState<ExpediaBrand | null>(
    initialValue?.brand ?? null
  );
  const [hasDGMatch, setHasDGMatch] = useState(initialValue?.hasDGMatch ?? false);
  const [fitResult, setFitResult] = useState<BrandFitResponse | null>(null);
  const [fitAcknowledged, setFitAcknowledged] = useState(false);
  const [isCheckingFit, setIsCheckingFit] = useState(false);

  const fitProgress = useLoadingProgress(BRAND_FIT_STAGES);

  // Check brand fit when selection changes
  useEffect(() => {
    if (selectedBrand && briefAudienceContent) {
      checkBrandFit(selectedBrand);
    } else {
      setFitResult(null);
      setFitAcknowledged(false);
    }
  }, [selectedBrand]);

  const checkBrandFit = async (brand: ExpediaBrand) => {
    setIsCheckingFit(true);
    setFitResult(null);
    setFitAcknowledged(false);
    fitProgress.runSimulatedProgress();

    try {
      const response = await fetch('/api/brand-fit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand,
          briefAudienceContent: briefAudienceContent || '',
          briefObjectiveContent: briefObjectiveContent || '',
        }),
      });

      if (!response.ok) throw new Error('Fit check failed');

      const result: BrandFitResponse = await response.json();
      setFitResult(result);
      fitProgress.complete();

      // Auto-acknowledge if strong fit
      if (result.fitLevel === 'strong') {
        setFitAcknowledged(true);
      }
    } catch (error) {
      console.error('Brand fit check error:', error);
      fitProgress.reset();
      // Allow proceeding even if check fails
      setFitAcknowledged(true);
    } finally {
      setIsCheckingFit(false);
    }
  };

  const canProceed = selectedBrand && (fitAcknowledged || !fitResult);

  const handleConfirm = () => {
    if (!selectedBrand || !canProceed) return;
    onConfirm({
      brand: selectedBrand,
      hasDGMatch,
      brandAudience: BRAND_CRITERIA[selectedBrand].targetAudience.name,
    });
  };
```

**Step 2: Create rich brand card renderer**

Add this function inside the component:

```typescript
  const renderBrandCard = (brandKey: ExpediaBrand) => {
    const brand = BRAND_CRITERIA[brandKey];
    const isSelected = selectedBrand === brandKey;
    const ta = brand.targetAudience;

    return (
      <div
        key={brandKey}
        onClick={() => setSelectedBrand(brandKey)}
        className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${
          isSelected
            ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]/5 shadow-md'
            : 'border-[var(--border-color)] hover:border-[var(--expedia-navy)]/50 hover:shadow-sm'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Radio indicator */}
          <div className="pt-0.5">
            <div
              className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                isSelected
                  ? 'border-[var(--expedia-navy)] bg-[var(--expedia-navy)]'
                  : 'border-[var(--border-color)]'
              }`}
            >
              {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3
              className={`font-semibold text-lg mb-1 ${
                isSelected ? 'text-[var(--expedia-navy)]' : 'text-[var(--text-primary)]'
              }`}
            >
              {brand.name}
            </h3>
            <p className="text-sm text-[var(--text-muted)] italic mb-3">"{brand.tagline}"</p>

            {/* Target Audience */}
            <div className="mb-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--expedia-navy)]">
                Target: {ta.name}
              </span>
              <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">
                {ta.description}
              </p>
            </div>

            {/* Stats Pills */}
            <div className="flex gap-2 mb-3">
              <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                Age {ta.avgAge} avg
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                {ta.percentOfTravelers}% travelers
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                {ta.percentOfSpend}% spend
              </span>
            </div>

            {/* Key Values */}
            <div className="flex flex-wrap gap-1.5">
              {ta.keyValues.slice(0, 4).map((value) => (
                <span
                  key={value}
                  className="text-xs px-2 py-0.5 rounded bg-[var(--expedia-navy)]/10 text-[var(--expedia-navy)]"
                >
                  {value}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };
```

**Step 3: Create fit result renderer**

Add this function inside the component:

```typescript
  const renderFitResult = () => {
    if (isCheckingFit && fitProgress.isActive) {
      return (
        <div className="mt-4 p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
          <LoadingProgress
            stages={BRAND_FIT_STAGES}
            currentStageIndex={fitProgress.currentStageIndex}
            showTips={false}
          />
        </div>
      );
    }

    if (!fitResult) return null;

    const fitStyles = {
      strong: {
        border: 'border-green-500',
        bg: 'bg-green-50',
        icon: '✓',
        iconBg: 'bg-green-500',
        title: 'Strong Alignment',
      },
      moderate: {
        border: 'border-amber-500',
        bg: 'bg-amber-50',
        icon: '!',
        iconBg: 'bg-amber-500',
        title: 'Moderate Alignment',
      },
      weak: {
        border: 'border-red-500',
        bg: 'bg-red-50',
        icon: '✗',
        iconBg: 'bg-red-500',
        title: 'Weak Alignment',
      },
    };

    const style = fitStyles[fitResult.fitLevel];

    return (
      <div className={`mt-4 p-4 rounded-lg border-2 ${style.border} ${style.bg}`}>
        <div className="flex items-start gap-3">
          <div
            className={`h-6 w-6 rounded-full ${style.iconBg} text-white flex items-center justify-center text-sm font-bold flex-shrink-0`}
          >
            {style.icon}
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-[var(--text-primary)]">{style.title}</h4>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{fitResult.reasoning}</p>

            {fitResult.suggestion && (
              <p className="text-sm text-[var(--text-muted)] mt-2 italic">{fitResult.suggestion}</p>
            )}

            {fitResult.alternativeBrand && (
              <p className="text-sm mt-2">
                <span className="text-[var(--text-muted)]">Consider: </span>
                <button
                  onClick={() => setSelectedBrand(fitResult.alternativeBrand!)}
                  className="text-[var(--expedia-navy)] font-medium hover:underline"
                >
                  {BRAND_CRITERIA[fitResult.alternativeBrand].name}
                </button>
              </p>
            )}

            {fitResult.fitLevel !== 'strong' && (
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fitAcknowledged}
                  onChange={(e) => setFitAcknowledged(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border-color)] accent-[var(--expedia-navy)]"
                />
                <span className="text-sm text-[var(--text-primary)]">
                  I've considered this and want to proceed
                </span>
              </label>
            )}
          </div>
        </div>
      </div>
    );
  };
```

**Step 4: Update the return JSX**

Replace the entire return statement:

```typescript
  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 mb-4"
      >
        ← Back
      </button>

      <div className="text-center pb-6 border-b border-[var(--border-color)]">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Brand Alignment</h2>
        <p className="text-[var(--text-secondary)]">
          Select which Expedia Group brand this campaign is for.
        </p>
      </div>

      {/* Brand Selection Cards */}
      <div className="space-y-3">{BRANDS.map(renderBrandCard)}</div>

      {/* Fit Assessment Result */}
      {selectedBrand && renderFitResult()}

      {/* DG Match Checkbox */}
      <div className="pt-4 border-t border-[var(--border-color)]">
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="pt-0.5">
            <input
              type="checkbox"
              checked={hasDGMatch}
              onChange={(e) => setHasDGMatch(e.target.checked)}
              className="h-5 w-5 rounded border-[var(--border-color)] accent-[var(--expedia-navy)] cursor-pointer"
            />
          </div>
          <div>
            <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--expedia-navy)] transition-colors">
              DG Match / Co-investment
            </span>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Check this if the campaign includes destination group matching or co-investment
              funding.
            </p>
          </div>
        </label>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-[var(--border-color)] flex gap-3">
        <button
          onClick={handleConfirm}
          disabled={!canProceed || isCheckingFit}
          className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
          <span>→</span>
        </button>
        <button onClick={onBack} className="btn-outline">
          ← Back
        </button>
      </div>
    </div>
  );
}
```

**Step 5: Run build**

```bash
npm run build
```

Expected: Build passes

**Step 6: Commit**

```bash
git add src/components/BrandAlignment.tsx
git commit -m "feat(BrandAlignment): rich cards with AI-powered fit assessment"
```

---

## Theme D: Wire Up Page & Prompts (Tasks 8-11)

### Task 8: Update page.tsx to Pass Brief Content to BrandAlignment

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Find the BrandAlignment usage**

Search for `<BrandAlignment` in page.tsx and update the props:

```typescript
<BrandAlignment
  onConfirm={handleBrandConfirm}
  onBack={() => updateState({ step: 'gate_transition' })}
  initialValue={state.brandAlignment}
  briefAudienceContent={
    state.triageResult?.triageAssessment.find((s) => s.key === 'audience')?.synthesizedContent || ''
  }
  briefObjectiveContent={
    state.triageResult?.triageAssessment.find((s) => s.key === 'objective')?.synthesizedContent || ''
  }
/>
```

**Step 2: Run build**

```bash
npm run build
```

Expected: Build passes

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(page): pass brief content to BrandAlignment for fit check"
```

---

### Task 9: Update Audience Insights Prompt

**Files:**
- Modify: `prompts/audience-insights.json`

**Step 1: Add brand context placeholder**

In the `generate` section, update the task field to include `{brandContext}`:

Find the `"generate"` section and update the `"task"` field. Add after the main task description:

```json
"task": "Generate 12 psychological insights about the target audience that could inform creative work. These should be human truths that resonate emotionally and could inspire breakthrough creative.\n\n{brandContext}\n\nEnsure insights feel authentic to this specific brand's target audience, not generic travellers."
```

**Step 2: Commit**

```bash
git add prompts/audience-insights.json
git commit -m "feat(prompts): add brand context injection to audience-insights"
```

---

### Task 10: Update Creative Tenets Prompt

**Files:**
- Modify: `prompts/creative-tenets.json`

**Step 1: Add brand context placeholder**

In the `generate` section, update the task field:

```json
"task": "Generate 3-5 creative tenets that will guide the creative development for this campaign. Tenets should be specific, actionable principles that help creatives make decisions.\n\n{brandContext}\n\nTenets should ladder up to this brand's positioning and resonate with its target audience."
```

**Step 2: Commit**

```bash
git add prompts/creative-tenets.json
git commit -m "feat(prompts): add brand context injection to creative-tenets"
```

---

### Task 11: Update API Routes to Inject Brand Context

**Files:**
- Modify: `src/app/api/generate/truths/route.ts`
- Modify: `src/app/api/generate/tenets/route.ts`

**Step 1: Update truths route**

Add import at top:

```typescript
import { getBrandContextForPrompt } from '@/lib/brand-criteria';
```

In the handler, after loading the prompt and before constructing the message, add:

```typescript
// Inject brand context if provided
const brandContext = body.brandAlignment?.brand
  ? getBrandContextForPrompt(body.brandAlignment.brand)
  : '';

// Replace placeholder in task
const taskWithBrand = promptConfig.generate.task.replace('{brandContext}', brandContext);
```

Update the system prompt construction to use `taskWithBrand`.

**Step 2: Update tenets route**

Same pattern - add import and inject brand context.

**Step 3: Run build**

```bash
npm run build
```

Expected: Build passes

**Step 4: Commit**

```bash
git add src/app/api/generate/truths/route.ts src/app/api/generate/tenets/route.ts
git commit -m "feat(api): inject brand context into truths and tenets generation"
```

---

## Theme E: Testing & Deploy (Tasks 12-13)

### Task 12: Manual Testing

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Test flow with Expedia**

1. Upload a brief with clear premium/quality-focused audience
2. Complete Gate 1
3. Select Expedia brand
4. Verify fit assessment shows "Strong Alignment"
5. Complete audience insights - verify they reference Quality Seekers values
6. Complete creative tenets - verify brand alignment

**Step 3: Test flow with mismatched brand**

1. Upload a brief with budget-focused/backpacker audience
2. Select Expedia brand
3. Verify fit assessment shows "Weak Alignment" with suggestion
4. Test the "Consider: Hotels.com" link
5. Verify acknowledgment checkbox required to proceed

**Step 4: Test each brand**

Repeat basic flow for Hotels.com and Vrbo to verify data displays correctly.

---

### Task 13: Run Full Test Suite & Deploy

**Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass

**Step 2: Build for production**

```bash
npm run build
```

Expected: Build succeeds

**Step 3: Deploy**

```bash
git push origin main
```

Railway auto-deploys from main.

**Step 4: Verify production**

Visit https://pitch-pack-tool-production.up.railway.app and run through brand selection flow.

**Step 5: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "chore: v1.5 brand criteria integration complete"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 0 | Git sync | - |
| 1 | Add types | types.ts |
| 2 | Brand criteria data | brand-criteria.ts |
| 3 | Loading config | loading-config.ts |
| 4 | Brand fit prompt | brand-fit.json |
| 5 | Brand fit API | api/brand-fit/route.ts |
| 6 | BrandAlignment data update | BrandAlignment.tsx |
| 7 | BrandAlignment UI + fit (**use frontend-design**) | BrandAlignment.tsx |
| 8 | Wire up page.tsx | page.tsx |
| 9 | Audience insights prompt | audience-insights.json |
| 10 | Creative tenets prompt | creative-tenets.json |
| 11 | API route injection | truths/route.ts, tenets/route.ts |
| 12 | Manual testing | - |
| 13 | Deploy | - |

**Total: 13 tasks**

**Skills required:**
- Task 7: `frontend-design` (MANDATORY)
