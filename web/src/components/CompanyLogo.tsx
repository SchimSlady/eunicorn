import type { Company } from "@eunicorn/schema";

/** Company logo from /logos once curated; until then an initials tile in brand colors. */
export function CompanyLogo({ company, size = 48, blurred = false }: { company: Company; size?: number; blurred?: boolean }) {
  const style = { width: size, height: size, filter: blurred ? `blur(${Math.round(size / 6)}px)` : undefined };
  if (company.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={company.logo} alt={blurred ? "" : company.name} style={style} className="rounded-lg bg-white object-contain" />;
  }
  const initials = company.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      style={{ ...style, fontSize: size * 0.4 }}
      className="inline-flex shrink-0 items-center justify-center rounded-lg bg-eu-blue font-bold text-eu-yellow"
      aria-label={blurred ? undefined : company.name}
    >
      {initials}
    </span>
  );
}
