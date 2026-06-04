import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useLoadingProgress } from '../useLoadingProgress';
import type { StageConfig } from '@/lib/loading-config';

const STAGES: StageConfig[] = [
  { stage: 'a', message: 'a', percent: 10, minDuration: 1000 },
  { stage: 'b', message: 'b', percent: 50, minDuration: 1000 },
  { stage: 'c', message: 'c', percent: 95, minDuration: 1000 },
  { stage: 'complete', message: 'done', percent: 100, minDuration: 500 },
] as unknown as StageConfig[];

describe('useLoadingProgress', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('never reaches the 100% complete stage via the simulation', async () => {
    const { result } = renderHook(() => useLoadingProgress(STAGES));

    await act(async () => {
      result.current.runSimulatedProgress();
    });
    // Advance far past the total simulated duration.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    // Holds at the last pre-complete stage (95%), NOT the 100% stage.
    expect(result.current.currentStageIndex).toBe(STAGES.length - 2);
    expect(result.current.currentStage.percent).toBe(95);
  });

  it('reaches 100% only when complete() is called', async () => {
    const { result } = renderHook(() => useLoadingProgress(STAGES));

    await act(async () => {
      result.current.runSimulatedProgress();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    act(() => {
      result.current.complete();
    });

    expect(result.current.currentStageIndex).toBe(STAGES.length - 1);
    expect(result.current.currentStage.percent).toBe(100);
  });

  it('handles a two-stage config (single pre-complete stage) without pinning at 100%', async () => {
    const twoStage: StageConfig[] = [
      { stage: 'work', message: 'work', percent: 50, minDuration: 1000 },
      { stage: 'complete', message: 'done', percent: 100, minDuration: 500 },
    ] as unknown as StageConfig[];
    const { result } = renderHook(() => useLoadingProgress(twoStage));

    await act(async () => {
      result.current.runSimulatedProgress();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    // Holds at the single pre-complete stage, never auto-advances to 100%.
    expect(result.current.currentStageIndex).toBe(0);
    expect(result.current.currentStage.percent).toBe(50);
  });
});
