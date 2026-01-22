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

describe('Triage Prompt', () => {
  it('should have multi-persona role', () => {
    const prompt = loadPrompt('triage');
    expect(prompt.assess.role).toContain('Strategic Planner');
    expect(prompt.assess.role).toContain('Creative Strategist');
    expect(prompt.assess.role).toContain('Brief Architect');
    expect(prompt.assess.role).toContain('Behavioral Psychologist');
    expect(prompt.assess.role).toContain('Budget Realist');
  });

  it('should include preserve chaos principle', () => {
    const prompt = loadPrompt('triage');
    const system = buildSystemPrompt(prompt.assess);
    expect(system.toLowerCase()).toContain('preserve');
    expect(system.toLowerCase()).toContain('chaos');
  });

  it('should assess 8 sections including budget', () => {
    const prompt = loadPrompt('triage');
    expect(prompt.assess.outputs.sections).toContain('budget');
  });
});

describe('Objective Prompt', () => {
  it('should have four-option generate output', () => {
    const prompt = loadPrompt('objective');
    expect(prompt.generate.outputs.options).toContain('lifted');
    expect(prompt.generate.outputs.options).toContain('light');
    expect(prompt.generate.outputs.options).toContain('inspired');
    expect(prompt.generate.outputs.options).toContain('ruthless');
  });

  it('should include current state in generate output', () => {
    const prompt = loadPrompt('objective');
    expect(prompt.generate.outputs.currentState).toBeDefined();
  });
});
