export default function ProjectsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Project list driven by Procore sync. Implementation: connect Procore from /dashboard/integrations,
        wait for initial sync, then this list will populate.
      </p>
    </div>
  );
}
