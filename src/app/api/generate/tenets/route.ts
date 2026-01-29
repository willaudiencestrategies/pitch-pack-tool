// src/app/api/generate/tenets/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { callClaudeJSON } from '@/lib/claude';
import { loadPrompt, buildSystemPrompt } from '@/lib/prompts';
import { CreativeTenetsRequest, CreativeTenetsResponse } from '@/lib/types';

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
    const systemPrompt = buildSystemPrompt(promptConfig.generate);

    const userMessage = `INPUTS:
- Objective: ${objective}
- Audience: ${audience.name} - ${audience.needsValues}
- Demographics: ${audience.demographics}
- Selected Insights:
${insights.map((i, idx) => `  ${idx + 1}. ${i.text}`).join('\n')}
${additionalContext ? `- Additional Context: ${additionalContext}` : ''}
${brief ? `- Original Brief Context: ${brief.substring(0, 500)}...` : ''}

Generate 3-5 Creative Tenets as thought-starters. Return JSON with:
- "intro": 1-2 sentences connecting tenets to audience work
- "tenets": array of 3-5 tenet strings, each 10-25 words, provocative and action-oriented`;

    const response = await callClaudeJSON<{ intro: string; tenets: string[] }>(
      systemPrompt,
      userMessage,
      { endpoint: 'tenets:generate' }
    );

    // Defensive: ensure tenets is an array
    const tenets = Array.isArray(response.tenets)
      ? response.tenets.slice(0, 5) // Max 5 tenets
      : [String(response.tenets || 'No tenets generated')];

    // Clean up any numbered prefixes Claude might add
    const cleanTenets = tenets.map((t) =>
      typeof t === 'string' ? t.replace(/^\d+[\.\)]\s*/, '').trim() : String(t)
    );

    return NextResponse.json({
      intro: response.intro || 'Based on your confirmed audience and insights:',
      tenets: cleanTenets,
    } as CreativeTenetsResponse);
  } catch (error) {
    console.error('Creative tenets generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate creative tenets' },
      { status: 500 }
    );
  }
}
