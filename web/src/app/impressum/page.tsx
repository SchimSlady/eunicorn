import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = { title: "Impressum · EUnicorn" };

export default function Impressum() {
  return (
    <LegalPage title="Impressum">
      <Section title="Contact">
        <p>
          EUnicorn is a non-commercial side project. Email:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">
            {CONTACT_EMAIL}
          </a>
        </p>
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

      <Section title="Names and logos">
        <p>
          Company names and logos are trademarks of their owners and appear only to identify the companies in our games.
          See <a href="/about" className="text-primary underline">About &amp; data</a> for how to ask for a change or
          removal.
        </p>
      </Section>
    </LegalPage>
  );
}
