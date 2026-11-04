// =============================================================================
// Feedback persistence + aggregate update.
// =============================================================================
import 'server-only';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import type {
  FeedbackDoc,
  FeedbackAggregateDoc,
  FeedbackStationId,
  FeedbackTargetType,
  FeedbackRating,
  FeedbackCategory,
} from './types';
import type { AgentSlug } from '@/lib/firebase/types';

export interface SubmitFeedbackArgs {
  tenantId: string;
  userId: string;
  userEmail: string | null;
  userRole: string;
  stationId: FeedbackStationId;
  targetType: FeedbackTargetType;
  targetId: string;
  agentSlug?: AgentSlug | null;
  rating: FeedbackRating;
  ratingNumeric?: number | null;
  comment?: string | null;
  category?: FeedbackCategory | null;
  metadata?: Record<string, unknown>;
}

const RECENT_COMMENTS_CAP = 10;

export async function submitFeedback(args: SubmitFeedbackArgs): Promise<string> {
  const db = adminDb();
  const ref = db.collection(`tenants/${args.tenantId}/feedback`).doc();
  const now = Timestamp.now();

  const doc: FeedbackDoc = {
    id: ref.id,
    tenantId: args.tenantId,
    userId: args.userId,
    userEmail: args.userEmail,
    userRole: args.userRole,
    stationId: args.stationId,
    targetType: args.targetType,
    targetId: args.targetId,
    agentSlug: args.agentSlug ?? null,
    rating: args.rating,
    ratingNumeric: args.ratingNumeric ?? null,
    comment: args.comment?.trim() ? args.comment.trim() : null,
    category: args.category ?? null,
    metadata: args.metadata ?? {},
    appliedToAgent: false,
    createdAt: now,
  };

  await ref.set(doc);

  // Update aggregate(s) — one per agentSlug (if applicable) and one per stationId.
  const aggregateKeys: Array<{ scope: 'agent' | 'station'; key: string }> = [];
  if (args.agentSlug) aggregateKeys.push({ scope: 'agent', key: args.agentSlug });
  aggregateKeys.push({ scope: 'station', key: args.stationId });

  for (const { scope, key } of aggregateKeys) {
    await updateAggregate({
      tenantId: args.tenantId,
      scope,
      targetKey: key,
      delta: doc,
    });
  }

  return ref.id;
}

async function updateAggregate(args: {
  tenantId: string;
  scope: 'agent' | 'station';
  targetKey: string;
  delta: FeedbackDoc;
}): Promise<void> {
  const db = adminDb();
  const docId = `${args.scope}_${args.targetKey}`;
  const ref = db.doc(`tenants/${args.tenantId}/feedbackAggregates/${docId}`);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.exists ? (snap.data() as FeedbackAggregateDoc) : null;

    const ratingDeltas = {
      positive: args.delta.rating === 'positive' ? 1 : 0,
      negative: args.delta.rating === 'negative' ? 1 : 0,
      neutral: args.delta.rating === 'neutral' ? 1 : 0,
    };

    const total = (existing?.totalCount ?? 0) + 1;
    const positive = (existing?.positiveCount ?? 0) + ratingDeltas.positive;
    const negative = (existing?.negativeCount ?? 0) + ratingDeltas.negative;
    const neutral = (existing?.neutralCount ?? 0) + ratingDeltas.neutral;
    const positiveRatePct = total === 0 ? 0 : Math.round((positive / total) * 100);

    const newRecentNegative =
      args.delta.rating === 'negative' && args.delta.comment
        ? [
            { comment: args.delta.comment, createdAt: args.delta.createdAt, userId: args.delta.userId },
            ...(existing?.recentNegativeComments ?? []),
          ].slice(0, RECENT_COMMENTS_CAP)
        : (existing?.recentNegativeComments ?? []);

    const newRecentPositive =
      args.delta.rating === 'positive' && args.delta.comment
        ? [
            { comment: args.delta.comment, createdAt: args.delta.createdAt, userId: args.delta.userId },
            ...(existing?.recentPositiveComments ?? []),
          ].slice(0, RECENT_COMMENTS_CAP)
        : (existing?.recentPositiveComments ?? []);

    // Update top categories
    const catMap = new Map<string, number>();
    for (const c of existing?.topCategories ?? []) catMap.set(c.category, c.count);
    if (args.delta.category) {
      catMap.set(args.delta.category, (catMap.get(args.delta.category) ?? 0) + 1);
    }
    const topCategories = Array.from(catMap.entries())
      .map(([category, count]) => ({ category: category as FeedbackCategory, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const updated: FeedbackAggregateDoc = {
      id: docId,
      tenantId: args.tenantId,
      scope: args.scope,
      targetKey: args.targetKey,
      totalCount: total,
      positiveCount: positive,
      negativeCount: negative,
      neutralCount: neutral,
      positiveRatePct,
      recentNegativeComments: newRecentNegative,
      recentPositiveComments: newRecentPositive,
      topCategories,
      updatedAt: Timestamp.now(),
    };

    tx.set(ref, updated, { merge: true });
  });
}

/**
 * Load the feedback aggregate for an agent. Returns null if no feedback yet.
 * Agents call this before composing prompts to self-tune.
 */
export async function loadAgentFeedback(args: {
  tenantId: string;
  agentSlug: AgentSlug;
}): Promise<FeedbackAggregateDoc | null> {
  const ref = adminDb().doc(
    `tenants/${args.tenantId}/feedbackAggregates/agent_${args.agentSlug}`,
  );
  const snap = await ref.get();
  return snap.exists ? (snap.data() as FeedbackAggregateDoc) : null;
}

/**
 * Helper: turn a FeedbackAggregateDoc into a prompt-ready string for injection
 * into agent system prompts. Returns empty string if no useful feedback yet.
 */
export function feedbackToPromptContext(
  aggregate: FeedbackAggregateDoc | null,
  agentSlug: string,
): string {
  if (!aggregate || aggregate.totalCount < 3) return '';

  const sections: string[] = [];
  sections.push(
    `\n\nTenant feedback on ${agentSlug} (last ${aggregate.totalCount} runs, ${aggregate.positiveRatePct}% positive):`,
  );

  if (aggregate.recentNegativeComments.length > 0) {
    sections.push('\n\nAvoid in this run — past complaints from this tenant:');
    for (const c of aggregate.recentNegativeComments.slice(0, 5)) {
      sections.push(`  - "${c.comment}"`);
    }
  }

  if (aggregate.recentPositiveComments.length > 0) {
    sections.push('\n\nKeep doing — past praise from this tenant:');
    for (const c of aggregate.recentPositiveComments.slice(0, 5)) {
      sections.push(`  - "${c.comment}"`);
    }
  }

  if (aggregate.topCategories.length > 0) {
    const cats = aggregate.topCategories
      .map((c) => `${c.category} (${c.count})`)
      .join(', ');
    sections.push(`\nMost-flagged categories: ${cats}`);
  }

  sections.push(
    '\nTake this feedback into account when composing this run. Match the patterns this tenant has rated positively; avoid the patterns they have flagged.',
  );

  return sections.join('\n');
}

/**
 * Mark feedback as applied (called by the agent runner after a successful run
 * that consumed feedback context). Optional, used for analytics.
 */
export async function markFeedbackAppliedFor(args: {
  tenantId: string;
  agentSlug: AgentSlug;
  upToTimestamp: Timestamp;
}): Promise<void> {
  // Skipped for now — used only if we add a "feedback-applied" analytic.
  void args;
}
