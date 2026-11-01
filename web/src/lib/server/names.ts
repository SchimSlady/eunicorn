/**
 * A leaderboard name that is fine to show everyone, cleaned up, or null. This is not a moderation
 * system: it stops the obvious (rude words, web addresses, the site's own name), nothing more.
 * Names that slip through are removed by hand (contact on the privacy page).
 */
const BLOCKED = ["nazi", "hitler", "fuck", "shit", "cunt", "nigg", "fagg", "wichser", "hurensohn", "fotze", "scheiss", "scheisse"];
const RESERVED = ["eunicorn", "admin", "administrator", "moderator", "support"];

export function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 16) return null;
  if (!/^[\p{L}\p{N} ._-]+$/u.test(name)) return null;
  if (/\.\p{L}{2,}/u.test(name)) return null; // looks like a web address

  // Compare without case, spaces and digit-for-letter swaps ("n4zi"); ß as ss.
  const flat = name
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[0134578]/g, (d) => ({ "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b" })[d] ?? d)
    .replace(/[^\p{L}]/gu, "");
  if (BLOCKED.some((w) => flat.includes(w)) || RESERVED.includes(flat)) return null;
  return name;
}
