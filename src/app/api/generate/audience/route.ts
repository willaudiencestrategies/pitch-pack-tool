// src/app/api/generate/audience/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { callClaudeJSON } from '@/lib/claude';
import { loadPrompt, buildSystemPrompt } from '@/lib/prompts';
import { AudienceSegmentMenu, PersonificationResponse, AudienceSegment } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { brief, additionalContext, selectedSegment, feedback } = await request.json();

    if (!brief) {
      return NextResponse.json({ error: 'Brief is required' }, { status: 400 });
    }

    const promptConfig = loadPrompt('audience');

    if (selectedSegment) {
      // Step 2: Personify the selected segment
      if (!promptConfig.personify) {
        return NextResponse.json(
          { error: 'Personify prompt not configured' },
          { status: 500 }
        );
      }
      const systemPrompt = buildSystemPrompt(promptConfig.personify);

      const userMessage = `Brief:\n${brief}\n\nSelected segment:\nName: ${selectedSegment.name}\nNeeds & Values: ${selectedSegment.needsValues}\nDemographics: ${selectedSegment.demographics}\n\nPlease personify this segment.`;

      const response = await callClaudeJSON<PersonificationResponse>(
        systemPrompt,
        userMessage,
        { endpoint: 'audience:personify' }
      );

      return NextResponse.json(response);
    } else {
      // Step 1: Generate segment menu
      const systemPrompt = buildSystemPrompt(promptConfig.generate);

      let userMessage = `Brief:\n${brief}\n\n`;
      if (additionalContext) {
        userMessage += `Additional context:\n${additionalContext}\n\n`;
      }
      if (feedback) {
        userMessage += `User feedback on previous options:\n${feedback}\n\nPlease generate 5 NEW audience segments that address this feedback.\n\n`;
      } else {
        userMessage += `Please generate 5 audience segments.`;
      }

      const response = await callClaudeJSON<AudienceSegmentMenu>(
        systemPrompt,
        userMessage,
        { endpoint: 'audience:generate' }
      );

      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('Audience generation error:', error);
    return NextResponse.json(
      { error: 'Failed to process audience' },
      { status: 500 }
    );
  }
}
