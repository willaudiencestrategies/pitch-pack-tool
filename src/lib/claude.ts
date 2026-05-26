// src/lib/claude.ts

import Anthropic from '@anthropic-ai/sdk';
import { extractBalancedJson } from './claude-json-extract';

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
      model: 'claude-sonnet-4-6',
      max_tokens: 16384,
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

  const extracted = extractBalancedJson(response);
  const jsonStr = (extracted ?? response).trim();

  try {
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    const head = jsonStr.slice(0, 300);
    const tail = jsonStr.length > 800 ? jsonStr.slice(-500) : '';
    const message = [
      'Failed to parse Claude response as JSON.',
      `Reason: ${reason}.`,
      `Total length: ${jsonStr.length}.`,
      `Head: ${head}`,
      tail ? `Tail: ${tail}` : '',
    ].filter(Boolean).join(' ');
    throw new Error(message);
  }
}
