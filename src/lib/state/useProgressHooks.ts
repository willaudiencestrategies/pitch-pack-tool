'use client';

import { useLoadingProgress } from '@/hooks/useLoadingProgress';
import {
  TRIAGE_STAGES,
  AUDIENCE_STAGES,
  INSIGHTS_STAGES,
} from '../loading-config';

export interface UseProgressHooksReturn {
  triage: ReturnType<typeof useLoadingProgress>;
  audience: ReturnType<typeof useLoadingProgress>;
  insights: ReturnType<typeof useLoadingProgress>;
}

export function useProgressHooks(): UseProgressHooksReturn {
  return {
    triage: useLoadingProgress(TRIAGE_STAGES),
    audience: useLoadingProgress(AUDIENCE_STAGES),
    insights: useLoadingProgress(INSIGHTS_STAGES),
  };
}
