import type { Company } from "@eunicorn/schema";
import { CompanyLogo } from "./CompanyLogo";
import { Flag } from "./Flag";

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
      {company.funFact && <p className="mt-3 text-sm">{company.funFact}</p>}
    </div>
  );
}
