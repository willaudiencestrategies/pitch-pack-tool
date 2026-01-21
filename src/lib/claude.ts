// src/lib/claude.ts

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LogContext {
  endpoint: string;
  sessionId?: string;
}

function log(data: Record<string, unknown>) {
  console.log(JSON.stringify({
    ...data,
    timestamp: new Date().toISOString(),
  }));
}

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  context?: LogContext
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const startTime = Date.now();
  const endpoint = context?.endpoint || 'unknown';

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const duration = Date.now() - startTime;

    log({
      event: 'api_call',
      endpoint,
      sessionId: context?.sessionId,
      duration_ms: duration,
      status: 'success',
      input_tokens: response.usage?.input_tokens,
      output_tokens: response.usage?.output_tokens,
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    return textBlock.text;
  } catch (error) {
    const duration = Date.now() - startTime;

    log({
      event: 'api_call',
      endpoint,
      sessionId: context?.sessionId,
      duration_ms: duration,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof Anthropic.APIError) {
      throw new Error(`Claude API error (${error.status}): ${error.message}`);
    }
    throw error;
  }
}

export async function callClaudeJSON<T>(
  systemPrompt: string,
  userMessage: string,
  context?: LogContext
): Promise<T> {
  const response = await callClaude(
    systemPrompt + '\n\nRespond with valid JSON only. No markdown, no explanation.',
    userMessage,
    context
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

  try {
    return JSON.parse(jsonStr.trim()) as T;
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${jsonStr.substring(0, 200)}...`);
  }
}
