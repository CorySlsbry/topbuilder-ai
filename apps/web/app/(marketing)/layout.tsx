import Link from 'next/link';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Top Builder AI
          </Link>
          <nav className="hidden gap-6 text-sm md:flex">
            <Link href="/security" className="hover:text-foreground/80">Security</Link>
            <Link href="/privacy" className="hover:text-foreground/80">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground/80">Terms</Link>
            <Link href="/support" className="hover:text-foreground/80">Support</Link>
            <Link href="/login" className="hover:text-foreground/80">Sign in</Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-16 border-t">
        <div className="container mx-auto flex flex-col gap-4 py-8 text-sm text-muted-foreground md:flex-row md:justify-between">
          <div>© 2026 Salisbury Bookkeeping LLC. All rights reserved.</div>
          <nav className="flex gap-6">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/security">Security</Link>
            <Link href="/support">Support</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
