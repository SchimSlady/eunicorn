import Link from "next/link";
import { Mail } from "lucide-react";
import { CONTACT_EMAIL, INSTAGRAM } from "@/lib/legal";
import { MODES } from "@/lib/modes";

const PAGES = [
  { href: "/about", label: "About & data" },
  { href: "/impressum", label: "Impressum" },
  { href: "/privacy", label: "Privacy policy" },
];

const linkStyle = "text-foreground transition hover:text-primary";

/** Instagram glyph in the Lucide outline style (Lucide no longer ships brand icons). */
function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

/** Full-width band at the very bottom: who we are, where to go, how to reach us. */
export function SiteFooter() {
  return (
    <footer className="mt-20 border-t-2 border-primary bg-surface">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <p className="font-display text-2xl font-bold leading-none">
            <span className="text-primary">EU</span>nicorn
          </p>
          <p className="text-sm">Daily games about the European startup ecosystem. Go build in Europe.</p>
          <p className="text-sm text-muted">
            EUnicorn shows company names and logos only to identify the companies in its games. They belong to their
            owners, who are not affiliated with us. Nothing here is investment advice.
          </p>
        </div>

        <nav aria-label="Quick links">
          <h2 className="text-sm font-semibold text-primary">Quick links</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {MODES.map((m) => (
              <li key={m.mode}>
                <Link href={`/play/${m.mode}`} className={linkStyle}>
                  {m.title}
                </Link>
              </li>
            ))}
            {PAGES.map((p) => (
              <li key={p.href}>
                <Link href={p.href} className={linkStyle}>
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold text-primary">Follow &amp; contact</h2>
          <p className="mt-3 text-sm">Spotted a wrong fact, or want your logo changed? Write to us.</p>
          <ul className="mt-3 space-y-2 text-sm font-semibold">
            <li>
              <a href={INSTAGRAM.url} rel="noopener" className={`inline-flex items-center gap-2 ${linkStyle}`}>
                <InstagramIcon size={16} /> @{INSTAGRAM.handle}
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTACT_EMAIL}`} className={`inline-flex items-center gap-2 ${linkStyle}`}>
                <Mail size={16} aria-hidden /> {CONTACT_EMAIL}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
