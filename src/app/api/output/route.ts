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
    const { sections, audience, personification, selectedInsights, includeResearchStimuli, brandAlignment, budgetDetails } = body;

    // Filter out research_stimuli if not included
    const filteredSections = includeResearchStimuli
      ? sections
      : sections.filter(s => s.key !== 'research_stimuli');

    const promptConfig = loadPrompt('output');
    const systemPrompt = buildSystemPrompt(promptConfig.generate);

    let userMessage = 'Compile the final Brief Pack from these sections:\n\n';

    for (const section of filteredSections) {
      userMessage += `## ${section.name}\nStatus: ${section.status}\nContent: ${section.content || '(not provided)'}\n\n`;
    }

    if (audience) {
      // AudienceSegment carries needsValues (Segment's description is legacy)
      const description = (audience as { description?: string }).description || audience.needsValues || '';
      userMessage += `## Primary Audience\nName: ${audience.name}\nDescription: ${description}\n`;
      if (personification) {
        userMessage += `Personification: ${personification}\n`;
      }
      userMessage += '\n';
    }

    if (selectedInsights && selectedInsights.length > 0) {
      userMessage += `## Primary Audience Insights\n`;
      for (const insight of selectedInsights) {
        userMessage += `- ${insight.text}\n`;
      }
      userMessage += '\n';
    }

    if (budgetDetails && (budgetDetails.totalBudget || budgetDetails.productionBudget)) {
      userMessage += `## Confirmed Budget (typed by the CP — authoritative over any conflicting figures in the budget section text)\n`;
      userMessage += `Currency: ${budgetDetails.currency || 'USD'}\n`;
      if (budgetDetails.totalBudget) userMessage += `Total campaign budget: ${budgetDetails.totalBudget}\n`;
      if (budgetDetails.productionBudget) userMessage += `Production budget: ${budgetDetails.productionBudget}\n`;
      userMessage += '\n';
    }

    if (brandAlignment) {
      userMessage += `## Brand Alignment\n`;
      userMessage += `Brand: ${brandAlignment.brand || 'Not specified'}\n`;
      userMessage += `DG Match: ${brandAlignment.hasDGMatch ? 'Yes' : 'No'}\n`;
      if (brandAlignment.brandAudience) {
        userMessage += `Brand Audience: ${brandAlignment.brandAudience}\n`;
      }
      userMessage += '\n';
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
