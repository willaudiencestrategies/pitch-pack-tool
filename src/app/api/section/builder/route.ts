// src/app/api/section/builder/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { callClaudeJSON } from '@/lib/claude';
import { loadPrompt, buildSystemPrompt } from '@/lib/prompts';
import { SectionOptionsResponse, SectionKey } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sectionKey, brief, previousSections, additionalContext } = body;

    if (!sectionKey || !brief) {
      return NextResponse.json(
        { error: 'sectionKey and brief are required' },
        { status: 400 }
      );
    }

    // Map section key to prompt file name (e.g., creative_task -> creative-task)
    const promptFileName = (sectionKey as string).replace('_', '-');
    const promptConfig = loadPrompt(promptFileName);

    if (!promptConfig.generate) {
      return NextResponse.json(
        { error: `Section ${sectionKey} does not support generation` },
        { status: 400 }
      );
    }

    const systemPrompt = buildSystemPrompt(promptConfig.generate);

    let userMessage = `Brief:\n${brief}\n\n`;

    if (previousSections) {
      userMessage += `Previous sections already finalized:\n${JSON.stringify(previousSections, null, 2)}\n\n`;
    }

    if (additionalContext) {
      userMessage += `Additional context:\n${additionalContext}\n\n`;
    }

    userMessage += `Please generate 4 options for the ${sectionKey} section, ranging from conservative (lifted directly) to bold (ruthless clarity).`;

    const response = await callClaudeJSON<SectionOptionsResponse>(
      systemPrompt,
      userMessage,
      { endpoint: `section:${sectionKey}:build` }
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error('Section builder error:', error);
    return NextResponse.json(
      { error: 'Failed to build section options' },
      { status: 500 }
    );
  }
}
