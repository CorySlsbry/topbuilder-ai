// =============================================================================
// /api/chat/stream — Owner's Copilot SSE endpoint.
// =============================================================================
// Server-Sent Events. The client opens an EventSource; we stream Claude's
// reply token-by-token, then close.
//
// Auth: bearer ID token. Role must include CHAT_USE (owner/admin/manager).
//
// Implementation notes:
//   - We persist conversation + each message to Firestore (server-only writes).
//   - Manager role is scoped via ToolContext.assignedProjectIds.
//   - Cost is tracked and written to usageEvents at end of run.
// =============================================================================

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { verifyRequest } from '@/lib/firebase/auth';
import { hasPermission } from '@/lib/rbac/permissions';
import { adminDb } from '@/lib/firebase/admin';
import { anthropic, modelFor, estimateCostCents } from '@/lib/claude/client';
import { TOOLS, toolSchemasForAnthropic, executeTool, type ToolContext } from '@/lib/claude/tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ChatRequest {
  conversationId?: string;
  message: string;
}

export async function POST(req: NextRequest): Promise<Response> {
  let ctx;
  try {
    ctx = await verifyRequest(req);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 401;
    return NextResponse.json({ error: 'Unauthorized' }, { status });
  }

  if (!hasPermission(ctx.role, 'CHAT_USE')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }
  if (!body.message || typeof body.message !== 'string') {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  // Resolve user record for assignedProjectIds
  const userSnap = await adminDb().doc(`tenants/${ctx.tenantId}/users/${ctx.userId}`).get();
  const assignedProjectIds =
    (userSnap.data()?.assignedProjectIds as string[] | undefined) ?? [];

  // Ensure conversation exists.
  const convId = body.conversationId ?? adminDb().collection('_').doc().id;
  const convRef = adminDb().doc(`tenants/${ctx.tenantId}/chatConversations/${convId}`);
  await convRef.set(
    {
      id: convId,
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      title: body.message.slice(0, 60),
      lastMessageAt: Timestamp.now(),
      totalCostCents: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );

  // Persist the user message.
  const userMsgRef = adminDb().collection(`tenants/${ctx.tenantId}/chatConversations/${convId}/messages`).doc();
  await userMsgRef.set({
    id: userMsgRef.id,
    tenantId: ctx.tenantId,
    conversationId: convId,
    role: 'user',
    content: body.message,
    toolCalls: [],
    modelUsed: null,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    costCents: 0,
    citations: [],
    createdAt: Timestamp.now(),
  });

  const toolCtx: ToolContext = {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    assignedProjectIds,
  };

  const model = modelFor('sonnet');

  // Build SSE response.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (eventName: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      send('start', { conversationId: convId });

      let inputTokens = 0;
      let outputTokens = 0;
      let assistantText = '';

      try {
        // For Phase 1 simplicity, use the non-streaming Messages API + tool loop.
        // SSE here streams an aggregated final reply. Token-level streaming via
        // anthropic().messages.stream() is a Sprint 7 polish item.

        const systemPrompt = buildSystemPrompt(ctx.role);

        let toolLoopActive = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const conversation: any[] = [{ role: 'user', content: body.message }];

        while (toolLoopActive) {
          const resp = await anthropic().messages.create({
            model,
            max_tokens: 4000,
            system: systemPrompt,
            tools: toolSchemasForAnthropic(),
            messages: conversation,
          });
          inputTokens += resp.usage.input_tokens;
          outputTokens += resp.usage.output_tokens;

          const toolUses = resp.content.filter((c) => c.type === 'tool_use');
          const textBlocks = resp.content.filter((c) => c.type === 'text');

          for (const block of textBlocks) {
            if (block.type === 'text') {
              assistantText += block.text;
              send('token', { text: block.text });
            }
          }

          if (resp.stop_reason === 'tool_use' && toolUses.length > 0) {
            conversation.push({ role: 'assistant', content: resp.content });
            const toolResults = [];
            for (const tu of toolUses) {
              if (tu.type !== 'tool_use') continue;
              send('tool_call', { name: tu.name, input: tu.input });
              try {
                const out = await executeTool(
                  tu.name,
                  tu.input as Record<string, unknown>,
                  toolCtx,
                );
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: tu.id,
                  content: JSON.stringify(out),
                });
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
            continue;
          }
          toolLoopActive = false;
        }

        const costCents = estimateCostCents({ model, inputTokens, outputTokens });

        // Persist assistant message.
        const assistantMsgRef = adminDb()
          .collection(`tenants/${ctx.tenantId}/chatConversations/${convId}/messages`)
          .doc();
        await assistantMsgRef.set({
          id: assistantMsgRef.id,
          tenantId: ctx.tenantId,
          conversationId: convId,
          role: 'assistant',
          content: assistantText,
          toolCalls: [],
          modelUsed: model,
          inputTokens,
          outputTokens,
          cacheReadTokens: 0,
          costCents,
          citations: [],
          createdAt: Timestamp.now(),
        });

        // Update conversation totals.
        await convRef.update({
          lastMessageAt: Timestamp.now(),
          totalCostCents: (await convRef.get()).data()?.totalCostCents ?? 0 + costCents,
          totalInputTokens: ((await convRef.get()).data()?.totalInputTokens ?? 0) + inputTokens,
          totalOutputTokens: ((await convRef.get()).data()?.totalOutputTokens ?? 0) + outputTokens,
          updatedAt: Timestamp.now(),
        });

        await adminDb().collection(`tenants/${ctx.tenantId}/usageEvents`).add({
          tenantId: ctx.tenantId,
          eventType: 'anthropic_tokens',
          quantity: inputTokens + outputTokens,
          unit: 'tokens',
          costCents,
          referenceId: assistantMsgRef.id,
          createdAt: Timestamp.now(),
        });

        send('done', { costCents, inputTokens, outputTokens });
      } catch (err) {
        send('error', { message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

function buildSystemPrompt(role: string): string {
  return `You are Top Builder AI's Owner's Copilot. You help a construction contractor explore their Procore + QuickBooks data.

The user's role is "${role}". If the user asks about company-wide financials and their role is "manager", "field", or "viewer", politely explain you can only show project-scoped operational data, not financial summaries.

Style:
- Short, direct answers. Numbers first.
- Cite data from tool results when stating facts.
- Never fabricate data. If a tool returns empty or errors, say so.
- If you need additional data to answer accurately, call the appropriate tool.

Available tools: ${TOOLS.map((t) => t.name).join(', ')}.`;
}
