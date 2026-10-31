import type { Company } from "@eunicorn/schema";
import { CompanyLogo } from "./CompanyLogo";

/** End-of-game card: the "Go build in Europe" moment. */
export function BuiltInEuropeCard({ company, founders }: { company: Company; founders: string[] }) {
  return (
    <div className="rounded-2xl bg-eu-blue p-5 text-white">
      <p className="text-xs font-semibold uppercase tracking-widest text-eu-yellow">Built in Europe</p>
      <div className="mt-3 flex items-center gap-3">
        <CompanyLogo company={company} size={48} />
        <div>
          <p className="text-xl font-bold">{company.name}</p>
          <p className="text-sm text-white/80">
            {company.city} · founded {company.founded}
          </p>
        </div>
      </div>
      {founders.length > 0 && <p className="mt-3 text-sm text-white/80">Founded by {founders.join(", ")}</p>}
      {company.funFact && <p className="mt-3 text-sm">{company.funFact}</p>}
      <p className="mt-4 font-semibold text-eu-yellow">Go build in Europe.</p>
    </div>
  );
}
