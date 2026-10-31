import { CONTACT_EMAIL } from "@/lib/legal";

/**
 * "Submit your idea" from the home page: emails the idea to the contact address via Resend.
 * Needs RESEND_API_KEY (or RESEND_KEY) as a server env. Without it the route answers 503 and the form says so.
 * Spam guards: a hidden honeypot field, length limits, and a small per-IP rate limit.
 */

const MIN = 10;
const MAX = 2000;
const recent = new Map<string, number[]>(); // ip -> timestamps (per server instance; best effort)

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { idea?: unknown; email?: unknown; website?: unknown } | null;
  if (!body) return Response.json({ error: "Bad request" }, { status: 400 });
  // Bots fill every field; people never see this one. Pretend it worked.
  if (typeof body.website === "string" && body.website.trim()) return Response.json({ ok: true });

  const idea = typeof body.idea === "string" ? body.idea.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (idea.length < MIN || idea.length > MAX) {
    return Response.json({ error: `Please write between ${MIN} and ${MAX} characters.` }, { status: 400 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "That email address doesn't look right." }, { status: 400 });
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
      subject: `Game idea: ${idea.slice(0, 60)}${idea.length > 60 ? "…" : ""}`,
      text: `${idea}\n\n---\nFrom: ${email || "(no email given)"}\nSent via eunicorn.eu`,
    }),
  }).catch(() => null);

  if (!res?.ok) {
    console.error("Resend:", res?.status, await res?.text().catch(() => ""));
    return Response.json({ error: "Ideas can't be sent right now." }, { status: 502 });
  }
  return Response.json({ ok: true });
}
