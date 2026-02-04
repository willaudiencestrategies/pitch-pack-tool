import { NextRequest, NextResponse } from 'next/server';
import { callClaudeJSON } from '@/lib/claude';
import { loadPrompt, buildSystemPrompt } from '@/lib/prompts';
import { BrandFitRequest, BrandFitResponse } from '@/lib/types';
import { BRAND_CRITERIA } from '@/lib/brand-criteria';

export async function POST(request: NextRequest) {
  try {
    const body: BrandFitRequest = await request.json();
    const { brand, briefAudienceContent, briefObjectiveContent } = body;

    if (!brand || !briefAudienceContent) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const promptConfig = loadPrompt('brand-fit');
    const brandCriteria = BRAND_CRITERIA[brand];
    const systemPrompt = buildSystemPrompt(promptConfig.assess);

    const userMessage = `Assess the brand fit for this campaign:

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

    const result = await callClaudeJSON<BrandFitResponse>(
      systemPrompt,
      userMessage,
      { endpoint: 'brand-fit:assess' }
    );

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
