// src/app/api/triage/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { callClaudeJSON } from '@/lib/claude';
import { loadPrompt, buildSystemPrompt } from '@/lib/prompts';
import { TriageResponse, Section, SECTION_KEYS, SECTION_CONFIG } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { brief } = await request.json();

    if (!brief || typeof brief !== 'string') {
      return NextResponse.json({ error: 'Brief is required' }, { status: 400 });
    }

    const promptConfig = loadPrompt('triage');
    const systemPrompt = buildSystemPrompt(promptConfig.assess);

    const userMessage = `Please assess this brief:\n\n${brief}`;

    const response = await callClaudeJSON<{
      sections: Array<{
        key: string;
        status: 'green' | 'amber' | 'red';
        content: string;
        feedback: string;
      }>;
      summary: string;
    }>(systemPrompt, userMessage);

    // Ensure all 7 sections are present
    const sections: Section[] = SECTION_KEYS.map((key) => {
      const found = response.sections.find((s) => s.key === key);
      return {
        key,
        name: SECTION_CONFIG[key].name,
        status: found?.status || 'red',
        content: found?.content || '',
        feedback: found?.feedback || 'Not assessed',
      };
    });

    return NextResponse.json({
      sections,
      summary: response.summary,
    } as TriageResponse);
  } catch (error) {
    console.error('Triage error:', error);
    return NextResponse.json(
      { error: 'Failed to assess brief' },
      { status: 500 }
    );
  }
}
