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

    const promptConfig = loadPrompt('human-truths');
    const systemPrompt = buildSystemPrompt(promptConfig.generate);

    const userMessage = `Audience segment:
Name: ${audience.name}
Description: ${audience.description}
Demographics: ${audience.demographics}

Personification:
${personification}

Generate 12 human truths.`;

    const response = await callClaudeJSON<{ truths: string[] }>(
      systemPrompt,
      userMessage,
      { endpoint: 'truths:generate' }
    );

    // Transform string array into Truth objects with id and level
    const rawTruths = Array.isArray(response.truths) ? response.truths : [];
    const truths: Truth[] = rawTruths.map((text, index) => {
      // Clean up any numbered prefixes Claude might add (e.g., "1. ", "1) ")
      const cleanText = typeof text === 'string'
        ? text.replace(/^\d+[\.\)]\s*/, '').trim()
        : String(text);

      // Determine level based on position: 0-3 safer, 4-7 sharper, 8-11 bolder
      let level: 'safer' | 'sharper' | 'bolder';
      if (index < 4) level = 'safer';
      else if (index < 8) level = 'sharper';
      else level = 'bolder';

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
