export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container flex min-h-screen items-center justify-center py-12">
        {children}
      </div>
    </div>
  );
}
