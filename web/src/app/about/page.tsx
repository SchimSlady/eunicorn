import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/legal";

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
          <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
            {CONTACT_EMAIL}
          </a>{" "}
          and we will fix it. Nothing here is investment advice.
        </p>
      </Section>

      <Section title="Names and logos">
        <p>
          Company names and logos are trademarks of their owners. We use them only to say which company a question is
          about, the way a newspaper would. EUnicorn is not affiliated with, sponsored or endorsed by any of them.
        </p>
        <p>
          We show logos unchanged and at small size, never in our own branding, advertising or share images, and we do
          not use them to suggest a partnership. If you represent a company and want its logo or name changed or
          removed, write to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
            {CONTACT_EMAIL}
          </a>{" "}
          and we will act on it promptly.
        </p>
      </Section>

      <Section title="Liability">
        <p>
          We are not responsible for the content of external sites we link to. When we linked them, we found no
          unlawful content; if we learn of any, we remove the link.
        </p>
      </Section>

      <Section title="Credits">
        <p>
          Funding data:{" "}
          <a href="https://tech.eu" className={link} rel="noopener">
            Tech.eu Funding Explorer
          </a>{" "}
          (CC BY 4.0), checked against company announcements before it appears in a game.
        </p>
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
