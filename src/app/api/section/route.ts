// src/app/api/section/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { callClaudeJSON } from '@/lib/claude';
import { loadPrompt, buildSystemPrompt } from '@/lib/prompts';
import { SectionRequest, SectionResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body: SectionRequest = await request.json();
    const { sectionKey, brief, currentContent, additionalContext, action } = body;

    // Map section key to prompt file name
    const promptFileName = sectionKey.replace('_', '-');
    const promptConfig = loadPrompt(promptFileName);

    const config = action === 'reassess' ? promptConfig.reassess : promptConfig.generate;
    const systemPrompt = buildSystemPrompt(config);

    let userMessage = `Brief:\n${brief}\n\n`;
    if (currentContent) {
      userMessage += `Current content for this section:\n${currentContent}\n\n`;
    }
    if (additionalContext) {
      userMessage += `Additional context from user:\n${additionalContext}\n\n`;
    }
    userMessage += `Please ${action} this section.`;

    const response = await callClaudeJSON<SectionResponse>(systemPrompt, userMessage);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Section error:', error);
    return NextResponse.json(
      { error: 'Failed to process section' },
      { status: 500 }
    );
  }
}
