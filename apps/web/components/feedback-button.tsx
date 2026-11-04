'use client';

// =============================================================================
// FeedbackButton — drop into any "station" with a target.
// =============================================================================
// Renders a thumbs-up / thumbs-down pair, plus an optional comment popover on
// negative feedback. Submits to /api/feedback. After submission, shows a tiny
// "thanks" pill and disables further clicks for this target.
// =============================================================================

import { useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client';

type Rating = 'positive' | 'negative';
type Category = 'accuracy' | 'tone' | 'usefulness' | 'speed' | 'completeness' | 'other';

export interface FeedbackButtonProps {
  stationId: string;
  targetType:
    | 'agent_run'
    | 'approval'
    | 'briefing'
    | 'copilot_message'
    | 'dashboard_view'
    | 'mapping_suggestion';
  targetId: string;
  agentSlug?: string | undefined;
  /** Optional compact-mode rendering (icon-only, no labels). */
  compact?: boolean | undefined;
  /** Whatever context the station wants attached to the feedback. */
  metadata?: Record<string, unknown> | undefined;
}

export function FeedbackButton(props: FeedbackButtonProps) {
  const [submitted, setSubmitted] = useState<Rating | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [category, setCategory] = useState<Category>('accuracy');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(rating: Rating, extra?: { comment?: string; category?: Category }) {
    setSubmitting(true);
    setError(null);
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) throw new Error('Not signed in');
      const idToken = await user.getIdToken();
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          stationId: props.stationId,
          targetType: props.targetType,
          targetId: props.targetId,
          agentSlug: props.agentSlug ?? null,
          rating,
          comment: extra?.comment ?? null,
          category: extra?.category ?? null,
          metadata: props.metadata ?? {},
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Feedback failed (${res.status}): ${body}`);
      }
      setSubmitted(rating);
      setShowComment(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        {submitted === 'positive' ? '👍 Thanks' : '👎 Noted'}
      </span>
    );
  }

  if (showComment) {
    return (
      <div className="inline-flex flex-col gap-2 rounded-md border bg-card p-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">What went wrong?</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="rounded border border-input bg-background px-1 text-xs"
          >
            <option value="accuracy">Accuracy</option>
            <option value="tone">Tone</option>
            <option value="usefulness">Usefulness</option>
            <option value="speed">Speed</option>
            <option value="completeness">Completeness</option>
            <option value="other">Other</option>
          </select>
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Specific feedback so we can do better next time…"
          rows={2}
          className="w-72 rounded-md border border-input bg-background px-2 py-1 text-xs"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => submit('negative', { comment, category })}
            className="inline-flex items-center rounded-md bg-destructive px-2 py-1 text-xs text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {submitting ? 'Sending…' : 'Submit'}
          </button>
          <button
            type="button"
            onClick={() => setShowComment(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
        {error && <div className="text-xs text-destructive">{error}</div>}
      </div>
    );
  }

  return (
    <span className={props.compact ? 'inline-flex gap-0.5' : 'inline-flex gap-1'}>
      <button
        type="button"
        title="Helpful"
        disabled={submitting}
        onClick={() => submit('positive')}
        className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
      >
        👍
      </button>
      <button
        type="button"
        title="Not helpful"
        disabled={submitting}
        onClick={() => setShowComment(true)}
        className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
      >
        👎
      </button>
    </span>
  );
}
