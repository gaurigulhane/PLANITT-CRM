import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planitt CRM",
  description: "Internal CRM for sales, follow-ups, and team workflows.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen text-[var(--text-main)]">
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-16 sm:px-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Planitt CRM</h1>
          <p className="mt-3 text-base leading-relaxed text-[var(--text-soft)] sm:text-lg">
            Internal CRM for sales, follow-ups, and team workflows.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/privacy-policy"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 text-sm font-semibold text-[var(--text-main)] shadow-sm transition hover:bg-[var(--surface-soft)]"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms-of-service"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 text-sm font-semibold text-[var(--text-main)] shadow-sm transition hover:bg-[var(--surface-soft)]"
          >
            Terms of Service
          </Link>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--accent)] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-strong)]"
          >
            Continue to dashboard
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-[var(--border)] px-6 text-sm font-semibold text-[var(--text-soft)] transition hover:border-[var(--accent)] hover:text-[var(--text-main)]"
          >
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
