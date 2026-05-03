"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";

const features = [
  {
    title: "People & org",
    description: "Employees, interns, departments, and role-aware access in one place.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.438-3 3.06 3.06 0 00-1.06.06m-4.5 1.06a9.38 9.38 0 01-2.625-.372m0 0a9.337 9.337 0 01-4.121.952 4.125 4.125 0 017.438-3 3.06 3.06 0 001.06.06M9 9.75a3 3 0 116 0 3 3 0 01-6 0z"
        />
      </svg>
    ),
  },
  {
    title: "Projects & tasks",
    description: "Plan work, assign owners, track progress, and keep execution visible.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
        />
      </svg>
    ),
  },
  {
    title: "Attendance & rhythm",
    description: "Check-ins and daily workflow signals leadership can trust.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Chat & dashboards",
    description: "Project channels and leadership views so context stays connected.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v4.125c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 013 17.25v-4.125zm6.75 0c0-.621.504-1.125 1.125-1.125h9.75c.621 0 1.125.504 1.125 1.125v4.125c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125v-4.125zM3 6.75C3 6.129 3.504 5.625 4.125 5.625h9.75c.621 0 1.125.504 1.125 1.125v4.125c0 .621-.504 1.125-1.125 1.125h-9.75A1.125 1.125 0 013 11.625V6.75z"
        />
      </svg>
    ),
  },
] as const;

export function PublicLanding() {
  const heroRef = useRef<HTMLElement>(null);
  const [glow, setGlow] = useState({ x: 50, y: 40, active: false });

  const onHeroMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = heroRef.current;
    if (!el) {
      return;
    }
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setGlow({ x, y, active: true });
  }, []);

  const onHeroLeave = useCallback(() => {
    setGlow((s) => ({ ...s, active: false }));
  }, []);

  return (
    <div className="landing-page relative isolate min-h-screen w-full overflow-hidden text-[var(--text-main)]">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, color-mix(in srgb, var(--accent) 28%, transparent), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, color-mix(in srgb, var(--accent-alt) 18%, transparent), transparent), linear-gradient(180deg, var(--app-bg) 0%, var(--app-bg-accent) 100%)",
        }}
      />

      <div
        className="landing-blob pointer-events-none absolute -left-32 top-20 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl sm:top-10"
        style={{ background: "color-mix(in srgb, var(--accent) 55%, transparent)" }}
        aria-hidden
      />
      <div
        className="landing-blob-delayed pointer-events-none absolute -right-24 top-1/3 h-[380px] w-[380px] rounded-full opacity-35 blur-3xl"
        style={{ background: "color-mix(in srgb, var(--accent-alt) 50%, transparent)" }}
        aria-hidden
      />
      <div
        className="landing-blob pointer-events-none absolute bottom-0 left-1/3 h-[300px] w-[300px] rounded-full opacity-30 blur-3xl"
        style={{ background: "color-mix(in srgb, var(--accent) 40%, transparent)" }}
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] dark:opacity-[0.2]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%233268ff' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
        <header className="landing-in-up flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
          <section
            ref={heroRef}
            onMouseMove={onHeroMove}
            onMouseLeave={onHeroLeave}
            className="relative max-w-2xl overflow-hidden rounded-[28px] border p-6 shadow-[var(--shadow-soft)] sm:rounded-[32px] sm:p-8 lg:max-w-xl lg:flex-1"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in srgb, var(--surface-strong) 82%, transparent)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500"
              style={{
                opacity: glow.active ? 1 : 0,
                background: `radial-gradient(600px circle at ${glow.x}% ${glow.y}%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 55%)`,
              }}
              aria-hidden
            />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] sm:text-[11px]" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
                </span>
                Planitt CRM
              </div>

              <h1 className="mt-5 text-3xl font-bold leading-[1.12] tracking-tight sm:text-4xl lg:text-[2.65rem] lg:leading-[1.1]">
                Sales &amp; team operations{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(120deg, var(--accent-strong), var(--accent-alt), var(--accent-strong))",
                    backgroundSize: "200% auto",
                  }}
                >
                  workspace
                </span>
              </h1>

              <p className="mt-4 text-base leading-relaxed text-[var(--text-soft)] sm:text-lg">
                Planitt CRM is a web application operated by PLANITT SOLUTIONS PVT LTD. It helps organizations run internal
                customer relationship management: employee and intern management, departments, projects, tasks, attendance,
                chat, and leadership dashboards. Access to the product requires an account issued by your organization&apos;s
                administrator.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/login"
                  className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-2xl px-7 text-sm font-semibold text-white shadow-lg transition duration-300 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] sm:px-8"
                  style={{
                    background: "linear-gradient(135deg, var(--accent-strong), var(--accent-alt))",
                    boxShadow: "0 14px 32px color-mix(in srgb, var(--accent) 35%, transparent)",
                  }}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Sign in
                    <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                </Link>
                <Link
                  href="/privacy-policy"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 text-sm font-semibold text-[var(--text-main)] transition duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[var(--shadow-card)] active:translate-y-0"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms-of-service"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 text-sm font-semibold text-[var(--text-main)] transition duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[var(--shadow-card)] active:translate-y-0"
                >
                  Terms of Service
                </Link>
              </div>

              <p className="mt-8 border-t pt-6 text-sm leading-relaxed text-[var(--text-faint)]" style={{ borderColor: "var(--border)" }}>
                Signed-in users are redirected to the dashboard after authentication. This page is public so visitors can
                understand what the application is before signing in.
              </p>
            </div>
          </section>

          <aside className="landing-in-up relative w-full max-w-md shrink-0 lg:mt-4 lg:max-w-sm" style={{ animationDelay: "90ms" }}>
            <div
              className="relative overflow-hidden rounded-[28px] border p-1 shadow-[var(--shadow-card)] sm:rounded-[32px]"
              style={{
                borderColor: "var(--border)",
                background: "linear-gradient(145deg, color-mix(in srgb, var(--surface-strong) 90%, transparent), var(--surface-soft))",
              }}
            >
              <div className="landing-shimmer-border absolute inset-0 rounded-[inherit] opacity-50" aria-hidden />
              <div
                className="relative z-10 rounded-[24px] p-6 sm:rounded-[28px] sm:p-7"
                style={{
                  background: "linear-gradient(165deg, #0f172a 0%, #020617 100%)",
                  color: "#e2e8f0",
                }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Why teams use it</p>
                <p className="mt-3 text-lg font-semibold leading-snug text-white">One workspace for execution and oversight</p>
                <ul className="mt-5 space-y-3 text-sm text-slate-300">
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                    Role-based access keeps data scoped to the right people.
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-alt)]" />
                    Tasks and projects stay tied to real ownership and deadlines.
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    Leadership views surface progress without extra spreadsheets.
                  </li>
                </ul>
              </div>
            </div>
          </aside>
        </header>

        <section className="mt-16 sm:mt-20" aria-labelledby="landing-features-heading">
          <div className="landing-in-up flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between" style={{ animationDelay: "140ms" }}>
            <div>
              <h2 id="landing-features-heading" className="text-xl font-bold tracking-tight sm:text-2xl">
                Built for operational clarity
              </h2>
              <p className="mt-1 max-w-xl text-sm text-[var(--text-soft)] sm:text-base">
                Hover a card to preview focus — each area maps to a core part of the CRM experience.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((item, index) => (
              <article
                key={item.title}
                className="landing-in-up group relative overflow-hidden rounded-2xl border p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface-strong)",
                  animationDelay: `${180 + index * 70}ms`,
                  boxShadow: "var(--shadow-card)",
                }}
                onMouseMove={(e) => {
                  const t = e.currentTarget;
                  const r = t.getBoundingClientRect();
                  t.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
                  t.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background:
                      "radial-gradient(400px circle at var(--mx,50%) var(--my,50%), color-mix(in srgb, var(--accent) 12%, transparent), transparent 65%)",
                  }}
                />
                <div className="relative flex flex-col gap-3">
                  <div
                    className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-[var(--accent)] transition duration-300 group-hover:scale-110 group-hover:text-[var(--accent-strong)]"
                    style={{
                      background: "color-mix(in srgb, var(--accent) 12%, var(--surface-soft))",
                    }}
                  >
                    {item.icon}
                  </div>
                  <h3 className="text-base font-semibold text-[var(--text-main)]">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-[var(--text-soft)]">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
