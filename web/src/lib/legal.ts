/**
 * Operator details for the Impressum (§ 5 DDG) and the privacy policy (Art. 13 GDPR).
 * One place, so both pages always agree. Every field marked TODO must be real before
 * this goes live: a legal notice with placeholders is worse than none.
 */
export const OPERATOR = {
  /** Who runs the site: the two founders as private persons, or a GbR / UG with its legal form. */
  names: ["TODO Name 1", "TODO Name 2"],
  /** A postal address where legal mail can be served. No P.O. box. */
  street: "TODO Street and number",
  city: "TODO Postcode and city",
  country: "Germany",
  email: "TODO hello@eunicorn.eu",
  /** A second fast way to reach you: a phone number (or a contact form). */
  phone: "TODO +49 …",
  /** Responsible for content under § 18 (2) MStV: one natural person with address. */
  responsible: "TODO Name, address as above",
  /** Data protection authority of the federal state you live in. */
  authority: {
    name: "TODO e.g. Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)",
    url: "TODO https://www.lda.bayern.de",
  },
};

export const LAST_UPDATED = "31.10.2026";
