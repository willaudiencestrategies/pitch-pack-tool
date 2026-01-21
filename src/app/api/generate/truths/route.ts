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

    const response = await callClaudeJSON<{ truths: Truth[] }>(
      systemPrompt,
      userMessage,
      { endpoint: 'truths:generate' }
    );

    return NextResponse.json({ truths: response.truths } as TruthsResponse);
  } catch (error) {
    console.error('Truths generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate truths' },
      { status: 500 }
    );
  }
}
