// src/app/api/triage/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { callClaudeJSON } from '@/lib/claude';
import { loadPrompt, buildSystemPrompt } from '@/lib/prompts';
import {
  EnhancedTriageResponse,
  TriageSectionResult,
  SynthesizedSection,
  SectionKey,
  SECTION_KEYS,
  Status,
} from '@/lib/types';

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
      synthesizedReplay?: Record<string, {
        content: string;
        contradictions: string[];
        vagueness: string[];
        quotes: string[];
      }>;
      triageAssessment?: Array<{
        key: string;
        status: 'green' | 'amber' | 'red';
        synthesizedContent: string;
        contradictions: string[];
        vagueness: string[];
        verbatimQuotes: string[];
        whyThisRating: string;
        whatNeeded?: string;
        realityCheck: string;
        questions: string[];
      }>;
      overallBriefHealth?: string;
    }>(systemPrompt, userMessage, { endpoint: 'triage' });

    // Defensive: ensure we have arrays even if Claude returns unexpected structure
    const rawSynthesizedReplay = response.synthesizedReplay || {};
    const rawTriageAssessment = Array.isArray(response.triageAssessment) ? response.triageAssessment : [];

    // Ensure all 8 sections are present in synthesizedReplay
    const synthesizedReplay: Record<SectionKey, SynthesizedSection> = {} as Record<SectionKey, SynthesizedSection>;
    for (const key of SECTION_KEYS) {
      const found = rawSynthesizedReplay[key];
      synthesizedReplay[key] = {
        content: found?.content || '',
        contradictions: found?.contradictions || [],
        vagueness: found?.vagueness || [],
        quotes: found?.quotes || [],
      };
    }

    // Ensure all 8 sections are present in triageAssessment
    const triageAssessment: TriageSectionResult[] = SECTION_KEYS.map((key) => {
      const found = rawTriageAssessment.find((s) => s.key === key);
      return {
        key,
        status: (found?.status || 'red') as Status,
        synthesizedContent: found?.synthesizedContent || '',
        contradictions: found?.contradictions || [],
        vagueness: found?.vagueness || [],
        verbatimQuotes: found?.verbatimQuotes || [],
        whyThisRating: found?.whyThisRating || 'Not assessed',
        whatNeeded: found?.whatNeeded,
        realityCheck: found?.realityCheck || '',
        questions: found?.questions || [],
      };
    });

    return NextResponse.json({
      synthesizedReplay,
      triageAssessment,
      overallBriefHealth: response.overallBriefHealth || '',
    } as EnhancedTriageResponse);
  } catch (error) {
    console.error('Triage error:', error);
    return NextResponse.json(
      { error: 'Failed to assess brief' },
      { status: 500 }
    );
  }
}
