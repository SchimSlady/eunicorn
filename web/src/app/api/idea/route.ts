import { CONTACT_EMAIL } from "@/lib/legal";

/**
 * "Got an idea?" from the home page: emails a game idea, or a request to add a startup, to the contact
 * address via Resend.
 * Needs RESEND_API_KEY (or RESEND_KEY) as a server env. Without it the route answers 503 and the form says so.
 * Spam guards: a hidden honeypot field, length limits, and a small per-IP rate limit.
 */

/** "acme.com" or "https://acme.com/en" as a clean https address, or null if it isn't a website. */
function cleanUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value || value.length > 200 || /\s/.test(value)) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) return null;
    return `${u.protocol}//${u.hostname}${u.pathname === "/" ? "" : u.pathname}`;
  } catch {
    return null;
  }
}

const MIN = 10;
const MAX = 2000;
const recent = new Map<string, number[]>(); // ip -> timestamps (per server instance; best effort)

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    kind?: unknown;
    idea?: unknown;
    startup?: unknown;
    startupUrl?: unknown;
    email?: unknown;
    website?: unknown;
  } | null;
  if (!body) return Response.json({ error: "Bad request" }, { status: 400 });
  // Bots fill every field; people never see this one. Pretend it worked.
  if (typeof body.website === "string" && body.website.trim()) return Response.json({ ok: true });

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "That email address doesn't look right." }, { status: 400 });
  }

  // What gets emailed: a game idea, or a request to add a startup.
  let subject: string;
  let text: string;
  if (body.kind === "startup") {
    const startup = typeof body.startup === "string" ? body.startup.trim().replace(/\s+/g, " ") : "";
    const url = cleanUrl(body.startupUrl);
    if (startup.length < 2 || startup.length > 80) {
      return Response.json({ error: "Please give the startup's name." }, { status: 400 });
    }
    if (!url) return Response.json({ error: "Please give the startup's website, e.g. acme.com." }, { status: 400 });
    subject = `Startup request: ${startup}`;
    text = `Startup: ${startup}\nWebsite: ${url}\n\n---\nFrom: ${email || "(no email given)"}\nSent via eunicorn.eu`;
  } else {
    const idea = typeof body.idea === "string" ? body.idea.trim() : "";
    if (idea.length < MIN || idea.length > MAX) {
      return Response.json({ error: `Please write between ${MIN} and ${MAX} characters.` }, { status: 400 });
    }
    subject = `Game idea: ${idea.slice(0, 60)}${idea.length > 60 ? "…" : ""}`;
    text = `${idea}\n\n---\nFrom: ${email || "(no email given)"}\nSent via eunicorn.eu`;
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  if (hits.length >= 5) return Response.json({ error: "Too many ideas at once. Try again later." }, { status: 429 });
  recent.set(ip, [...hits, now]);

  const key = process.env.RESEND_API_KEY ?? process.env.RESEND_KEY;
  if (!key) return Response.json({ error: "Ideas can't be sent right now." }, { status: 503 });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.IDEA_FROM ?? "EUnicorn <onboarding@resend.dev>",
      to: [CONTACT_EMAIL],
      ...(email ? { reply_to: email } : {}),
      subject,
      text,
    }),
  }).catch(() => null);

  if (!res?.ok) {
    console.error("Resend:", res?.status, await res?.text().catch(() => ""));
    return Response.json({ error: "Ideas can't be sent right now." }, { status: 502 });
  }
  return Response.json({ ok: true });
}
