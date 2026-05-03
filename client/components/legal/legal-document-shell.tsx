import Link from "next/link";
import type { ReactNode } from "react";

type LegalDocumentShellProps = {
  title: string;
  lastUpdated: { display: string; iso: string };
  children: ReactNode;
};

export function LegalDocumentShell({ title, lastUpdated, children }: LegalDocumentShellProps) {
  return (
    <div className="min-h-screen text-[var(--text-main)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="text-sm font-semibold text-[var(--accent)] transition hover:text-[var(--accent-strong)]"
          >
            Planitt CRM
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href="/privacy-policy"
              className="font-medium text-[var(--text-soft)] transition hover:text-[var(--text-main)]"
            >
              Privacy
            </Link>
            <Link
              href="/terms-of-service"
              className="font-medium text-[var(--text-soft)] transition hover:text-[var(--text-main)]"
            >
              Terms
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-sm font-medium tracking-wide text-[var(--text-soft)]">
          Last updated:{" "}
          <time dateTime={lastUpdated.iso} className="text-[var(--text-main)]">
            {lastUpdated.display}
          </time>
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-main)] sm:text-4xl">{title}</h1>
        <div className="mt-10 space-y-8 text-base leading-relaxed text-[var(--text-main)] sm:text-[1.0625rem] sm:leading-[1.75]">
          {children}
        </div>
      </main>

      <footer className="border-t border-[var(--border)] bg-[var(--surface-soft)]">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-[var(--text-soft)]">PLANITT SOLUTIONS PVT LTD</p>
          <nav className="flex flex-wrap gap-6 text-sm font-medium" aria-label="Legal">
            <Link href="/privacy-policy" className="text-[var(--accent)] hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="text-[var(--accent)] hover:underline">
              Terms of Service
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
