import { LoadingStage } from './types';

export interface StageConfig {
  stage: LoadingStage;
  message: string;
  subMessage?: string;
  percent: number;
  minDuration: number;
}

export const TRIAGE_STAGES: StageConfig[] = [
  { stage: 'uploading', message: 'Brief received', subMessage: 'Starting analysis...', percent: 5, minDuration: 500 },
  { stage: 'parsing', message: 'Parsing document', subMessage: 'Extracting text content...', percent: 15, minDuration: 800 },
  { stage: 'analysing', message: 'Analysing brief structure', subMessage: 'Identifying key sections...', percent: 30, minDuration: 1000 },
  { stage: 'extracting_objectives', message: 'Extracting objectives', subMessage: 'Looking for campaign goals...', percent: 45, minDuration: 1200 },
  { stage: 'assessing_audience', message: 'Assessing audience clarity', subMessage: 'Checking target definition...', percent: 60, minDuration: 1000 },
  { stage: 'checking_budget', message: 'Checking budget alignment', subMessage: 'Evaluating constraints...', percent: 75, minDuration: 800 },
  { stage: 'evaluating_creative', message: 'Evaluating creative task', subMessage: 'Analysing deliverables...', percent: 85, minDuration: 800 },
  { stage: 'generating_assessment', message: 'Generating assessment', subMessage: 'Compiling traffic light scores...', percent: 95, minDuration: 1000 },
  { stage: 'complete', message: 'Assessment complete', percent: 100, minDuration: 300 },
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
