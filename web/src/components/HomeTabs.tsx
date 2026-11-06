import Link from "next/link";

/**
 * Daily | Local, above the games. Daily is the game everyone plays the same; Local is the extra
 * tab with games about one region's startups. Plain links, so each tab has its own URL.
 */
export function HomeTabs({ active }: { active: "daily" | "local" }) {
  const tabs = [
    { id: "daily", href: "/", label: "Daily" },
    { id: "local", href: "/local", label: "Local" },
  ] as const;
  return (
    <nav aria-label="Game sets" className="inline-flex rounded-full border border-border bg-surface p-1">
      {tabs.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          aria-current={t.id === active ? "page" : undefined}
          className={`flex min-h-10 items-center rounded-full px-5 text-sm font-semibold transition ${
            t.id === active ? "bg-primary text-on-primary" : "text-muted hover:text-foreground"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
