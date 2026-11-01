import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy · EUnicorn" };

const link = "text-primary underline";

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy">
      <Section title="In short">
        <p>
          EUnicorn has no accounts, no cookies, no tracking and no ads. Your game progress stays on your device. We count
          anonymously how often each game is played and how it went, without your IP address or any ID. The only
          personal data that reaches a server is what every website needs to be delivered: your IP address and a few
          technical details, processed by our host.
        </p>
      </Section>

      <Section title="Who is responsible">
        <p>
          The operators of EUnicorn, reachable at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
            {CONTACT_EMAIL}
          </a>
          . More in <a href="/about" className={link}>About &amp; data</a>.
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
          in your browser&apos;s local storage. This data stays on your device (only the anonymous count below reaches
          us). It is strictly necessary to provide the games you ask for (§ 25 (2) no. 2 TDDDG), so no consent is required. You can
          delete it at any time by clearing your browser&apos;s site data.
        </p>
      </Section>

      <Section title="Anonymous game counter">
        <p>
          When you start or finish a game, our server records the day, the game, the difficulty and, at the end, your
          result (for example &quot;solved on guess 3&quot;, and your score as a share of the maximum). It stores no IP
          address, no device or user ID and no cookie, so the entries can&apos;t be linked to you or to each other. We use
          them to see how often the games are played and to show everyone today&apos;s results (&quot;better than 62% of
          players&quot;). The data is stored with our database provider Supabase; see{" "}
          <a href="https://supabase.com/privacy" className={link} rel="noopener">
            Supabase&apos;s privacy policy
          </a>
          .
        </p>
      </Section>

      <Section title="Game ideas">
        <p>
          If you send us a game idea, our server forwards the text to our mailbox by email, using the email service
          Resend. We don&apos;t ask for your name or email address; please don&apos;t put personal data in the text. We use
          the idea only to consider it for EUnicorn (Art. 6 (1) (f) GDPR) and delete it when we no longer need it. Resend
          processes the message in transit; see{" "}
          <a href="https://resend.com/legal/privacy-policy" className={link} rel="noopener">
            Resend&apos;s privacy policy
          </a>
          .
        </p>
      </Section>

      <Section title="Startup requests">
        <p>
          If you ask us to add a startup, our server forwards the startup&apos;s name and website, and your email
          address if you choose to give one, to our mailbox by email, using Resend (see above). We use them only to
          check the request and, if you left an email, to tell you when the startup is in (Art. 6 (1) (f) GDPR; the
          email address only on the basis of your consent, Art. 6 (1) (a)). We delete the request once we have dealt
          with it. You can ask us to delete it earlier by writing to us.
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

      <Section title="Instagram">
        <p>
          The footer links to our Instagram profile. It is a plain link, not an embed: nothing is sent to Instagram
          until you click it. After that, Instagram&apos;s (Meta Platforms Ireland Ltd.) privacy policy applies.
        </p>
      </Section>

      <Section title="Writing to us">
        <p>
          If you email us, we use your address and message only to reply (Art. 6 (1) (b) and (f) GDPR) and delete them
          once your request is settled, unless we must keep them by law. Our mailbox is hosted by Gmail (Google Ireland
          Limited, Gordon House, Barrow Street, Dublin 4, Ireland), so Google processes the emails you send us; see{" "}
          <a href="https://policies.google.com/privacy" className={link} rel="noopener">
            Google&apos;s privacy policy
          </a>
          .
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You have the right to access, rectification, erasure and restriction of processing of your data, to data
          portability, and to object to processing based on Art. 6 (1) (f) GDPR (Art. 15–21 GDPR). Write to us at the
          address above.
        </p>
        <p>
          You can also complain to a data protection authority, in particular the one in the EU country where you live
          or work (Art. 77 GDPR). A list of all authorities is kept by the{" "}
          <a href="https://www.edpb.europa.eu/about-edpb/about-edpb/members_en" className={link} rel="noopener">
            European Data Protection Board
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
