import type { Company } from "@eunicorn/schema";
import { CompanyLogo } from "./CompanyLogo";
import { Flag } from "./Flag";

/**
 * "Went through Y Combinator (W21) and EWOR", "Founded by CDTM alumni": the company's programs
 * (accelerators and fellowships the company went through, university programs its founders came from).
 */
function programLine(company: Company): string | null {
  const ps = company.programs ?? [];
  const went = ps.filter((p) => p.kind !== "university").map((p) => (p.batch ? `${p.name} (${p.batch})` : p.name));
  const alumni = ps.filter((p) => p.kind === "university").map((p) => p.name);
  const parts = [
    went.length ? `Went through ${list(went)}` : "",
    alumni.length ? `${went.length ? "founded" : "Founded"} by ${list(alumni)} alumni` : "",
  ].filter(Boolean);
  return parts.length ? `${parts.join("; ")}.` : null;
}

const list = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

/**
 * End-of-game card about a company from the player's own game
 * (the answer, the one that got them, their rarest pick). reason says why it's this one.
 */
export function BuiltInEuropeCard({ company, founders, reason }: { company: Company; founders: string[]; reason?: string }) {
  return (
    <div className="animate-flip-in rounded-2xl bg-eu-blue p-5 text-white">
      <p className="text-sm font-semibold text-eu-yellow">
        Built in Europe{reason && <span className="font-normal text-white/70"> · {reason}</span>}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <CompanyLogo company={company} size={48} />
        <div>
          <p className="font-display text-xl font-bold">{company.name}</p>
          <p className="flex items-center gap-1.5 text-sm text-white/80">
            <Flag country={company.country} size={14} /> {company.city} · founded {company.founded}
          </p>
        </div>
      </div>
      {founders.length > 0 && <p className="mt-3 text-sm text-white/80">Founded by {founders.join(", ")}</p>}
      {programLine(company) && <p className="mt-3 text-sm text-white/80">{programLine(company)}</p>}
      {company.funFact && <p className="mt-3 text-sm">{company.funFact}</p>}
    </div>
  );
}
