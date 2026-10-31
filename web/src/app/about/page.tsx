import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/LegalPage";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = { title: "About & data · EUnicorn" };

const link = "text-primary underline";

export default function About() {
  return (
    <LegalPage title="About & data">
      <Section title="What EUnicorn is">
        <p>
          Daily games about the European and UK startup ecosystem: who raised what, who is worth more, who belongs. A
          small side project by two people who think Europe builds great companies. Go build in Europe.
        </p>
      </Section>

      <Section title="Where the facts come from">
        <p>
          We collect facts such as founding years, cities, funding rounds and valuations from public sources: company
          announcements, press coverage, public company registers (for example the UK&apos;s Companies House) and
          Wikidata. We store the facts with their sources, never the articles themselves.
        </p>
        <p>
          Valuations and rounds are often reported in US dollars; we show them in euros at an approximate rate, so
          amounts are rounded. Facts change and sources sometimes disagree. If something is wrong, tell us at{" "}
          <a href={`mailto:${OPERATOR.email}`} className={link}>
            {OPERATOR.email}
          </a>{" "}
          and we will fix it. Nothing here is investment advice.
        </p>
      </Section>

      <Section title="Names and logos">
        <p>
          Company names and logos are trademarks of their owners. We show them only to identify the companies in our
          games. EUnicorn is not affiliated with, sponsored or endorsed by any of them. If you represent a company and
          want something changed or removed, write to us.
        </p>
      </Section>

      <Section title="Credits">
        <p>
          Fonts:{" "}
          <a href="https://rsms.me/inter/" className={link} rel="noopener">
            Inter
          </a>{" "}
          by Rasmus Andersson and{" "}
          <a href="https://github.com/floriankarsten/space-grotesk" className={link} rel="noopener">
            Space Grotesk
          </a>{" "}
          by Florian Karsten (SIL Open Font License). Icons:{" "}
          <a href="https://lucide.dev" className={link} rel="noopener">
            Lucide
          </a>{" "}
          (ISC License). Flags:{" "}
          <a href="https://github.com/HatScripts/circle-flags" className={link} rel="noopener">
            circle-flags
          </a>{" "}
          by HatScripts (MIT License).
        </p>
      </Section>
    </LegalPage>
  );
}
