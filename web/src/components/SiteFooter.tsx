import Link from "next/link";

const LINKS = [
  { href: "/about", label: "About & data" },
  { href: "/impressum", label: "Impressum" },
  { href: "/privacy", label: "Privacy" },
];

/** The close of every page: the name returns, the line, and the legal links. */
export function SiteFooter() {
  return (
    <footer className="mx-auto mt-16 max-w-5xl px-4 pb-10 sm:px-6">
      <div className="flex flex-col gap-6 rounded-2xl bg-surface p-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-2xl font-bold leading-none">
            <span className="text-primary">EU</span>nicorn
          </p>
          <p className="mt-2 text-sm text-muted">Daily games about the European startup ecosystem.</p>
          <p className="mt-1 text-sm font-semibold text-primary">Go build in Europe.</p>
        </div>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="font-medium text-foreground hover:text-primary">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="mt-4 text-xs text-muted">
        Company names and logos belong to their owners and are shown for identification only. EUnicorn is not affiliated
        with them. Not investment advice.
      </p>
    </footer>
  );
}
