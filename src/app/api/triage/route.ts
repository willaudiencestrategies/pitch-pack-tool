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
  GATE1_SECTION_KEYS,
  LEGACY_SECTION_MAP,
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

    // Helper to map legacy section names to current names
    const mapLegacyKey = (key: string): SectionKey => {
      return (LEGACY_SECTION_MAP[key] || key) as SectionKey;
    };

    // Helper to find assessment by key (checking both current and legacy names)
    const findAssessment = (key: SectionKey) => {
      // First try direct match
      const direct = rawTriageAssessment.find((s) => mapLegacyKey(s.key) === key);
      if (direct) return direct;
      // Check if the key itself is a legacy name
      return rawTriageAssessment.find((s) => s.key === key);
    };

    // Build synthesizedReplay for all sections (needed for full response structure)
    const synthesizedReplay: Record<SectionKey, SynthesizedSection> = {} as Record<SectionKey, SynthesizedSection>;
    for (const key of SECTION_KEYS) {
      // Check both the current key and any legacy keys that map to it
      const found = rawSynthesizedReplay[key] ||
        Object.entries(LEGACY_SECTION_MAP).find(([legacy, current]) => current === key && rawSynthesizedReplay[legacy])?.[1];
      synthesizedReplay[key] = {
        content: found?.content || '',
        contradictions: found?.contradictions || [],
        vagueness: found?.vagueness || [],
        quotes: found?.quotes || [],
      };
    }

    // Build triageAssessment: Gate 1 sections with real assessments, Gate 2 with pending state
    const triageAssessment: TriageSectionResult[] = SECTION_KEYS.map((key) => {
      const isGate1 = (GATE1_SECTION_KEYS as readonly string[]).includes(key);

      if (isGate1) {
        // Gate 1: Use actual assessment from Claude
        const found = findAssessment(key);
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
      } else {
        // Gate 2 / Appendix: Initialise with pending state (not assessed in triage)
        return {
          key,
          status: 'red' as Status,
          synthesizedContent: '',
          contradictions: [],
          vagueness: [],
          verbatimQuotes: [],
          whyThisRating: 'Assessed in Gate 2',
          whatNeeded: undefined,
          realityCheck: '',
          questions: [],
        };
      }
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
