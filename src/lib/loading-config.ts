import { LoadingStage } from './types';

export interface StageConfig {
  stage: LoadingStage;
  message: string;
  subMessage?: string;
  percent: number;
  minDuration: number;
}

export const TRIAGE_STAGES: StageConfig[] = [
  { stage: 'uploading', message: 'Brief received', subMessage: 'Starting analysis...', percent: 5, minDuration: 2000 },
  { stage: 'parsing', message: 'Parsing document', subMessage: 'Extracting text content...', percent: 15, minDuration: 4000 },
  { stage: 'analysing', message: 'Analysing brief structure', subMessage: 'Identifying key sections...', percent: 30, minDuration: 6000 },
  { stage: 'extracting_objectives', message: 'Extracting objectives', subMessage: 'Looking for campaign goals...', percent: 45, minDuration: 8000 },
  { stage: 'assessing_audience', message: 'Assessing audience clarity', subMessage: 'Checking target definition...', percent: 60, minDuration: 6000 },
  { stage: 'checking_budget', message: 'Checking budget alignment', subMessage: 'Evaluating constraints...', percent: 75, minDuration: 5000 },
  { stage: 'evaluating_creative', message: 'Evaluating creative task', subMessage: 'Analysing deliverables...', percent: 85, minDuration: 5000 },
  { stage: 'generating_assessment', message: 'Generating assessment', subMessage: 'Compiling traffic light scores...', percent: 95, minDuration: 6000 },
  { stage: 'complete', message: 'Assessment complete', percent: 100, minDuration: 500 },
];

export const AUDIENCE_STAGES: StageConfig[] = [
  { stage: 'analysing', message: 'Analysing brief context', subMessage: 'Understanding campaign objectives...', percent: 10, minDuration: 3000 },
  { stage: 'researching', message: 'Researching audience patterns', subMessage: 'Identifying behavioural segments...', percent: 25, minDuration: 5000 },
  { stage: 'profiling', message: 'Building audience profiles', subMessage: 'Creating psychographic definitions...', percent: 45, minDuration: 6000 },
  { stage: 'differentiating', message: 'Differentiating segments', subMessage: 'Ensuring distinct audience groups...', percent: 65, minDuration: 5000 },
  { stage: 'validating', message: 'Validating segments', subMessage: 'Checking strategic alignment...', percent: 85, minDuration: 4000 },
  { stage: 'complete', message: 'Segments ready', percent: 100, minDuration: 500 },
];

export const INSIGHTS_STAGES: StageConfig[] = [
  { stage: 'understanding', message: 'Understanding your audience', subMessage: 'Analysing personification details...', percent: 10, minDuration: 3000 },
  { stage: 'exploring', message: 'Exploring psychological drivers', subMessage: 'Identifying motivations and barriers...', percent: 30, minDuration: 5000 },
  { stage: 'generating_safer', message: 'Generating safer insights', subMessage: 'Creating proven, reliable angles...', percent: 50, minDuration: 5000 },
  { stage: 'generating_sharper', message: 'Generating sharper insights', subMessage: 'Developing more distinctive angles...', percent: 70, minDuration: 5000 },
  { stage: 'generating_bolder', message: 'Generating bolder insights', subMessage: 'Crafting breakthrough creative angles...', percent: 90, minDuration: 4000 },
  { stage: 'complete', message: 'Insights ready', percent: 100, minDuration: 500 },
];

export const LOADING_TIPS = [
  { tip: 'Good briefs have clear objectives tied to budget', icon: '💡' },
  { tip: 'Psychographic audiences outperform demographics', icon: '🎯' },
  { tip: 'Production budget is typically ~10% of total campaign', icon: '💰' },
  { tip: 'Specific creative tasks lead to better outputs', icon: '✨' },
  { tip: 'One primary audience beats trying to reach everyone', icon: '👥' },
];

export function getRandomTip(): { tip: string; icon: string } {
  return LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
}
