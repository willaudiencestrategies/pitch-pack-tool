// src/app/api/output/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { callClaudeJSON } from '@/lib/claude';
import { loadPrompt, buildSystemPrompt } from '@/lib/prompts';
import { OutputRequest, OutputResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: OutputRequest = await request.json();
    if (!body.sections || !Array.isArray(body.sections)) {
      return NextResponse.json({ error: 'sections array is required' }, { status: 400 });
    }
    const { sections, audience, personification, selectedInsights } = body;

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

    if (selectedInsights && selectedInsights.length > 0) {
      userMessage += `## Selected Audience Insights\n`;
      for (const insight of selectedInsights) {
        userMessage += `- ${insight.text}\n`;
      }
    }

    const response = await callClaudeJSON<{ markdown: string }>(
      systemPrompt,
      userMessage,
      { endpoint: 'output' }
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
