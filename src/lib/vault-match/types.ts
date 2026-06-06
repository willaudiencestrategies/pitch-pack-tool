export interface BriefFingerprint {
  strategicProblem: string;
  audience: string;   // includes the selected insights / human truths
  creativeJob: string;
  format: string;
  tone: string;
}

export interface ConceptFingerprint {
  strategicProblem: string;
  audience: string;
  creativeJob: string;
  mechanism: string;
  format: string;
}

export interface AxisScores {
  problemScore: number;     // 0-100
  audienceScore: number;    // 0-100, includes insight-carriage
  mechanismScore: number;   // 0-100
  problemReason: string;
  audienceReason: string;
  mechanismReason: string;
}

export interface ScoredConcept {
  conceptId: string;
  scores: AxisScores;
}
