// src/app/api/generate/truths/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { callClaudeJSON } from '@/lib/claude';
import { loadPrompt, buildSystemPrompt } from '@/lib/prompts';
import { TruthsRequest, TruthsResponse, Truth } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: TruthsRequest = await request.json();
    if (!body.audience || !body.personification) {
      return NextResponse.json({ error: 'audience and personification are required' }, { status: 400 });
    }
    const { audience, personification } = body;

    const promptConfig = loadPrompt('audience-insights');
    const systemPrompt = buildSystemPrompt(promptConfig.generate);

    const userMessage = `Audience segment:
Name: ${audience.name}
Description: ${audience.description}
Demographics: ${audience.demographics}

Personification:
${personification}

Generate 12 audience insights.`;

    const response = await callClaudeJSON<{ insights: string[] }>(
      systemPrompt,
      userMessage,
      { endpoint: 'truths:generate' }
    );

    // Transform string array into Truth objects with id and level
    const rawTruths = Array.isArray(response.insights) ? response.insights : [];
    const truths: Truth[] = rawTruths.map((text, index) => {
      // Clean up any numbered prefixes Claude might add (e.g., "1. ", "1) ")
      const cleanText = typeof text === 'string'
        ? text.replace(/^\d+[\.\)]\s*/, '').trim()
        : String(text);

      // Determine level based on position: 0-3 bolder, 4-7 sharper, 8-11 safer (BOLD FIRST)
      let level: 'safer' | 'sharper' | 'bolder';
      if (index < 4) level = 'bolder';
      else if (index < 8) level = 'sharper';
      else level = 'safer';

      return {
        id: index + 1,
        text: cleanText,
        level,
      };
    });

    return NextResponse.json({ truths } as TruthsResponse);
  } catch (error) {
    console.error('Truths generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate truths' },
      { status: 500 }
    );
  }
}
