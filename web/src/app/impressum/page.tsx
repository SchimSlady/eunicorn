import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/LegalPage";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = { title: "Impressum · EUnicorn" };

export default function Impressum() {
  return (
    <LegalPage title="Impressum">
      <Section title="Information under § 5 DDG">
        <p>
          {OPERATOR.names.join(" and ")}
          <br />
          {OPERATOR.street}
          <br />
          {OPERATOR.city}
          <br />
          {OPERATOR.country}
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Email: <a href={`mailto:${OPERATOR.email}`} className="text-primary underline">{OPERATOR.email}</a>
          <br />
          Phone: {OPERATOR.phone}
        </p>
      </Section>

      <Section title="Responsible for content under § 18 (2) MStV">
        <p>{OPERATOR.responsible}</p>
      </Section>

      <Section title="Liability for content and links">
        <p>
          We compile the facts in our games from public sources with care, but cannot guarantee that they are complete,
          correct or current. Nothing on this site is investment advice. If you spot an error, please write to us and we
          will correct it.
        </p>
        <p>
          We are not responsible for the content of external sites we link to. When we linked them, we found no
          unlawful content; if we learn of any, we remove the link.
        </p>
      </Section>
    </LegalPage>
  );
}
