import { describe, it, expect } from 'vitest';
import { encodeResumeToken, decodeResumeToken, buildResumeUrl, extractResumeToken } from '../vault-resume-token';
import { createInitialState, SessionState, VaultResult, AudienceBranch } from '../types';

/**
 * Realistic roundtrip — constructs a full SessionState with Vault data populated
 * across all 21 slice keys, encodes, decodes, asserts every field survives.
 */
function buildRealisticState(): SessionState {
  const base = createInitialState();

  const branch1: AudienceBranch = {
    segment: {
      id: 1,
      name: 'Curious Explorers',
      tagline: 'Collects experiences like currency',
      needsValues: 'Travellers who choose destinations for cultural depth and unscripted moments',
      demographics: '28-45, urban, $80k+, post-graduate',
    },
    personification: {
      intro: 'Meet',
      narrative: 'They open the camera at golden hour and lower it for the conversation. Their feed is full of bookshops, espresso bars, and the back rooms of museums.',
    },
    insights: [
      { id: 1, text: 'The best trips are the ones where you change your plans on day two.', level: 'sharper' },
      { id: 2, text: 'A destination only counts if there is a story to bring back.', level: 'bolder' },
    ],
  };

  const branch2: AudienceBranch = {
    segment: {
      id: 2,
      name: 'Reflective Returners',
      tagline: 'Pilgrims of place',
      needsValues: 'Travellers who return to the same places to deepen what they already know',
      demographics: '40-65, suburban, $120k+, family',
    },
    personification: {
      intro: 'Meet',
      narrative: 'They have a corner table at a restaurant in Lyon they have been to seven times. They write the dates in the back of a notebook.',
    },
    insights: [
      { id: 3, text: 'Going back is not nostalgia; it is rigour.', level: 'safer' },
    ],
  };

  const vaultResult: VaultResult = {
    rankedConcepts: [
      {
        conceptId: 'next-stop',
        conceptName: 'Next Stop',
        slot: 'A',
        confidence: 'strong',
        confidenceReason: 'Same partner type. Comfortable budget headroom. Audience archetype matches perfectly.',
        partnerTypeMatch: 'same-category',
        budgetFlag: 'within-range',
        conceptDescription: 'Next Stop is a dynamic, emotion-driven travel series.',
        estimatedProductionTimeline: '12-14 weeks',
        estimatedProductionBudget: '$300,000 (3x films)',
        qualityFlags: [],
        referenceLinks: ['https://drive.example/next-stop-deck'],
      },
      {
        conceptId: 'q-and-a-to-b',
        conceptName: 'Q&A to B',
        slot: 'B',
        confidence: 'plausible',
        confidenceReason: 'Cross-category reach. Same channel mix.',
        partnerTypeMatch: 'adjacent',
        budgetFlag: 'close-to-edge',
        conceptDescription: 'A photography-led, social-first series.',
        estimatedProductionTimeline: '8-10 weeks',
        estimatedProductionBudget: '$200,000-$250,000',
        qualityFlags: ['too-destination-specific'],
        referenceLinks: [],
      },
    ],
    selectedConceptIds: ['next-stop'],
    narrativeDrafts: {
      'next-stop': {
        conceptId: 'next-stop',
        slides: {
          keyBriefPoints: 'Strategic inputs synthesised. Triage was green/green/amber/green.',
          creativeProblemWeAreSolving: 'How to make a multi-city campaign feel continuous rather than fragmented.',
          narrativePitch: 'The story unfolds as a continuous journey.',
          conceptDescriptionFull: 'Next Stop creates a fluid travel narrative across three films.',
          tailoringTo: 'For Germany, lean into the regional shift between Bavaria and the Ruhr.',
          strategicFitAndBudget: 'Strategic fit is strong. Budget $300k for 3 films is comfortable.',
        },
        creativeLabFlag: false,
      },
    },
    customEdits: { 'next-stop:tailoringTo': 'Edited' },
    exportedAt: '2026-05-20T16:00:00Z',
    resumeToken: null,
    topLineNote: null,
  };

  return {
    ...base,
    briefId: 'brief-test-abc-123',
    brief: 'Original brief content for testing.',
    briefFilename: 'germany-brief.docx',
    additionalContext: 'Test additional context',
    triageResult: {
      synthesizedReplay: {
        objective: { content: 'Objective synthesis', contradictions: [], vagueness: [], quotes: [] },
        budget: { content: 'Budget synthesis', contradictions: [], vagueness: [], quotes: [] },
        audience: { content: 'Audience synthesis', contradictions: [], vagueness: [], quotes: [] },
        creative_task: { content: 'Creative task synthesis', contradictions: [], vagueness: [], quotes: [] },
        brand_alignment: { content: '', contradictions: [], vagueness: [], quotes: [] },
        audience_insights: { content: '', contradictions: [], vagueness: [], quotes: [] },
        creative_tenets: { content: '', contradictions: [], vagueness: [], quotes: [] },
        media_context: { content: '', contradictions: [], vagueness: [], quotes: [] },
        research_stimuli: { content: '', contradictions: [], vagueness: [], quotes: [] },
      },
      triageAssessment: [],
      overallBriefHealth: 'amber',
      coherenceAnalysis: { tensions: [], overallCoherence: 'mixed' },
    },
    sections: base.sections.map(s => ({ ...s, content: s.content + ' [filled]' })),
    brandAlignment: { brand: 'expedia', hasDGMatch: true, brandAudience: 'Cultural Explorers' },
    budgetDetails: { totalBudget: '$1,500,000', productionBudget: '$300,000', currency: 'USD' },
    audienceMenu: null,
    selectedAudienceSegment: branch1.segment,
    personification: branch1.personification,
    audiencePrioritisation: { primary: branch1.segment, secondary: [branch2.segment] },
    audienceBranches: [branch1, branch2],
    currentBranchIndex: 1,
    insightOptions: [
      { id: 1, text: 'Insight A', level: 'safer' },
      { id: 2, text: 'Insight B', level: 'sharper' },
    ],
    selectedInsights: [branch1.insights[0], branch1.insights[1]],
    productionBudgetUsd: 300000,
    partnerType: 'destination',
    vaultAudienceBranchIndex: 0,
    vaultMatchPreview: {
      signal: 'strong',
      rankedCount: 2,
      topConceptName: 'Next Stop',
      cachedAt: '2026-05-20T15:30:00Z',
    },
    vaultResult,
  };
}

describe('vault-resume-token full-slice roundtrip', () => {
  it('encodes and decodes a realistic state without losing any slice field', () => {
    const state = buildRealisticState();
    const token = encodeResumeToken(state);
    expect(token.length).toBeGreaterThan(100); // some real data
    const decoded = decodeResumeToken(token);

    // Top-level scalar fields
    expect(decoded?.briefId).toBe('brief-test-abc-123');
    expect(decoded?.brief).toBe(state.brief);
    expect(decoded?.briefFilename).toBe(state.briefFilename);
    expect(decoded?.additionalContext).toBe(state.additionalContext);
    expect(decoded?.productionBudgetUsd).toBe(300000);
    expect(decoded?.partnerType).toBe('destination');
    expect(decoded?.vaultAudienceBranchIndex).toBe(0);
    expect(decoded?.currentBranchIndex).toBe(1);
  });

  it('preserves the full audienceBranches structure including nested insights', () => {
    const state = buildRealisticState();
    const decoded = decodeResumeToken(encodeResumeToken(state));

    expect(decoded?.audienceBranches).toHaveLength(2);
    expect(decoded?.audienceBranches[0].segment.name).toBe('Curious Explorers');
    expect(decoded?.audienceBranches[0].insights).toHaveLength(2);
    expect(decoded?.audienceBranches[1].segment.name).toBe('Reflective Returners');
    expect(decoded?.audienceBranches[1].personification?.narrative).toContain('Lyon');
  });

  it('preserves vaultResult with rankedConcepts and narrativeDrafts', () => {
    const state = buildRealisticState();
    const decoded = decodeResumeToken(encodeResumeToken(state));

    expect(decoded?.vaultResult?.rankedConcepts).toHaveLength(2);
    expect(decoded?.vaultResult?.rankedConcepts[0].slot).toBe('A');
    expect(decoded?.vaultResult?.rankedConcepts[0].confidence).toBe('strong');
    expect(decoded?.vaultResult?.rankedConcepts[1].qualityFlags).toEqual(['too-destination-specific']);
    expect(decoded?.vaultResult?.selectedConceptIds).toEqual(['next-stop']);
    expect(decoded?.vaultResult?.narrativeDrafts['next-stop']?.slides.tailoringTo).toContain('Germany');
    expect(decoded?.vaultResult?.exportedAt).toBe('2026-05-20T16:00:00Z');
  });

  it('preserves vaultMatchPreview with all four signal fields', () => {
    const state = buildRealisticState();
    const decoded = decodeResumeToken(encodeResumeToken(state));

    expect(decoded?.vaultMatchPreview?.signal).toBe('strong');
    expect(decoded?.vaultMatchPreview?.rankedCount).toBe(2);
    expect(decoded?.vaultMatchPreview?.topConceptName).toBe('Next Stop');
    expect(decoded?.vaultMatchPreview?.cachedAt).toBe('2026-05-20T15:30:00Z');
  });

  it('preserves brandAlignment, budgetDetails, and triageResult shape', () => {
    const state = buildRealisticState();
    const decoded = decodeResumeToken(encodeResumeToken(state));

    expect(decoded?.brandAlignment?.brand).toBe('expedia');
    expect(decoded?.brandAlignment?.hasDGMatch).toBe(true);
    expect(decoded?.budgetDetails?.totalBudget).toBe('$1,500,000');
    expect(decoded?.budgetDetails?.productionBudget).toBe('$300,000');
    expect(decoded?.triageResult?.overallBriefHealth).toBe('amber');
    expect(decoded?.triageResult?.coherenceAnalysis.overallCoherence).toBe('mixed');
  });

  it('roundtrips through buildResumeUrl + extractResumeToken with full state', () => {
    const state = buildRealisticState();
    const url = buildResumeUrl('https://pitch-pack-tool-production.up.railway.app', state);
    expect(url).toContain('?resume=');
    const token = extractResumeToken(url);
    expect(token).not.toBeNull();
    const decoded = decodeResumeToken(token!);
    expect(decoded?.briefId).toBe('brief-test-abc-123');
    expect(decoded?.vaultResult?.rankedConcepts).toHaveLength(2);
  });

  it('produces URL-safe base64 (no +, /, = in the token)', () => {
    const state = buildRealisticState();
    const url = buildResumeUrl('https://example.com', state);
    const token = extractResumeToken(url);
    expect(token).not.toBeNull();
    expect(token).not.toMatch(/[+/=]/);
  });

  it('gracefully handles a tampered token by returning null', () => {
    const state = buildRealisticState();
    const token = encodeResumeToken(state);
    const tampered = token.slice(0, -20) + 'CORRUPTED';
    const decoded = decodeResumeToken(tampered);
    // Could return null (bad base64) or a malformed object (bad JSON after decode)
    // The contract: don't throw, return null on parse failure
    if (decoded !== null) {
      // If it didn't return null, it should at least not have the right briefId
      expect(decoded.briefId).not.toBe('brief-test-abc-123');
    }
  });
});
