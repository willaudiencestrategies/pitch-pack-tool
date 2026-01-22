import { describe, it, expect } from 'vitest';
import { loadPrompt, buildSystemPrompt } from './prompts';

describe('Prompt Loading', () => {
  it('should load budget prompt', () => {
    const prompt = loadPrompt('budget');
    expect(prompt.section).toBe('budget');
    expect(prompt.displayName).toBe('Budget');
  });

  it('should build system prompt with role and task', () => {
    const prompt = loadPrompt('budget');
    const system = buildSystemPrompt(prompt.assess);
    expect(system).toContain('Budget Realist');
    expect(system).toContain('pressure-tests');
  });
});
