// src/lib/claude.ts

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function callClaude(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  return textBlock.text;
}

export async function callClaudeJSON<T>(
  systemPrompt: string,
  userMessage: string
): Promise<T> {
  const response = await callClaude(
    systemPrompt + '\n\nRespond with valid JSON only. No markdown, no explanation.',
    userMessage
  );

  // Extract JSON from response (handle potential markdown code blocks)
  let jsonStr = response.trim();
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  }
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }

  return JSON.parse(jsonStr.trim()) as T;
}
