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

describe('Creative Task Prompt', () => {
  it('should have four-option generate output', () => {
    const prompt = loadPrompt('creative-task');
    expect(prompt.generate.outputs.options).toContain('lifted');
  });

  it('should include alignment check', () => {
    const prompt = loadPrompt('creative-task');
    expect(prompt.generate.outputs.alignmentCheck).toBeDefined();
  });
});

describe('Audience Prompt', () => {
  it('should have generate step for segment menu', () => {
    const prompt = loadPrompt('audience');
    expect(prompt.generate.outputs.intro).toBeDefined();
    expect(prompt.generate.outputs.segments).toBeDefined();
  });

  it('should have personify step', () => {
    const prompt = loadPrompt('audience');
    expect(prompt.personify).toBeDefined();
    expect(prompt.personify.outputs.narrative).toBeDefined();
  });

  it('should avoid overused segment names in logic', () => {
    const prompt = loadPrompt('audience');
    const system = buildSystemPrompt(prompt.generate);
    expect(system).toContain('Cultural Explorers');
    expect(system.toLowerCase()).toContain('avoid');
  });
});

describe('Human Truths Prompt', () => {
  it('should specify 12 truths', () => {
    const prompt = loadPrompt('human-truths');
    const system = buildSystemPrompt(prompt.generate);
    expect(system).toContain('12');
  });

  it('should define safer/sharper/bolder zones', () => {
    const prompt = loadPrompt('human-truths');
    const system = buildSystemPrompt(prompt.generate);
    expect(system).toContain('1-4');
    expect(system).toContain('5-8');
    expect(system).toContain('9-12');
  });

  it('should require rhetorical questions', () => {
    const prompt = loadPrompt('human-truths');
    const system = buildSystemPrompt(prompt.generate);
    expect(system.toLowerCase()).toContain('rhetorical');
  });
});
