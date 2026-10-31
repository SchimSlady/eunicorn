import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/LegalPage";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy · EUnicorn" };

const link = "text-primary underline";

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy">
      <Section title="In short">
        <p>
          EUnicorn has no accounts, no cookies, no tracking, no analytics and no ads. Your game progress stays on your
          device. The only personal data that reaches a server is what every website needs to be delivered: your IP
          address and a few technical details, processed by our host.
        </p>
      </Section>

      <Section title="Who is responsible">
        <p>
          {OPERATOR.names.join(" and ")}, {OPERATOR.street}, {OPERATOR.city}, {OPERATOR.country}. Email:{" "}
          <a href={`mailto:${OPERATOR.email}`} className={link}>
            {OPERATOR.email}
          </a>
          . More in the <a href="/impressum" className={link}>Impressum</a>.
        </p>
      </Section>

      <Section title="Hosting">
        <p>
          The site is hosted by Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA. When you open a page,
          Vercel&apos;s servers process your IP address, the date and time, the page requested, the referring page and
          your browser and operating system, so the page can be delivered and the service kept secure. Legal basis:
          Art. 6 (1) (f) GDPR (our legitimate interest in a working, secure website).
        </p>
        <p>
          Vercel may process this data in the USA. Vercel is certified under the EU-US Data Privacy Framework, and we
          use Vercel under its data processing agreement, which includes the EU standard contractual clauses. See{" "}
          <a href="https://vercel.com/legal/privacy-policy" className={link} rel="noopener">
            Vercel&apos;s privacy policy
          </a>
          .
        </p>
      </Section>

      <Section title="What stays on your device">
        <p>
          To remember your game for the day, your chosen difficulty, your results and your streak, EUnicorn stores them
          in your browser&apos;s local storage. This data never leaves your device and is never sent to us. It is
          strictly necessary to provide the games you ask for (§ 25 (2) no. 2 TDDDG), so no consent is required. You can
          delete it at any time by clearing your browser&apos;s site data.
        </p>
      </Section>

      <Section title="Fonts, icons and flags">
        <p>
          All fonts, icons and flags are served from our own domain. Your browser makes no requests to Google or any
          other third party when you use EUnicorn.
        </p>
      </Section>

      <Section title="Sharing your result">
        <p>
          The share button uses your device&apos;s own share menu or copies the text to your clipboard. We do not see what
          you share or where.
        </p>
      </Section>

      <Section title="Writing to us">
        <p>
          If you email us, we use your address and message only to reply (Art. 6 (1) (b) and (f) GDPR) and delete them
          once your request is settled, unless we must keep them by law.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You have the right to access, rectification, erasure and restriction of processing of your data, to data
          portability, and to object to processing based on Art. 6 (1) (f) GDPR (Art. 15–21 GDPR). Write to us at the
          address above.
        </p>
        <p>
          You can also complain to a data protection authority, for example the one responsible for us:{" "}
          <a href={OPERATOR.authority.url} className={link} rel="noopener">
            {OPERATOR.authority.name}
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
