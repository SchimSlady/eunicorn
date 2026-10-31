import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LAST_UPDATED } from "@/lib/legal";

/** Shared frame for Impressum, Privacy and About: back link, title, readable column. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-primary">
        <ArrowLeft size={16} aria-hidden /> All games
      </Link>
      <h1 className="mt-4 text-[32px] font-bold leading-tight">{title}</h1>
      <div className="legal mt-8 space-y-8 leading-relaxed">{children}</div>
      <p className="mt-12 text-sm text-muted">Last updated {LAST_UPDATED}</p>
    </main>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}
