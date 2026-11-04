// =============================================================================
// Anthropic Claude SDK initialization.
// =============================================================================

import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | undefined;

export function anthropic(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY env var is not set');
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

/** Resolve a model alias to the configured model ID. */
export function modelFor(alias: 'sonnet' | 'opus' | 'haiku' | 'support'): string {
  switch (alias) {
    case 'sonnet':
      return process.env.ANTHROPIC_MODEL_DEFAULT ?? 'claude-sonnet-4-6';
    case 'opus':
      return process.env.ANTHROPIC_MODEL_COMPLEX ?? 'claude-opus-4-7';
    case 'haiku':
      return process.env.ANTHROPIC_MODEL_FAST ?? 'claude-haiku-4-5';
    case 'support':
      // Platform support agent. Pinned to Sonnet 4.7 per spec; falls back to the
      // default Sonnet at call time (see createMessageWithModelFallback) if the
      // live account hasn't been granted 4.7 yet.
      return process.env.ANTHROPIC_MODEL_SUPPORT ?? 'claude-sonnet-4-7';
  }
}

/**
 * Create a (non-streaming) message, transparently falling back to the default
 * Sonnet model if the requested model id 404s (model-not-found). This lets us
 * pin a newer alias like claude-sonnet-4-7 in env while staying resilient if the
 * running account can't serve it yet. Returns the message AND the model that
 * actually served it, so callers cost-attribute correctly.
 */
export async function createMessageWithModelFallback(
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<{ message: Anthropic.Message; modelUsed: string }> {
  try {
    const message = await anthropic().messages.create(params);
    return { message, modelUsed: params.model };
  } catch (err) {
    const status = (err as { status?: number }).status;
    const fallback = modelFor('sonnet');
    if (status === 404 && params.model !== fallback) {
      const message = await anthropic().messages.create({ ...params, model: fallback });
      return { message, modelUsed: fallback };
    }
    throw err;
  }
}

/**
 * Approximate Anthropic API cost for a usage record. Update prices when the
 * platform pricing page changes.
 *
 * Pricing (per million tokens, May 2026):
 *   - Opus 4.7:    $5 in / $25 out
 *   - Sonnet 4.6:  $3 in / $15 out
 *   - Haiku 4.5:   $1 in / $5 out
 *
 * Cache reads are 10% of input pricing; cache writes are 1.25x input.
 */
export function estimateCostCents(args: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}): number {
  const m = args.model.toLowerCase();
  let inPer1M = 3,
    outPer1M = 15;
  if (m.includes('opus')) {
    inPer1M = 5;
    outPer1M = 25;
  } else if (m.includes('haiku')) {
    inPer1M = 1;
    outPer1M = 5;
  }
  const inputDollars = (args.inputTokens / 1_000_000) * inPer1M;
  const outputDollars = (args.outputTokens / 1_000_000) * outPer1M;
  const cacheReadDollars = ((args.cacheReadTokens ?? 0) / 1_000_000) * (inPer1M * 0.1);
  const cacheWriteDollars = ((args.cacheWriteTokens ?? 0) / 1_000_000) * (inPer1M * 1.25);
  const totalDollars = inputDollars + outputDollars + cacheReadDollars + cacheWriteDollars;
  return Math.round(totalDollars * 100);
}
