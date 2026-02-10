// src/app/api/generate/tenets/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { callClaudeJSON } from '@/lib/claude';
import { loadPrompt, buildSystemPrompt } from '@/lib/prompts';
import { CreativeTenet, CreativeTenetsRequest, CreativeTenetsResponse } from '@/lib/types';
import { getBrandContextForPrompt } from '@/lib/brand-criteria';

export async function POST(request: NextRequest) {
  try {
    const body: CreativeTenetsRequest = await request.json();
    const { brief, objective, audience, insights, additionalContext } = body;

    // Validate required fields
    if (!objective || !audience || !insights || insights.length === 0) {
      return NextResponse.json(
        { error: 'objective, audience, and insights are required' },
        { status: 400 }
      );
    }

    const promptConfig = loadPrompt('creative-tenets');

    // Inject brand context if provided
    const brandContext = body.brandAlignment?.brand
      ? getBrandContextForPrompt(body.brandAlignment.brand)
      : '';

    // Replace {brandContext} placeholder in task
    const generateConfig = {
      ...promptConfig.generate,
      task: promptConfig.generate.task.replace('{brandContext}', brandContext),
    };

    const systemPrompt = buildSystemPrompt(generateConfig);

    const userMessage = `INPUTS:
- Objective: ${objective}
- Audience: ${audience.name} - ${audience.needsValues}
- Demographics: ${audience.demographics}
- Selected Insights:
${insights.map((i: any, idx: number) => `  ${idx + 1}. ${i.text}`).join('\n')}
${additionalContext ? `- Additional Context: ${additionalContext}` : ''}
${brief ? `- Original Brief Context: ${brief.substring(0, 500)}...` : ''}

Generate 3-4 Creative Tenets. Return JSON with:
- "intro": 1-2 sentences connecting tenets to audience work
- "tenets": array of 3-4 objects, each with:
  - "headline": bold 2-5 word headline
  - "explanation": array of 2-4 dot point strings
  - "differentiator": string explaining what makes this distinct`;

    const response = await callClaudeJSON<{ intro: string; tenets: CreativeTenet[] }>(
      systemPrompt,
      userMessage,
      { endpoint: 'tenets:generate' }
    );

    // Defensive: ensure tenets is an array of structured objects
    const tenets: CreativeTenet[] = (Array.isArray(response.tenets) ? response.tenets : [])
      .slice(0, 4) // Max 4 tenets
      .map((t: any) => ({
        headline: typeof t.headline === 'string' ? t.headline.replace(/^\d+[\.\)]\s*/, '').trim() : (typeof t === 'string' ? t : 'Untitled tenet'),
        explanation: Array.isArray(t.explanation)
          ? t.explanation.filter((e: any): e is string => typeof e === 'string' && e.trim().length > 0)
          : [typeof t.explanation === 'string' ? t.explanation : (typeof t === 'string' ? t : 'No explanation provided')],
        differentiator: typeof t.differentiator === 'string' ? t.differentiator.trim() : '',
      }));

    if (tenets.length === 0) {
      throw new Error('No valid tenets generated');
    }

    return NextResponse.json({
      intro: response.intro || 'Based on your confirmed audience and insights:',
      tenets,
    } as CreativeTenetsResponse);
  } catch (error) {
    console.error('Creative tenets generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate creative tenets' },
      { status: 500 }
    );
  }
}
