// src/app/api/generate/audience/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { callClaudeJSON } from '@/lib/claude';
import { loadPrompt, buildSystemPrompt } from '@/lib/prompts';
import { AudienceRequest, AudienceResponse, Segment } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: AudienceRequest = await request.json();
    const { brief, additionalContext, selectedSegment } = body;

    const promptConfig = loadPrompt('audience');

    if (selectedSegment) {
      // Personification step
      const systemPrompt = `You are a Strategic Planner creating a detailed audience personification.

Expand the selected audience segment into a vivid, human sketch. Include:
- The type of traveller they are
- What they're trying to feel and get out of the experience
- Who they're travelling with
- What they prioritise and trade off
- What earns their trust
- What triggers scepticism
- The story they want to be able to tell afterwards

NOT an individual persona with dry profile ('Julie, 37, accountant').
A vivid TYPE of person - feel like you could meet them.

Respond with JSON: { "personification": "the detailed personification text" }`;

      const userMessage = `Segment to expand:
Name: ${selectedSegment.name}
Description: ${selectedSegment.description}
Demographics: ${selectedSegment.demographics}

Brief context:
${brief}

Additional context:
${additionalContext || 'None'}`;

      const response = await callClaudeJSON<{ personification: string }>(
        systemPrompt,
        userMessage
      );

      return NextResponse.json({ personification: response.personification });
    } else {
      // Generate 5 segments
      const systemPrompt = buildSystemPrompt(promptConfig.generate);

      const userMessage = `Brief:\n${brief}\n\nAdditional context:\n${additionalContext || 'None'}\n\nGenerate 5 audience segments.`;

      const response = await callClaudeJSON<{ segments: Segment[] }>(
        systemPrompt,
        userMessage
      );

      return NextResponse.json({ segments: response.segments });
    }
  } catch (error) {
    console.error('Audience generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate audience' },
      { status: 500 }
    );
  }
}
