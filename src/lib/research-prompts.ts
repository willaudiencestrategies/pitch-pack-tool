// Suggested prompts for users to run in their own LLM

export interface ResearchPrompt {
  id: string;
  title: string;
  prompt: string;
  forGaps: string[]; // Which section gaps this addresses
}

export const RESEARCH_PROMPTS: ResearchPrompt[] = [
  {
    id: 'audience_research',
    title: 'Audience Deep-Dive',
    prompt: `I'm working on a travel campaign targeting [AUDIENCE]. Help me understand:
1. What are their key travel motivations and pain points?
2. What makes them different from generic "travellers"?
3. What cultural or generational factors shape their travel choices?
4. What are 3-5 surprising or counterintuitive insights about this audience?`,
    forGaps: ['audience'],
  },
  {
    id: 'destination_context',
    title: 'Destination Context',
    prompt: `Tell me about [DESTINATION] from a travel marketing perspective:
1. What's the current perception vs reality?
2. What makes it unique compared to competing destinations?
3. What are emerging travel trends for this region?
4. What do travellers often get wrong about this place?`,
    forGaps: ['objective', 'creative_task'],
  },
  {
    id: 'competitor_landscape',
    title: 'Competitor Analysis',
    prompt: `Analyze the travel marketing landscape for [BRAND/DESTINATION]:
1. What are competitors doing well?
2. What gaps exist in how this destination/brand is marketed?
3. What creative approaches haven't been tried?
4. What would make a campaign stand out?`,
    forGaps: ['creative_task', 'objective'],
  },
  {
    id: 'budget_reality',
    title: 'Budget Reality Check',
    prompt: `I have a campaign budget of [AMOUNT] for [OBJECTIVE]. Help me understand:
1. Is this realistic for the stated goals?
2. What could we actually achieve with this budget?
3. What trade-offs should we consider?
4. What's a more realistic objective if budget is fixed?`,
    forGaps: ['budget', 'objective'],
  },
];

export function getSuggestedPrompts(gaps: string[]): ResearchPrompt[] {
  return RESEARCH_PROMPTS.filter((p) =>
    p.forGaps.some((g) => gaps.includes(g))
  );
}
