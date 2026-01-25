// src/app/api/generate/audience/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { callClaudeJSON } from '@/lib/claude';
import { loadPrompt, buildSystemPrompt } from '@/lib/prompts';
import { AudienceSegmentMenu, PersonificationResponse, AudienceSegment } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { brief, additionalContext, selectedSegment, feedback, isMerged } = await request.json();

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

      // Build user message - adjust for merged segments
      let userMessage = `Brief:\n${brief}\n\nSelected segment:\nName: ${selectedSegment.name}\nNeeds & Values: ${selectedSegment.needsValues}\nDemographics: ${selectedSegment.demographics}\n\n`;

      if (isMerged) {
        userMessage += `IMPORTANT: This is a UNIFIED profile created by merging multiple audience segments. The user has selected these segments because they see overlap or complementary aspects. Your task is to:\n1. Find the common threads that unite these segments\n2. Identify any interesting tensions between them that could fuel creative work\n3. Create a single, coherent personification that captures the essence of this combined audience\n4. Don't treat this as multiple people - synthesize into one rich, nuanced persona\n\n`;
      }

      userMessage += `Please personify this segment.`;

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
