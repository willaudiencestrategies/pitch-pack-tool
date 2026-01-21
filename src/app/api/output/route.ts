// src/app/api/output/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { callClaudeJSON } from '@/lib/claude';
import { loadPrompt, buildSystemPrompt } from '@/lib/prompts';
import { OutputRequest, OutputResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: OutputRequest = await request.json();
    const { sections, audience, personification, selectedTruths } = body;

    const promptConfig = loadPrompt('output');
    const systemPrompt = buildSystemPrompt(promptConfig.generate);

    let userMessage = 'Compile the final Pitch Pack from these sections:\n\n';

    for (const section of sections) {
      userMessage += `## ${section.name}\nStatus: ${section.status}\nContent: ${section.content || '(not provided)'}\n\n`;
    }

    if (audience) {
      userMessage += `## Selected Audience\nName: ${audience.name}\nDescription: ${audience.description}\n`;
      if (personification) {
        userMessage += `Personification: ${personification}\n`;
      }
      userMessage += '\n';
    }

    if (selectedTruths && selectedTruths.length > 0) {
      userMessage += `## Selected Human Truths\n`;
      for (const truth of selectedTruths) {
        userMessage += `- ${truth.text}\n`;
      }
    }

    const response = await callClaudeJSON<{ markdown: string }>(
      systemPrompt,
      userMessage
    );

    return NextResponse.json({ markdown: response.markdown } as OutputResponse);
  } catch (error) {
    console.error('Output error:', error);
    return NextResponse.json(
      { error: 'Failed to compile output' },
      { status: 500 }
    );
  }
}
