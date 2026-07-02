// src/lib/claude.ts

import Anthropic from '@anthropic-ai/sdk';
import { extractBalancedJson } from './claude-json-extract';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Output ceiling. Raised from 16384 so a long brief's assessment is far less likely
// to truncate; the stop_reason guard in callClaude catches the rare case it still does.
const MAX_TOKENS = 32000;

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
    // Stream the response rather than waiting on one blocking call. Streaming keeps
    // the socket active for the whole generation, so neither the SDK's own long-request
    // guard nor a platform/proxy idle timeout can kill a slow (~60-90s) triage call.
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const response = await stream.finalMessage();
    const duration = Date.now() - startTime;

    log({
      event: 'api_call',
      endpoint,
      sessionId: context?.sessionId,
      duration_ms: duration,
      status: 'success',
      stop_reason: response.stop_reason,
      input_tokens: response.usage?.input_tokens,
      output_tokens: response.usage?.output_tokens,
    });

    // A long brief can hit the token ceiling and truncate the reply mid-JSON, which
    // then dies in JSON.parse with a misleading "unexpected end of input". Catch it
    // here with a clear, actionable message instead of letting the parse fail blindly.
    if (response.stop_reason === 'max_tokens') {
      throw new Error(
        `Claude's reply hit the ${MAX_TOKENS}-token limit and was truncated before it finished. ` +
        `The brief is likely too long for a single pass — try shortening it or splitting the assessment.`
      );
    }

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

/**
 * Fire a tiny throwaway call to warm the API connection on boot, so the first real
 * request of the day doesn't pay the cold-start latency that tips it over a timeout.
 * Best-effort: any failure is logged and swallowed, never thrown.
 */
export async function warmupClaude(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) return;
  const startTime = Date.now();
  try {
    await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    });
    log({ event: 'warmup', status: 'success', duration_ms: Date.now() - startTime });
  } catch (error) {
    log({
      event: 'warmup',
      status: 'error',
      duration_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
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
