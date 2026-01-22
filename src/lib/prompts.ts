// src/lib/prompts.ts

import fs from 'fs';
import path from 'path';

export interface PromptConfig {
  role: string;
  task: string;
  logic: string;
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  examples?: Array<{ input: string; output: string }>;
  escapeHatch: string;
}

export interface SectionPrompts {
  section: string;
  displayName: string;
  assess: PromptConfig;
  reassess: PromptConfig;
  generate: PromptConfig;
  personify?: PromptConfig;  // Only used by audience prompt (two-step flow)
}

export function loadPrompt(promptName: string): SectionPrompts {
  const promptPath = path.join(process.cwd(), 'prompts', `${promptName}.json`);
  const content = fs.readFileSync(promptPath, 'utf-8');
  return JSON.parse(content) as SectionPrompts;
}

export function buildSystemPrompt(config: PromptConfig): string {
  let prompt = `# Role\n${config.role}\n\n`;
  prompt += `# Task\n${config.task}\n\n`;
  prompt += `# Logic\n${config.logic}\n\n`;

  prompt += `# Inputs\n`;
  for (const [key, desc] of Object.entries(config.inputs)) {
    prompt += `- ${key}: ${desc}\n`;
  }
  prompt += '\n';

  prompt += `# Outputs (JSON format)\n`;
  for (const [key, desc] of Object.entries(config.outputs)) {
    prompt += `- ${key}: ${desc}\n`;
  }
  prompt += '\n';

  if (config.examples && config.examples.length > 0) {
    prompt += `# Examples\n`;
    for (const ex of config.examples) {
      prompt += `Input: ${ex.input}\nOutput: ${ex.output}\n\n`;
    }
  }

  prompt += `# Escape Hatch\n${config.escapeHatch}`;

  return prompt;
}
