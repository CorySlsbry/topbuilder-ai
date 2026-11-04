// =============================================================================
// Platform support agent (Sonnet 4.7) — diagnose + draft.
// =============================================================================
// Runs a tool-use loop over the platform read tools to answer "what's wrong with
// tenant X", summarize system state, or draft a customer-ready reply. Read-only:
// it never mutates a tenant. Cory reviews the output, then sends via replyToThread.
// The system prompt is prompt-cached. Model 404s fall back to default Sonnet.
// =============================================================================

import 'server-only';
import type Anthropic from '@anthropic-ai/sdk';
import { modelFor, createMessageWithModelFallback, estimateCostCents } from '../claude/client';
import { SUPPORT_TOOLS, supportToolSchemas, executeSupportTool } from './support-tools';
import { getSupportThread } from './support';

const MAX_TOOL_ITERATIONS = 6;

const SYSTEM_PROMPT = `You are the platform support engineer for Top Builder AI — an AI operations platform for Procore construction contractors. You assist the founder (Cory) in supporting customers and diagnosing the system.

You have READ-ONLY tools across every tenant: find_tenant, get_tenant, get_tenant_recent_errors, get_tenant_audit, get_system_diagnostics. Use them to ground every claim in real data — never guess at a tenant's state.

How to respond:
- If the founder asks you to DRAFT A REPLY to a customer, write a complete, send-ready message in a warm, plain-spoken, 3rd-grade-reading-level voice (short sentences, active voice). Do not bad-mouth Procore, QuickBooks, or any competitor. Lead with the fix.
- If the founder asks WHAT'S WRONG, give a concise diagnosis: what you checked, what you found, and the most likely cause + the next action.
- Always pull the tenant id with find_tenant first when only a company name is given.
- Numbers and statuses come from tools, not memory. If a tool returns empty or errors, say so plainly.
- Be concise. No preamble.`;

export interface SupportAgentResult {
  reply: string;
  modelUsed: string;
  toolsUsed: string[];
  costCents: number;
}

export async function runSupportAgent(args: {
  question: string;
  tenantId?: string | null;
  threadId?: string | null;
}): Promise<SupportAgentResult> {
  // Seed context: optional thread conversation + optional tenant hint.
  let seed = args.question.trim();
  if (args.tenantId) seed += `\n\n(Context: this concerns tenant id "${args.tenantId}".)`;
  if (args.threadId) {
    const thread = await getSupportThread(args.threadId);
    if (thread) {
      const transcript = thread.messages
        .map((m) => `${m.direction === 'inbound' ? 'Customer' : 'Us'}: ${m.body}`)
        .join('\n');
      seed += `\n\nSupport thread "${thread.subject}" with ${thread.fromName ?? thread.fromEmail} (${thread.fromEmail})${
        thread.tenantId ? `, tenant ${thread.tenantId}` : ''
      }:\n${transcript}`;
    }
  }

  const model = modelFor('support');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversation: any[] = [{ role: 'user', content: seed }];
  const toolsUsed: string[] = [];
  let reply = '';
  let inputTokens = 0;
  let outputTokens = 0;
  let modelUsed = model;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const { message, modelUsed: served } = await createMessageWithModelFallback({
      model,
      max_tokens: 1500,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      tools: supportToolSchemas(),
      messages: conversation,
    });
    modelUsed = served;
    inputTokens += message.usage.input_tokens;
    outputTokens += message.usage.output_tokens;

    for (const block of message.content) {
      if (block.type === 'text') reply += block.text;
    }

    const toolUses = message.content.filter(
      (c): c is Anthropic.ToolUseBlock => c.type === 'tool_use',
    );
    if (message.stop_reason !== 'tool_use' || toolUses.length === 0) break;

    conversation.push({ role: 'assistant', content: message.content });
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      toolsUsed.push(tu.name);
      try {
        const out = await executeSupportTool(tu.name, tu.input as Record<string, unknown>);
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out) });
      } catch (err) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify({ error: (err as Error).message }),
          is_error: true,
        });
      }
    }
    conversation.push({ role: 'user', content: toolResults });
  }

  const costCents = estimateCostCents({ model: modelUsed, inputTokens, outputTokens });
  return { reply: reply.trim() || 'No response generated.', modelUsed, toolsUsed, costCents };
}

export function supportToolNames(): string[] {
  return SUPPORT_TOOLS.map((t) => t.name);
}
