export default function ChatPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Owner&apos;s Copilot</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ask anything about your jobs, your books, or your AR. Powered by Claude with read-only access
        to your Procore + QBO data.
      </p>
      <div className="mt-6 rounded-lg border bg-card p-6">
        <div className="text-sm text-muted-foreground">
          Chat UI lands in Sprint 7. SSE endpoint is at <code>/api/chat/stream</code>.
        </div>
      </div>
    </div>
  );
}
