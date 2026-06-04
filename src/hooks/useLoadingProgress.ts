import { useState, useCallback, useRef } from 'react';
import { StageConfig } from '@/lib/loading-config';

export function useLoadingProgress(stages: StageConfig[]) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    setIsActive(true);
    setCurrentStageIndex(0);
  }, []);

  const advanceStage = useCallback(() => {
    setCurrentStageIndex((prev) => {
      const next = prev + 1;
      if (next >= stages.length) return prev;
      return next;
    });
  }, [stages.length]);

  const complete = useCallback(() => {
    setCurrentStageIndex(stages.length - 1);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsActive(false);
      setCurrentStageIndex(0);
    }, 500);
  }, [stages.length]);

  const reset = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsActive(false);
    setCurrentStageIndex(0);
  }, []);

  const runSimulatedProgress = useCallback(async () => {
    start();
    // Deliberately stop one short of the final stage. The last stage is the 100%
    // "complete" marker — reaching it on a timer would pin the bar at 100% while
    // the real request is still running (briefs routinely take 1-4 min, far longer
    // than the simulated walk). The bar holds at the last pre-complete stage and
    // only complete() — called when the response actually arrives — advances to 100%.
    const lastSimulatedIndex = Math.max(0, stages.length - 2);
    for (let i = 0; i < lastSimulatedIndex; i++) {
      await new Promise((resolve) => setTimeout(resolve, stages[i].minDuration));
      setCurrentStageIndex(i + 1);
    }
  }, [stages, start]);

  return {
    currentStageIndex,
    currentStage: stages[currentStageIndex],
    isActive,
    start,
    advanceStage,
    complete,
    reset,
    runSimulatedProgress,
  };
}
