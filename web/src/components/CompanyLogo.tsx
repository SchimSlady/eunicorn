import type { Company } from "@eunicorn/schema";

/**
 * Logo on a white rounded-square tile with padding and a thin border (works for wordmarks,
 * which round crops would cut off). Until real logos are curated: initials in EU blue.
 */
export function CompanyLogo({ company, size = 48, blurred = false }: { company: Company; size?: number; blurred?: boolean }) {
  const tile = "inline-flex shrink-0 items-center justify-center rounded-[22%] border border-black/10 bg-white";
  const style = {
    width: size,
    height: size,
    padding: Math.round(size * 0.14),
    filter: blurred ? `blur(${Math.round(size / 6)}px)` : undefined,
  };
  if (company.logo) {
    return (
      <span className={tile} style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={company.logo} alt={blurred ? "" : company.name} className="h-full w-full object-contain" />
      </span>
    );
  }
  const initials = company.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      style={{ ...style, fontSize: size * 0.36 }}
      className={`${tile} font-display font-bold text-eu-blue`}
      aria-label={blurred ? undefined : company.name}
    >
      {initials}
    </span>
  );
}
